# ADR-0002: Identity, row-level security, and the audit chain

Status: accepted · Date: 2026-01-13 · Supersedes: the custom `ghs_session` cookie (never wired up)

## Context

A review of the first working build found four issues that matter for a government health system:

1. **Public API exposure.** Every `public` table had RLS disabled. The anon key ships in the browser
   bundle, so anyone could read staff IDs and emails through `/rest/v1/*`. This was confirmed with an
   unauthenticated request (HTTP 200 with staff data).
2. **Privilege escalation via metadata.** The session fell back to `user_metadata.role`. Supabase lets a
   signed-in user write their own `user_metadata`.
3. **Wrong identity key.** The session used the Supabase Auth id, but `audit_logs.user_id` references
   `public.users.id`.
4. **Audit chain could never verify.** Writes read the oldest row (not the newest), hashed `staffId`
   while verification hashed `userId`, and stored JSON strings inside `jsonb`.

## Decisions

- **Lock the PostgREST surface.** `supabase/migrations/20260113000000_lock_public_api.sql` enables RLS
  on every public table, revokes `anon`/`authenticated` privileges, and sets default privileges for
  future tables. The application connects as `postgres` (`BYPASSRLS`), so it is unaffected. No access
  policies are added, so the anon key can read nothing. Any future policy must be explicit and reviewed.
- **Identity vs authority.** Supabase Auth proves who you are. `public.users` decides what you may do.
  Role, name and staff ID come only from the directory row. A login with no directory row is
  `unprovisioned` and sees an explanatory screen, not a privileged shell. Deactivated staff are
  `inactive`.
- **Session subject = `public.users.id`.** Every foreign key and audit row uses the directory id.
- **Audit chain.** Writers take `pg_advisory_xact_lock`, link to the newest entry, enforce strictly
  increasing timestamps, and hash canonical (key-sorted) JSON. Entries are written inside the same
  transaction as the change they record, so a rolled-back change leaves no audit row.
- **Read-state is not audited.** Marking notifications or messages as read is high-volume and carries
  no governance value. Creating messages, progress steps, file issues, and sign-outs are audited.
  Message bodies are never logged; only recipient and length are.
- **Files.** Controlled documents are never proxied through the app. The route issues a 15-minute
  signed URL from a private bucket and audits the issue.
- **Open redirects.** Post-sign-in targets must be same-origin relative paths (`safeNextPath`).

## Consequences

- Operators must add `http://localhost:3000/auth/callback` (and the production equivalent) to the
  Supabase Auth redirect allow-list, or password-reset links will not complete.
- Deleting a user sets `audit_logs.user_id` to null, which breaks chain verification for that entry.
  Deactivate accounts; do not delete them.
- The lock-down migration must be applied in every environment. Run it before first deploy.
