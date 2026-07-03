-- =====================================================================
-- RANCHI CONNECT - Supabase Schema
-- Run this ENTIRE file in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================================

-- 1. PROFILES -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  role text default 'user' check (role in ('user','moderator','admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles viewable by all" on public.profiles;
create policy "Profiles viewable by all" on public.profiles for select using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(replace(new.id::text,'-',''),1,4)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. POSTS --------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  category text default 'general' check (category in ('news','events','questions','buysell','jobs','recommendations','general')),
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists posts_category_idx on public.posts(category);
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id);

alter table public.posts enable row level security;

drop policy if exists "Posts viewable by all" on public.posts;
create policy "Posts viewable by all" on public.posts for select using (true);

drop policy if exists "Auth users can create posts" on public.posts;
create policy "Auth users can create posts" on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "Owners update own posts" on public.posts;
create policy "Owners update own posts" on public.posts for update using (auth.uid() = user_id);

drop policy if exists "Owners delete own posts" on public.posts;
create policy "Owners delete own posts" on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "Admins delete any post" on public.posts;
create policy "Admins delete any post" on public.posts for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator'))
);

-- 3. COMMENTS -----------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists comments_post_id_idx on public.comments(post_id);

alter table public.comments enable row level security;

drop policy if exists "Comments viewable by all" on public.comments;
create policy "Comments viewable by all" on public.comments for select using (true);

drop policy if exists "Auth users create comments" on public.comments;
create policy "Auth users create comments" on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete own comments" on public.comments;
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = user_id);

drop policy if exists "Admins delete any comment" on public.comments;
create policy "Admins delete any comment" on public.comments for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator'))
);

-- 4. LIKES --------------------------------------------------------------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create index if not exists likes_post_id_idx on public.likes(post_id);

alter table public.likes enable row level security;

drop policy if exists "Likes viewable by all" on public.likes;
create policy "Likes viewable by all" on public.likes for select using (true);

drop policy if exists "Auth users can like" on public.likes;
create policy "Auth users can like" on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users unlike own" on public.likes;
create policy "Users unlike own" on public.likes for delete using (auth.uid() = user_id);

-- 5. REPORTS ------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  status text default 'pending' check (status in ('pending','reviewed','resolved')),
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

drop policy if exists "Auth users create reports" on public.reports;
create policy "Auth users create reports" on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Admins view reports" on public.reports;
create policy "Admins view reports" on public.reports for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator'))
);

drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports" on public.reports for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','moderator'))
);

-- 6. STORAGE BUCKET FOR IMAGES ------------------------------------------
insert into storage.buckets (id, name, public) values ('post-images','post-images', true)
  on conflict (id) do nothing;

drop policy if exists "Anyone can view post images" on storage.objects;
create policy "Anyone can view post images" on storage.objects for select using (bucket_id = 'post-images');

drop policy if exists "Auth users upload post images" on storage.objects;
create policy "Auth users upload post images" on storage.objects for insert to authenticated with check (bucket_id = 'post-images');

drop policy if exists "Users delete own images" on storage.objects;
create policy "Users delete own images" on storage.objects for delete to authenticated using (bucket_id = 'post-images' and owner = auth.uid());

-- =====================================================================
-- TO MAKE YOURSELF ADMIN (run after signing up):
-- update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';
-- =====================================================================
