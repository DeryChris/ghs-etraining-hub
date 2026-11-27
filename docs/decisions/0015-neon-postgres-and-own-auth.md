# ADR‑0015 — Neon Postgres, our own sessions, and any S3 bucket

**Status:** accepted (completes the move ADR‑0002 anticipated) · **Date:** 2026‑11‑17

**Context.** Supabase was three products in one bill: Postgres, GoTrue (auth) and Storage. Everything
the application actually needs is the database. The other two cost twice:

1. **A second round trip on every signed-in page.** The edge proxy called
   `supabase.auth.getUser()` and each server layout resolved the user again. When GoTrue slowed, pages
   sat on skeletons while `/api/health` reported the database as healthy — the failure this project
   spent a week chasing, because the probe measured the wrong service.
2. **Files that could not be uploaded.** Vercel caps a serverless request body far below the 15 MB a
   PDF may legitimately be, so uploads had to go browser→storage directly. That worked, but it tied
   the storage host, the CORS policy and the Content-Security-Policy to one vendor, and left the
   bucket as the only place material files could live.

Neither is a reason to keep a third-party auth service when identity is already a row in `users`.

**Decision.**

1. **Neon Postgres.** `DATABASE_URL` points at the `-pooler` host (PgBouncer, transaction mode);
   `DIRECT_URL` points at the direct host and is used only by migrations, because DDL does not survive
   a transaction-mode pooler. Region is paired with the Vercel function region — `eu-central-1` with
   `fra1` — because the function→database leg repeats several times per page.
2. **Our own sessions.** A bcrypt hash (`users.password_hash`) is compared in-process.
   `createSessionToken` signs a base64url payload with SHA‑256 over `SESSION_SECRET`, embeds an
   expiry, and mirrors the token's hash in `sessions` so a sign-out can revoke it. Authority still
   comes from `public.users` on every request — the cookie proves identity, the row decides what it
   may do (ADR‑0002 stands).
3. **Password resets are issued, not mailed.** There is no mail provider yet, so promising an e-mail
   would be a lie: `users.password_reset_token` holds a **SHA‑256 hash** of a single-use token with a
   one-hour expiry, `npm run user:reset-password` prints a `/reset-password?token=…` URL, and an
   administrator hands it over. `/forgot-password` says exactly that.
4. **Any S3‑compatible bucket.** `src/lib/server/file-storage.ts` speaks S3 with presigned PUT/GET
   (15 minutes), configured by `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/keys. Neon Object Storage, R2,
   AWS S3 or MinIO all work unchanged; the bucket stays private and credentials never leave the server.
   The endpoint is compiled into the CSP at build time.
5. **The `supabase/` migration stream is deleted.** It existed to lock down PostgREST's auto-generated
   API with RLS and grants. Neon exposes no such API; the application connects as the owner, for whom
   RLS never applied anyway. Keeping the files would imply an attack surface that no longer exists.

**Consequences.**

(+) One fewer network hop per signed-in page, and a session that a database read can verify.
(+) Materials can move to any bucket without a code change, and the bucket can be in the same region
as the functions. (+) `npm run db:check-chain` now proves all migrations apply to an empty database
in CI, with no server and no credentials.

(−) We own password policy, lockout and reset delivery: 5 failed attempts lock an account for 30
minutes, and reset links are handed over by a person until a mail provider is added. (−) Two Neon
hosts must be kept straight — pooled for the app, direct for migrations — and `db:doctor` now warns
when they are swapped. (−) Object storage needs CORS configured per deployment origin; a missing rule
fails silently in the browser and not in the logs.

**Date.** 2026‑11‑17
