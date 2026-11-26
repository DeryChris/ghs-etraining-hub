# ADR‑0016 — Files do not wait for a bucket

**Status:** accepted · **Date:** 2026‑11‑17

**Context.** ADR‑0015 moved the project to Neon plus Vercel and left file storage on
"any S3-compatible bucket". On the reference deployment no bucket was ever
configured, so every upload ended with *"File storage has not been set up for this
deployment yet"* — a true sentence and a useless one, because nobody can act on it
from the training screen they are standing on. A facilitator with a deck to attach
has no bucket, no keys and no way to get either that afternoon.

Neon is a database. It has no file service, and asking for one is asking for a
second vendor to be procured before a slide deck can be filed.

**Decision.** The storage interface gains a second backend, chosen at runtime:

- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` present → the
  existing path: presigned PUT from the browser, 250 MB videos, bytes never touch
  the app.
- Otherwise → bytes go to `file_blobs` in Postgres and are served back through
  `/api/storage/file/<token>`.

Nothing above `file-storage.ts` knows the difference. Both backends hand the
browser a short-lived signed link; both are written once per upload slot; both are
re-read after arrival before a version records a size or a type.

**The ceiling is the platform, not Postgres.** Bytes stored this way pass through
the application, and Vercel accepts about 4.5 MB per request. So the database
backend caps a file at 4 MB (`STORAGE_DB_MAX_MB` to raise it on a host that allows
more) and the upload screen says so before somebody picks a 40 MB deck. Postgres
itself would take far more; that is not the constraint and pretending otherwise
would produce a 500 halfway through an upload.

**Consequences.**

- Uploads work on a bare Neon + Vercel deployment, today, with no new accounts.
- Decks, reports and pictures under 4 MB are fine. Video is not: for that, and for
  any volume, configure the bucket — the app switches over with no code change.
- A database that fills with files gets slower for everybody, so `blobUsage()`
  reports the total and the copy on the upload screen points at the bucket.
- Signed tokens replace presigned URLs. They are HMACs over key, purpose and
  expiry (`file-token.ts`), and `/api/storage/*` is deliberately outside the
  session proxy: the link *is* the authorisation, minted after the role check.
