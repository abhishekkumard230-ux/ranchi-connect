-- =====================================================================
-- RANCHI CONNECT - v5 schema patch
-- Adds UPDATE RLS policy on comments so users can edit their own comments/replies.
-- Only a tiny change - safe to re-run.
-- =====================================================================

drop policy if exists "Users update own comments" on public.comments;
create policy "Users update own comments" on public.comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: bump updated_at column if you want to track edits
alter table public.comments add column if not exists updated_at timestamptz;

create or replace function public.set_comment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_comment_updated on public.comments;
create trigger on_comment_updated before update on public.comments
  for each row execute function public.set_comment_updated_at();
