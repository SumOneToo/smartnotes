-- PDCA-032 / milestone 032.3
-- Users + Notes schema with RLS and full-text search

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_clerk_user_id on public.users(clerk_user_id);
create index if not exists idx_notes_user_id_updated_at on public.notes(user_id, updated_at desc);
create index if not exists idx_notes_search_vector on public.notes using gin(search_vector);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.notes enable row level security;

-- RLS: user can only access their own profile row using Clerk JWT subject (sub)
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
using (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
using (clerk_user_id = auth.jwt() ->> 'sub')
with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
with check (clerk_user_id = auth.jwt() ->> 'sub');

-- RLS: user can only access notes linked to their own users row
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
on public.notes
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = notes.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.id = notes.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes
for update
using (
  exists (
    select 1
    from public.users u
    where u.id = notes.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = notes.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes
for delete
using (
  exists (
    select 1
    from public.users u
    where u.id = notes.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);
