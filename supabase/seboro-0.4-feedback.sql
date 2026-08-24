-- SEBORO 0.4
-- Valoraciones, reacciones y críticas por usuario.
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists public.user_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_slug text not null,
  rating smallint,
  reactions text[] not null default '{}',
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_slug),
  constraint user_feedback_rating_range
    check (rating is null or (rating >= 1 and rating <= 5))
);

alter table public.user_feedback enable row level security;

grant select, insert, update, delete
on public.user_feedback
to authenticated;

drop policy if exists "Users can read their own feedback" on public.user_feedback;
create policy "Users can read their own feedback"
on public.user_feedback
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own feedback" on public.user_feedback;
create policy "Users can create their own feedback"
on public.user_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own feedback" on public.user_feedback;
create policy "Users can update their own feedback"
on public.user_feedback
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own feedback" on public.user_feedback;
create policy "Users can delete their own feedback"
on public.user_feedback
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists user_feedback_user_id_idx
on public.user_feedback (user_id);

create index if not exists user_feedback_book_slug_idx
on public.user_feedback (book_slug);
