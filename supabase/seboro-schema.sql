-- SEBORO 0.3
-- Biblioteca y progreso por usuario.
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists public.user_books (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_slug text not null,
  saved boolean not null default false,
  progress integer,
  finished boolean not null default false,
  purchased boolean not null default false,
  last_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_slug),
  constraint user_books_progress_nonnegative
    check (progress is null or progress >= 0)
);

alter table public.user_books enable row level security;

grant select, insert, update, delete
on public.user_books
to authenticated;

drop policy if exists "Users can read their own library" on public.user_books;
create policy "Users can read their own library"
on public.user_books
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own library rows" on public.user_books;
create policy "Users can create their own library rows"
on public.user_books
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own library rows" on public.user_books;
create policy "Users can update their own library rows"
on public.user_books
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own library rows" on public.user_books;
create policy "Users can delete their own library rows"
on public.user_books
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists user_books_user_id_idx
on public.user_books (user_id);

create index if not exists user_books_last_opened_idx
on public.user_books (user_id, last_opened_at desc);
