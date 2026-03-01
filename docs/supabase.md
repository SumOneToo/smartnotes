# Supabase setup (PDCA-032 / milestone 032.3)

## 1) Create project

Create a Supabase project and collect:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- (optional for client usage later) `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2) Apply migration

Run SQL from:

- `supabase/migrations/20260301141500_pdca032_notes_schema.sql`
- `supabase/migrations/20260301143000_pdca032_premium_tags_pinning.sql`

This creates:

- `public.users`
- `public.notes` (with `pinned`)
- `public.note_tags`
- RLS policies (own rows only)
- FTS `search_vector` (`title` + `content`)
- indexes + `updated_at` trigger

## 3) Clerk JWT integration (required for RLS with Clerk identity)

In Clerk:

1. Create a **JWT template** named `supabase`.
2. Ensure token subject uses Clerk user id (`sub`).

In Supabase:

1. Configure external JWT verification for Clerk issuer/JWKS.
2. Verify `auth.jwt() ->> 'sub'` resolves to Clerk user id in policies.

> Without this setup, JWT-based RLS checks for direct user tokens will not work.
