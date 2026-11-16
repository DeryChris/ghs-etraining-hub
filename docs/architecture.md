# Architecture — GHS‑ELN

Companion to `AGENTS.md` (contract) and `docs/PRD.md` (requirements). This file explains *how the
request lifecycle works* so an agent never has to guess where code belongs.

## 1. Rendering strategy

```
Browser ──▶ Edge Middleware (cheap session signature check, redirect, security headers)
        └─▶ Server Component tree (async, sequential/parallel data loading)
              ├─ src/lib/server/*-queries.ts   → Drizzle → typed DTOs
              ├─ <Suspense> boundaries          → stream slow panels
              └─ Client leaves ("use client")   → interactivity only
        └─▶ Server Actions                     → guard → validate → tx(logAudit) → revalidate
```

**Rules**

1. Server Components fetch. Client Components receive serialisable DTOs and own only
   interaction state. A client component must never contain a query path.
2. `export const revalidate` / `cache tags`: dashboard and library data are user‑scoped, so they
   are `dynamic = "force-dynamic"` by default. Only truly public artefacts (certificate
   verification, published SOP *metadata*) may be cached — and then tagged
   `["material", material.id]` so publishing can `revalidateTag`.
3. Parallelise independent awaits with `Promise.all`; sequential awaits only when a value feeds the
   next query.
4. Never `await` a database call inside `.map()` — use `inArray` batches.

## 2. Server Actions vs Route Handlers

| Need | Use |
| --- | --- |
| Form submit, modal confirm, inline edit | Server Action (`"use server"` in `src/app/**/actions.ts` or `src/lib/server/actions/*`) |
| Guarded data read for a client widget that cannot be a prop | Server Action returning DTO (not a REST GET) |
| Webhook (transcode done, malware scan done, SMS delivery) | Route Handler `POST` with HMAC verification |
| Streaming a private file | Route Handler issuing a 302 to a signed URL or proxying bytes |
| Health / status | `GET /api/health` |

Server Actions are the default because they cannot be casually CSRF‑sprayed across origins, keep
types end‑to‑end, and remove a whole REST surface from the security review.

## 3. Connection & pool sizing

Sandbox: `pg.Pool` with defaults (max 10) is fine. Production: **pool per serverless instance is
the danger** — set `max: 3–5`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 10000`, and
point `DATABASE_URL` at the transaction pooler (port 6543). `DIRECT_URL` is used only by
`drizzle-kit`. Never hold a transaction open across an `await fetch` or file read.

## 4. Error handling

```
notFound()                                         → renders not-found, no detail leak
redirect("/dashboard?notice=forbidden")            → wrong role on a known surface
checkCapability() → { ok: false, message }          → plain-English refusal shown inline
throw new Error                                    → 500, logged server-side with a correlation id
```

Server Actions return a discriminated result (`{ ok, message }`) rather than throwing, so forms
can render the refusal next to the field that caused it. Pages call `notFound()` when the
resource must not be revealed, and `redirect()` when the surface is already known to the user.

`src/lib/server/errors.ts` is the one vocabulary: `AppError(code, publicMessage, { details, cause })`
with an HTTP status per code, `toFieldErrors(zodError)` for field-level messages, and
`publicMessageOf()` which collapses anything unexpected to "Something went wrong on our side" so a
pg error or table name can never reach a learner. Route handlers catch, log, and answer in that
shape.

Every response carries `x-request-id` (set in `src/proxy.ts`), forwarded downstream on the same
header, mirrored into the readable `ghs_rid` cookie, and echoed in `/api/health`. `error.tsx` and
`global-error.tsx` show that id (first 8 characters) as the reference to quote; the server log line
carries the full id plus Next's digest. No stack trace is ever sent to the browser.

## 5. Observability

* `GET /api/health` → `{ ok, version, uptime, checks: { db }, latencyMs, requestId }`, plus
  `error: { code: "UPSTREAM_UNAVAILABLE", message }` when the database is unreachable; returns 503 so
  the platform can act on it and logs `health.db_unavailable`.
* Structured logs: `logEvent()` in `src/lib/server/logger.ts` writes one JSON line
  (`{ level, time, event, userId?, role?, … }`) that a log drain can index. Keys matching the PII
  pattern are redacted by `redactMetadata()` before the line is written, so message bodies,
  e-mails and staff PINs never reach stdout.
* Correlated events: `material.file_issued`, `message.sent`, `progress.recorded`,
  `progress.rate_limited`, `certificate.verify_rate_limited`.
* Alert thresholds (to wire in the hosting platform): p95 > 1.5 s for 10 min, error rate > 1 %,
  `*.rate_limited` spikes, and any `db:verify-chain` failure.

## 6. Environments

| Env | Data | Behaviour |
| --- | --- | --- |
| local | seeded demo roster, fake PINs | verbose Drizzle logging, seeded admin from env |
| preview | anonymised copy | every PR gets a URL, seeded, no real PII |
| staging | anonymised + masked | mirrors prod, DPIA checks |
| production | real | migrations only (`drizzle-kit migrate`), seeder blocked, MFA enforced |

**Anonymised copy rule**: any data copied to a lower environment must pass
`scripts/anonymise-roster.ts` (names → "Test User N", phones → null, emails → `user<n>@example.gh`).

## 7. Caching & invalidation map

| Data | Cache | Invalidated by |
| --- | --- | --- |
| Dashboard aggregates | none (dynamic) | n/a |
| Published material metadata | tagged `material:{id}` | `revalidateTag` on publish |
| Public directorate list + counters | `unstable_cache` 5 min, tag `taxonomy` | `revalidateTag("taxonomy")` on category/material write |
| Signed-in directorate/space/material views | none (dynamic, per-viewer cohort) | n/a |
| Certificate lookup | `unstable_cache` 1 h | `revalidateTag("certificate:{code}")` on verification |
| Static assets / media | CDN, immutable keys (version‑prefixed) | never — new version = new key |

## 7a. Schema migrations

Two streams, applied in order: `drizzle/` (generated from `src/db/schema.ts`) then
`supabase/migrations/` (RLS, grants). Operational detail lives in `docs/migrations.md`.
`drizzle-kit push` is a sandbox convenience and must never run against a real environment.

## 8. File storage layout

```
private bucket: ghs-materials
  materials/<materialId>/<uuid>.<ext>               # immutable; version number assigned at finalise
  certificates/<certificateId>.pdf
  avatars/<userId>/<uuid>.<ext>
