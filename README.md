# SmartNotes

SmartNotes for **PDCA-032 milestones 032.1–032.9**.

## Stack

- Next.js 14 (App Router)
- TypeScript + ESLint + Tailwind
- Clerk (Auth + Webhooks)
- Supabase (Postgres + RLS)
- Pinecone (semantic indexing/search)
- Upstash Redis (API rate limiting)
- Resend (welcome email)
- Sentry + PostHog (telemetry)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env vars:

```bash
cp .env.example .env.local
```

3. Configure external services:

- Clerk (Email + Google OAuth + webhook)
- Supabase migrations + JWT template
- Pinecone index
- Upstash Redis database
- Resend sender domain
- Sentry + PostHog projects

See `docs/setup-m032-5-9.md` for exact steps.

4. Run locally:

```bash
npm run dev
```

## API summary

Authenticated routes:

- `GET /api/notes` list notes (pinned first)
- `POST /api/notes` create note (+ optional premium `tags`, `pinned`)
- `PATCH /api/notes/:id` update note (+ optional premium `tags`, `pinned`)
- `DELETE /api/notes/:id` delete note
- `POST /api/notes/search` semantic search via Pinecone, maps back to Supabase notes
- `GET /api/tags` premium-only tag list

Webhook route:

- `POST /api/webhooks/clerk` handles `user.created` and sends welcome email via Resend

Cross-cutting:

- `/api/*` sliding-window rate limit: **10 req/min** (429 `{ "error": "Rate limit exceeded" }`)
- Event tracking: `note_created`, `note_deleted`, `search_performed`

## Milestone status

- [x] 032.1 repo created and scaffolded
- [x] 032.2 Clerk auth wiring + protected dashboard + server userId access
- [x] 032.3 Supabase schema + RLS + FTS migration/docs
- [x] 032.4 Notes CRUD API + free plan limit enforcement
- [x] 032.5 Pinecone note indexing + semantic search flow
- [x] 032.6 Upstash sliding-window rate limiting for `/api/*`
- [x] 032.7 Clerk `user.created` webhook + Resend welcome email
- [x] 032.8 Premium tags endpoint + pin support + strict 403 for free plan
- [x] 032.9 Sentry + PostHog event tracking for note lifecycle/search
