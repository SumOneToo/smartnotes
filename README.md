# SmartNotes

SmartNotes for **PDCA-032 milestones 032.1–032.4**.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- ESLint
- Clerk (Auth: Email + Google OAuth)
- Supabase (Postgres + RLS + FTS)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env vars:

```bash
cp .env.example .env.local
```

Fill in Clerk + Supabase values in `.env.local`.

3. Configure Clerk providers:

- Enable **Email** auth in Clerk Dashboard.
- Enable **Google OAuth** in Clerk Dashboard (requires Google client id/secret).

4. Configure Supabase schema:

- Apply migration in `supabase/migrations/20260301141500_pdca032_notes_schema.sql`
- Follow `docs/supabase.md` for Clerk JWT + RLS wiring.

5. Run locally:

```bash
npm run dev
```

## Auth + routes

- `/dashboard` is protected via Clerk middleware.
- `/api/notes` and `/api/notes/:id` are protected via middleware + server auth checks.
- Server-side user identity is available from Clerk (`auth()` / `currentUser()`).

## Notes API

Authenticated endpoints:

- `GET /api/notes` — list current user notes
- `POST /api/notes` — create note
- `PATCH /api/notes/:id` — update note
- `DELETE /api/notes/:id` — delete note

Free-plan enforcement:

- Maximum **50 notes** on free plan (server-side check)

## Milestone status

- [x] 032.1 repo created and scaffolded
- [x] 032.2 Clerk auth wiring + protected dashboard + server userId access
- [x] 032.3 Supabase schema + RLS + FTS migration/docs
- [x] 032.4 Notes CRUD API + free plan limit enforcement