```

Keys are never derived from user input. Signed URLs are minted per request with a 15‑minute TTL,
`Content-Disposition: attachment` for downloads and `inline` only for the in‑app viewer.

Uploads use a signed **write** slot rather than a proxy: `POST`‑style Server Action mints the target,
the browser `PUT`s the file, then a second Action re‑reads the object metadata and records the
version (ADR‑0008). The key holds no version number because the version is assigned when the object
is finalised.

## 9. Material authoring pipeline

| Step | Where | Rule |
| --- | --- | --- |
| Draft | `createDraftAction` → `materials` row, state `DRAFT` | `material.create`, category scope |
| Upload | `requestUploadAction` → signed slot; `finaliseUploadAction` → `material_versions` row | `material.upload_version`, MIME/size allowlist, checksum recorded |
| Submit | `submitForReviewAction` → version `IN_REVIEW` | `material.submit_review`, transition checked by `canTransition` |
| Review | `recordReviewDecisionAction` → `review_assignments` row | `material.review`, reviewer ≠ uploader, reason required to reject |
| Publish | `publishVersionAction` → version `PUBLISHED`, previous version `SUPERSEDED`, `materials.currentVersionId` flipped | `material.publish` + `publishBlockers()` (two‑person rule) |
| Archive | `archiveMaterialAction` → `ARCHIVED` | `material.archive`; versions and audit entries retained |
| Notify | `broadcastNoticeAction` → `notifications` row with `audience_filter` | `notification.broadcast`; audited `NOTIFICATION_BROADCAST` |

Notices share the same cohort vocabulary: `notifications.audience_filter` holds only the dimensions
that were narrowed (`region`/`directorate`/`cadre`), and `src/lib/notification-audience.ts` decides
whether a viewer matches. A space announcement copies the space's `audience_*` columns into that
filter and links back to the space; only a `SYSTEM_ADMIN` may address everyone. "Mark all read"
applies the same predicate, so a cursor is never written for a notice the person cannot see.

Pure rules live in `src/lib/material-workflow.ts` (14 unit tests); input shapes in
`src/lib/schemas/authoring.ts` (8 unit tests); database access in `src/lib/server/authoring-queries.ts`.
Surfaces: `/authoring` (my materials + new draft), `/authoring/[id]` (version history and actions),
`/review` (review queue). All three are staff‑only (`requireRole`) and the sidebar only shows the
`Author` group to staff.
