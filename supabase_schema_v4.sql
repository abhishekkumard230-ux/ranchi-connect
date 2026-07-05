-- =====================================================================
-- RANCHI CONNECT - v4 schema patch
-- Fixes RLS issue when creating a direct conversation.
--
-- Problem: Frontend did:
--   INSERT INTO conversations ... RETURNING *
-- The RETURNING requires SELECT permission on the new row.
-- The SELECT policy requires being a participant, but the participant
-- row hasn't been inserted yet -> RLS violation.
--
-- Fix: Add a SECURITY DEFINER RPC that atomically creates the
-- conversation and both participant rows. Frontend calls the RPC only.
--
-- Also tightens the raw policies so behaviour is clean:
--   - Users can only view / send messages in conversations they belong to
--   - Users can create/read participants only for their own conversations
--   - Direct table INSERTs on conversations are still allowed for
--     authenticated users (RPC uses this internally as SECURITY DEFINER
--     but callers should prefer the RPC)
-- =====================================================================

-- Ensure the helper exists (idempotent re-declaration is fine)
create or replace function public.is_conversation_participant(conv uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- ============ conversations ============
alter table public.conversations enable row level security;

drop policy if exists "Participants view conversation" on public.conversations;
create policy "Participants view conversation" on public.conversations
  for select using (public.is_conversation_participant(id));

drop policy if exists "Auth users create conversation" on public.conversations;
create policy "Auth users create conversation" on public.conversations
  for insert to authenticated with check (true);

drop policy if exists "Participants update conversation" on public.conversations;
create policy "Participants update conversation" on public.conversations
  for update using (public.is_conversation_participant(id));

-- ============ conversation_participants ============
alter table public.conversation_participants enable row level security;

drop policy if exists "See conversation participants" on public.conversation_participants;
create policy "See conversation participants" on public.conversation_participants
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists "Users insert self as participant" on public.conversation_participants;
drop policy if exists "Insert participants" on public.conversation_participants;
create policy "Insert participants" on public.conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Users update own participant row" on public.conversation_participants;
create policy "Update own participant row" on public.conversation_participants
  for update using (user_id = auth.uid());

drop policy if exists "Users delete own participant row" on public.conversation_participants;
create policy "Delete own participant row" on public.conversation_participants
  for delete using (user_id = auth.uid());

-- ============ messages ============
alter table public.messages enable row level security;

drop policy if exists "Participants view messages" on public.messages;
create policy "Participants view messages" on public.messages
  for select using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Users delete own messages" on public.messages;
create policy "Users delete own messages" on public.messages
  for delete using (sender_id = auth.uid());

-- ============ RPC: create_direct_conversation ============
-- Atomically finds or creates a 1:1 conversation between the current
-- authenticated user and `other_user_id`, adding both as participants.
-- Runs as SECURITY DEFINER so it bypasses the chicken-and-egg RLS
-- issue on the returning SELECT.
create or replace function public.create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conv_id uuid;
  existing_id uuid;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if other_user_id = me then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  -- Look up existing 1:1 conversation between the two users
  select cp1.conversation_id into existing_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = me
    and cp2.user_id = other_user_id
    and (
      select count(*) from public.conversation_participants
      where conversation_id = cp1.conversation_id
    ) = 2
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations default values returning id into new_conv_id;
  insert into public.conversation_participants (conversation_id, user_id)
    values (new_conv_id, me), (new_conv_id, other_user_id);

  return new_conv_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;
