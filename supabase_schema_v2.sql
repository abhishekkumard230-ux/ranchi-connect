-- =====================================================================
-- RANCHI CONNECT - v2 schema patch
-- Adds: follows, comment replies, notifications, notification_settings
-- Run this ENTIRE file in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

-- 1. FOLLOWS ------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

alter table public.follows enable row level security;

drop policy if exists "Follows viewable by all" on public.follows;
create policy "Follows viewable by all" on public.follows for select using (true);

drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- 2. COMMENT REPLIES ---------------------------------------------------
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_id_idx on public.comments(parent_id);

-- 3. NOTIFICATIONS -----------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,      -- recipient
  actor_id uuid references auth.users(id) on delete cascade,               -- who triggered
  type text not null check (type in ('like','comment','reply','follow','mention','admin_action')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications for delete using (auth.uid() = user_id);

-- Insert policy: triggers run as SECURITY DEFINER so bypass RLS anyway,
-- but we still allow authenticated inserts (for admin action notifications from app).
drop policy if exists "Auth users can insert notifications" on public.notifications;
create policy "Auth users can insert notifications" on public.notifications for insert to authenticated with check (true);

-- Enable Realtime for notifications table
alter publication supabase_realtime add table public.notifications;

-- 4. NOTIFICATION SETTINGS ---------------------------------------------
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  likes boolean default true,
  comments boolean default true,
  replies boolean default true,
  follows boolean default true,
  mentions boolean default true,
  admin_actions boolean default true,
  updated_at timestamptz default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists "Users view own settings" on public.notification_settings;
create policy "Users view own settings" on public.notification_settings for select using (auth.uid() = user_id);

drop policy if exists "Users update own settings" on public.notification_settings;
create policy "Users update own settings" on public.notification_settings for update using (auth.uid() = user_id);

drop policy if exists "Users insert own settings" on public.notification_settings;
create policy "Users insert own settings" on public.notification_settings for insert with check (auth.uid() = user_id);

-- =====================================================================
-- TRIGGERS to auto-create notifications
-- =====================================================================

-- ON LIKE -------------------------------------------------------------
create or replace function public.notify_on_like()
returns trigger as $$
declare
  post_owner uuid;
  s boolean;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is null or post_owner = new.user_id then return new; end if;
  select coalesce(likes, true) into s from public.notification_settings where user_id = post_owner;
  if s is null or s = true then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created after insert on public.likes
  for each row execute function public.notify_on_like();

-- ON COMMENT / REPLY --------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger as $$
declare
  post_owner uuid;
  parent_owner uuid;
  s boolean;
begin
  select user_id into post_owner from public.posts where id = new.post_id;

  if new.parent_id is not null then
    select user_id into parent_owner from public.comments where id = new.parent_id;
    if parent_owner is not null and parent_owner <> new.user_id then
      select coalesce(replies, true) into s from public.notification_settings where user_id = parent_owner;
      if s is null or s = true then
        insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
        values (parent_owner, new.user_id, 'reply', new.post_id, new.id);
      end if;
    end if;
  end if;

  if post_owner is not null and post_owner <> new.user_id
     and (parent_owner is null or parent_owner <> post_owner) then
    select coalesce(comments, true) into s from public.notification_settings where user_id = post_owner;
    if s is null or s = true then
      insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
      values (post_owner, new.user_id, 'comment', new.post_id, new.id);
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ON FOLLOW -----------------------------------------------------------
create or replace function public.notify_on_follow()
returns trigger as $$
declare
  s boolean;
begin
  select coalesce(follows, true) into s from public.notification_settings where user_id = new.following_id;
  if s is null or s = true then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created after insert on public.follows
  for each row execute function public.notify_on_follow();

-- ON MENTION (from posts) ---------------------------------------------
create or replace function public.notify_mentions_from_post()
returns trigger as $$
declare
  target_user uuid;
  uname text;
  s boolean;
begin
  for uname in
    select distinct lower(m[1]) from regexp_matches(coalesce(new.content,'') || ' ' || coalesce(new.title,''), '@([a-zA-Z0-9_]+)', 'g') as m
  loop
    select id into target_user from public.profiles where lower(username) = uname;
    if target_user is not null and target_user <> new.user_id then
      select coalesce(mentions, true) into s from public.notification_settings where user_id = target_user;
      if s is null or s = true then
        insert into public.notifications (user_id, actor_id, type, post_id)
        values (target_user, new.user_id, 'mention', new.id);
      end if;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_post_mentions on public.posts;
create trigger on_post_mentions after insert on public.posts
  for each row execute function public.notify_mentions_from_post();

-- ON MENTION (from comments) ------------------------------------------
create or replace function public.notify_mentions_from_comment()
returns trigger as $$
declare
  target_user uuid;
  uname text;
  s boolean;
begin
  for uname in
    select distinct lower(m[1]) from regexp_matches(new.content, '@([a-zA-Z0-9_]+)', 'g') as m
  loop
    select id into target_user from public.profiles where lower(username) = uname;
    if target_user is not null and target_user <> new.user_id then
      select coalesce(mentions, true) into s from public.notification_settings where user_id = target_user;
      if s is null or s = true then
        insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
        values (target_user, new.user_id, 'mention', new.post_id, new.id);
      end if;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_mentions on public.comments;
create trigger on_comment_mentions after insert on public.comments
  for each row execute function public.notify_mentions_from_comment();

-- =====================================================================
-- DONE. Test by liking/commenting/following someone.
-- =====================================================================
