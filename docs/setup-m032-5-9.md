# Setup & verification for milestones 032.5–032.9

## 1) Pinecone (032.5)

1. Create Pinecone project and API key.
2. Create index named `smartnotes` (or your `PINECONE_INDEX_NAME`) with cosine metric.
3. Set env vars:
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `PINECONE_EMBEDDING_MODEL` (default `llama-text-embed-v2`)

Verification:

- Create/update a note via API; vector is upserted under namespace = internal `users.id`.
- Call `POST /api/notes/search` and confirm returned notes are ordered by semantic score.

## 2) Upstash Redis rate limiting (032.6)

1. Create Upstash Redis database.
2. Set:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Verification:

- Hit any `/api/*` endpoint >10 times in 1 minute with same identity.
- Expect HTTP 429 with body:

```json
{ "error": "Rate limit exceeded" }
```

## 3) Clerk webhook + Resend welcome email (032.7)

1. In Clerk Dashboard:
   - Enable Email + Google OAuth providers.
   - Add webhook endpoint: `https://<your-domain>/api/webhooks/clerk`
   - Subscribe to `user.created`.
   - Copy webhook signing secret to `CLERK_WEBHOOK_SIGNING_SECRET`.
2. In Resend:
   - Create API key (`RESEND_API_KEY`).
   - Verify sender domain and set `RESEND_FROM_EMAIL`.

Verification:

- Create a new Clerk user.
- Check webhook delivery in Clerk logs.
- Confirm welcome email delivered by Resend.

## 4) Premium tags + pinning (032.8)

1. Apply migration `20260301143000_pdca032_premium_tags_pinning.sql`.
2. Ensure `users.plan = 'pro'` for test premium account.

Verification:

- Free plan user:
  - `GET /api/tags` => 403
  - create/update note with `tags` or `pinned` => 403
- Pro user:
  - can set `tags`, `pinned`
  - `GET /api/notes` returns pinned notes first

## 5) Sentry + PostHog tracking (032.9)

1. Set:
   - `SENTRY_DSN`
   - `SENTRY_TRACES_SAMPLE_RATE`
   - `POSTHOG_API_KEY`
   - `POSTHOG_HOST`

Tracked events:

- `note_created`
- `note_deleted`
- `search_performed`

Verification:

- Trigger each action and confirm events in PostHog.
- Trigger a controlled server exception and confirm capture in Sentry.
