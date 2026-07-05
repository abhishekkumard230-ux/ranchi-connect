-- =====================================================================
-- RANCHI CONNECT - v3 schema patch
-- Adds: DM system + comment likes trigger fix + 'message' notification type
-- Run this ENTIRE file in Supabase SQL Editor.
-- =====================================================================

-- 1. Extend notification types to include 'message' ---------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like','comment','reply','follow','mention','admin_action','message'));

-- Extend notification_settings to include messages
alter table public.notification_settings add column if not exists messages boolean default true;

-- 2. Update notify_on_like to handle comment likes ---------------------
create or replace function public.notify_on_like()
returns trigger as $$
declare
  target_user uuid;
  s boolean;
  target_post uuid;
  target_comment uuid;
begin
  if new.post_id is not null then
    select user_id into target_user from public.posts where id = new.post_id;
    target_post := new.post_id;
    target_comment := null;
  elsif new.comment_id is not null then
    select user_id, post_id into target_user, target_post from public.comments where id = new.comment_id;
    target_comment := new.comment_id;
  end if;
  if target_user is null or target_user = new.user_id then return new; end if;
  select coalesce(likes, true) into s from public.notification_settings where user_id = target_user;
  if s is null or s = true then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
    values (target_user, new.user_id, 'like', target_post, target_comment);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Helper: last_seen for online/offline status -----------------------
alter table public.profiles add column if not exists last_seen_at timestamptz default now();

-- 4. DIRECT MESSAGES ---------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (conversation_id, user_id)
);
create index if not exists cp_user_idx on public.conversation_participants(user_id);
create index if not exists cp_conv_idx on public.conversation_participants(conversation_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  created_at timestamptz default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at desc);

-- Helper function to avoid RLS recursion on participants
create or replace function public.is_conversation_participant(conv uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Conversations policies
drop policy if exists "Participants view conversation" on public.conversations;
create policy "Participants view conversation" on public.conversations for select
  using (public.is_conversation_participant(id));

drop policy if exists "Auth users create conversation" on public.conversations;
create policy "Auth users create conversation" on public.conversations for insert
  to authenticated with check (true);

drop policy if exists "Participants update conversation" on public.conversations;
create policy "Participants update conversation" on public.conversations for update
  using (public.is_conversation_participant(id));

-- Participants policies
drop policy if exists "See conversation participants" on public.conversation_participants;
create policy "See conversation participants" on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Users insert self as participant" on public.conversation_participants;
create policy "Users insert self as participant" on public.conversation_participants for insert
  to authenticated with check (user_id = auth.uid() or public.is_conversation_participant(conversation_id));

drop policy if exists "Users update own participant row" on public.conversation_participants;
create policy "Users update own participant row" on public.conversation_participants for update
  using (user_id = auth.uid());

-- Messages policies
drop policy if exists "Participants view messages" on public.messages;
create policy "Participants view messages" on public.messages for select
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages" on public.messages for insert
  to authenticated with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

drop policy if exists "Users delete own messages" on public.messages;
create policy "Users delete own messages" on public.messages for delete
  using (sender_id = auth.uid());

-- Trigger: update conversation.last_message_at + notify recipients ----
create or replace function public.on_new_message()
returns trigger as $$
declare
  recipient uuid;
  s boolean;
  preview text;
begin
  -- bump conversation timestamp
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;

  preview := coalesce(substring(new.content from 1 for 80), '[image]');

  for recipient in
    select user_id from public.conversation_participants
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    select coalesce(messages, true) into s from public.notification_settings where user_id = recipient;
    if s is null or s = true then
      insert into public.notifications (user_id, actor_id, type, message)
      values (recipient, new.sender_id, 'message', preview);
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted after insert on public.messages
  for each row execute function public.on_new_message();

-- Enable realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;

-- 5. Storage bucket for message images ---------------------------------
insert into storage.buckets (id, name, public) values ('dm-images','dm-images', true)
  on conflict (id) do nothing;

drop policy if exists "Anyone can view dm images" on storage.objects;
create policy "Anyone can view dm images" on storage.objects for select using (bucket_id = 'dm-images');

drop policy if exists "Auth upload dm images" on storage.objects;
create policy "Auth upload dm images" on storage.objects for insert to authenticated
  with check (bucket_id = 'dm-images');

drop policy if exists "Users delete own dm images" on storage.objects;
create policy "Users delete own dm images" on storage.objects for delete to authenticated
  using (bucket_id = 'dm-images' and owner = auth.uid());

-- =====================================================================
-- DONE.
-- =====================================================================
