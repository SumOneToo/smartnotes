-- PDCA-032 / milestones 032.5-032.9 additions

alter table public.notes
add column if not exists pinned boolean not null default false;

create table if not exists public.note_tags (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique(note_id, tag)
);

create index if not exists idx_note_tags_user_tag on public.note_tags(user_id, tag);
create index if not exists idx_notes_user_pinned_updated on public.notes(user_id, pinned desc, updated_at desc);

alter table public.note_tags enable row level security;

drop policy if exists "note_tags_select_own" on public.note_tags;
create policy "note_tags_select_own"
on public.note_tags
for select
using (
  exists (
    select 1
    from public.users u
    where u.id = note_tags.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

drop policy if exists "note_tags_insert_own" on public.note_tags;
create policy "note_tags_insert_own"
on public.note_tags
for insert
with check (
  exists (
    select 1
    from public.users u
    where u.id = note_tags.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);

drop policy if exists "note_tags_delete_own" on public.note_tags;
create policy "note_tags_delete_own"
on public.note_tags
for delete
using (
  exists (
    select 1
    from public.users u
    where u.id = note_tags.user_id
      and u.clerk_user_id = auth.jwt() ->> 'sub'
  )
);
