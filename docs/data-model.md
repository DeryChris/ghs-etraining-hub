# Data model — GHS-UWRHD-TL

Authoritative schema lives in `src/db/schema.ts`. This document explains intent, invariants and
indexes so an agent does not have to reverse‑engineer them. Naming/style rules are in
`AGENTS.md` §5.

## 1. Invariants

1. Every row has `id uuid defaultRandom` and `createdAt timestamptz defaultNow()`.
2. Rows that participate in audit history are never hard‑deleted: `users`, `materials`,
   `material_versions`, `audit_logs`.
3. Every FK is indexed. Every unique constraint exists because the domain says so, not for convenience.
4. Enum values are `SCREAMING_SNAKE`; adding a value requires a migration + a UI label mapping in
   `src/lib/labels.ts` (never a raw enum string in JSX).
5. Counters and durations are integers (`count`, `seconds`) — never floats.
6. PII columns are listed in `src/lib/pii-inventory.ts` and that file drives SAR/erasure tooling.

## 2. Tables

**Current interface taxonomy:** the historical database table names do not match the user-facing labels.
`programme_fields` is the parent **Programme Areas** table; `programme_areas` is the child **Programme
Fields** table; `materials.programme_area_id` points to a child Programme Field. Public and signed-in
interfaces present the hierarchy as **Programme Areas → Programme Fields → Training Materials**.

### users
`ghsStaffId` (unique — the employee number as the payroll list prints it, plain digits such as
`2681763`; the older `GHS-000123` spelling is still read, and both resolve to the same person via
`src/lib/staff-id.ts`), `email` (unique, lowercase), `fullName`, `phone` (E.164),
`role`, `grade` (nurse / midwife / medical officer / pharmacy / laboratory / records / administration), `directorate`, `region`,
`facility`, `isActive`, `deactivatedAt`, `mfaEnabled`, `lastLoginAt`, `failedLoginCount`,
`lockedUntil`, `createdAt`, `updatedAt`.
Indexes: `users_region_role_idx (region, role)`, `users_directorate_idx`, `users_facility_idx`.
`isUnitHead` is a duty carried by a facilitator, not a fourth role: it grants the review queue for
their fields and nothing else, which is why it does not disturb their area assignments. The Users
screen offers it as a fourth choice in the role field (`UNIT_HEAD`) and writes `role = FACILITATOR,
is_unit_head = true`; see `roleForStaffRole` in `src/lib/rbac/capabilities.ts`.

Soft‑delete only. Deactivation preserves history and anonymises the display name in discussions.

### sessions
`id`, `userId`, `tokenHash`, `ip`, `userAgent`, `expiresAt`, `revokedAt`, `createdAt`.
Purpose: revocable sessions (role change, deactivation, "sign out everywhere"). Store only the
SHA‑256 of the token, never the token.

### ~~categories~~ (retired — see programme_fields)
`code` (unique, `CAT-XXX-nn`), `name`, `description`, `isRestricted`, `isArchived`, timestamps.

### ~~category_facilitators~~ (retired — see area_facilitators)
`categoryId`, `userId`, `scope` (`ALL_SPACES | OWN_SPACES`), `assignedAt`, unique on the pair.
This table is the object‑level scope source for every facilitator capability check.

### ~~spaces~~ (retired — see programme_areas)
`slug` (unique, kebab‑case, immutable after creation — it appears in audit URLs), `title`,
`description`, `categoryId`, `createdById`, `audienceRegion`, `audienceDirectorate`, `audienceCadre`
(nullable audience filters), `isArchived`, timestamps.

### materials
`title`, `summary`, `type` (`DOCUMENT | VIDEO | LAB | ASSESSMENT_LINK`), `priority`
(`LOW | MEDIUM | HIGH | CRITICAL`), `estimatedMinutes`, `programmeAreaId`, `authorId`,
`currentVersionId`, `state`, `isPublished`, timestamps. There is no `requires_acknowledgement` and no
CPD or recertification column: the library stores material and a record of what was read, not an
obligation or a credit (ADR‑0026, ADR‑0028). `currentVersionId` is the single pointer learners read; it flips only on publish.

### material_versions
`materialId`, `version` (monotonic per material), `storageKey`, `mimeType`, `sizeBytes`,
`checksumSha256`, `scanStatus` (`PENDING | CLEAN | INFECTED`), `state`
(`DRAFT | IN_REVIEW | PUBLISHED | SUPERSEDED | ARCHIVED`), `changeNote`, `uploadedById`,
`reviewedById`, `publishedAt`, `supersededByVersionId`, `createdAt`.
Immutable once `PUBLISHED`. Superseding inserts a new row and marks the old one, never updates bytes.

### ~~enrollments~~, ~~material_progress~~ (retired — see material_views)

Enrolment rows were written by exactly one thing: the "acknowledge this protocol" action, which
enrolled the signer in the area as a side effect. No page listed an enrolment and no report counted
one, so when the signature went, the table had no writer and no reader left. `material_progress` held
one row per person per material — the version they had signed against — and went the same way in
`drizzle/0021_retire_the_signature.sql` (ADR‑0028). The `enrollment.self` and `enrollment.assign`
permissions went with them.

An earlier cut had already taken `status`, `watchedPercent` and `completedAt` out of `material_progress`
(`drizzle/0017_library_without_marks.sql`): a library does not have a completion state, and "0 of 0
materials completed" was arithmetic about a course nobody had enrolled in.

What the service keeps is `material_views` — which material was opened, by whom, on which day, and how
often. That is a record of reading, and it is the whole record.

### file_blobs
`storageKey`, `mimeType`, `sizeBytes`, `bytes` (`bytea`), `createdAt`, unique on `storageKey`.

The fallback file store, used when no S3-compatible bucket is configured (`src/lib/server/blob-store.ts`).
Neon is a database and has no file service, so uploads would otherwise be broken on the reference
deployment. Bytes pass through the app, which caps a file at the platform's request-body limit
(~4.5 MB on Vercel; `STORAGE_DB_MAX_MB`, default 4). With `S3_ENDPOINT`/`S3_BUCKET` set, the same
storage interface switches to direct browser-to-bucket uploads and the table stays empty.

### training_comments
`trainingId`, `authorId`, `body`, `createdAt`, index on (`trainingId`, `createdAt`).

The discussion under a training page. Flat and chronological; the author or an administrator may
remove a message. `training_sessions.image_storage_key` holds the optional cover picture, written
through the same storage interface.

### activity only, no marks
Open and download records (`material_views` plus the `MATERIAL_FILE_ISSUED` audit entries) exist so
programme teams can see what is being read. Nothing is marked, scored, issued, verified — or signed.
ADR‑0028 retired the acknowledgement, so there is no table in which one person certifies to another
that they read a document.

The `certificates` table was dropped in `drizzle/0013_retire_the_award.sql` (ADR‑0011), and the question
banks, attempts and pass marks went in `drizzle/0020_retire_the_marks.sql` (ADR‑0026). A material may
still be of type `ASSESSMENT_LINK` or `LAB` — a training can attach the paper a facilitator hands out —
but the library stores the paper, not the answers.

### comments
`materialId`, `authorId`, `parentId`, `body`, `isRemoved`, `removedReason`, `removedById`,
`editedAt`, `createdAt`. Depth is stored unlimited, rendered to depth 2 then collapsed.
Soft‑delete only (`isRemoved`).

### direct_messages
`senderId`, `recipientId`, `body`, `isRead`, `readAt`, `isReported`, `reportReason`, `createdAt`.
Retention 2 years, then purge job. No group messaging in v2.

### notifications + notification_recipients + notification_read_cursors
`notifications`: `title`, `body`, `type`, `priority`, `linkUrl`, `audience`
(`ALL | REGION | DIRECTORATE | FACILITY | USER_IDS`), `audienceFilter jsonb`, `publishedAt`,
`expiresAt`.
Recipients rows are created **only** for `USER_IDS` audiences; everything else is matched at read
time against `notification_read_cursors (userId, notificationId, readAt)` — the broadcast‑fan‑out
rule from PRD §5.7.

### programme_fields, programme_areas, area_facilitators
The vocabulary a training plan is written in: `programme_fields` (`code` unique, `name` unique,
`description`, `sortOrder`, `isArchived`) and `programme_areas` (`fieldId` → programme_fields,
`code` unique, `name`, `description`, `sortOrder`, `isArchived`; unique on (`fieldId`, `name`)).
Seeded from the GHS list in `src/db/data/programme-taxonomy.ts` (10 fields, 41 areas) and maintained
at `/programme-fields`. They carry the whole taxonomy since ADR‑0014: `programme_fields.is_restricted`
marks staff-only programmes, `programme_areas.audience_region|directorate|grade` targets a cohort (null
means everyone), and `area_facilitators` (`area_id`, `user_id`, unique together) grants a facilitator
the right to author and review in that area. Directorates and spaces — the earlier `categories` →
`spaces` pair — are gone; the migration that removed them left a JSON snapshot in
`legacy_taxonomy_backup`.

### training_sessions (the Trainings list)
`title`, `year` (defaults to the current year, corrected to the start date's year on backfill),
`programmeFieldId`, `programmeAreaId`, `targetGroup`, `organisedOn` (start date), `endsOn`,
`durationText`, `status` (`PLANNED | COMPLETED | CANCELLED`), `venue`, `regionId`, `districtId`,
`subDistrictId`, `facilityId`, `attendeeCount`, `notes`, `isArchived`, `createdById`, timestamps.
A training carries no category and no space since ADR‑0014: the field and the area are the whole
classification. Indexes on (`year`, `organisedOn`) and `programmeAreaId` back the filters on `/trainings`.
Rows are archived, never deleted.

### audit_logs
`userId` (nullable — `SYSTEM` actor), `action`, `entity`, `entityId`, `metadata jsonb`,
`ipAddress`, `userAgent`, `prevHash`, `hash`, `createdAt`. Append‑only; `INSERT|SELECT` grants only.

### message_reports, review_assignments, rate_limit_windows
Support tables for abuse handling, the two‑person publish rule, and login/upload throttling.

## 3. Seed data (`src/db/seed.ts`)

The seed upserts the ten GHS-supplied parent Programme Areas and forty-one child Programme Fields
from `PROGRAMME_FIELDS`, keyed by stable codes. It also installs reference geography and, when the
row is absent, a passwordless bootstrap administrator (`SEED_ADMIN_EMAIL`, defaulting to
`admin@ghs.gov.gh`). Re-running does not reset an existing administrator password. Its reference
geography includes Ghana's region names, but only the Upper West districts, sub-districts and
facilities are seeded as the service geography; reference names do not imply service availability or
rollout. It creates **no learner roster, training materials or training sessions**: published
catalogue content and training-session counts must come from approved, source-backed records, never
sample content. The seed is idempotent and refuses to run when `NODE_ENV=production` unless
`ALLOW_PROD_SEED=true`; do not use that override to populate fabricated records.

## 4. Migration discipline

* Schema change → edit `src/db/schema.ts` → `npx drizzle-kit generate` → commit SQL → apply with
  `npx drizzle-kit migrate` in staging/production. `drizzle-kit push` is a **local-only** tool.
* **Journal stamps must be strictly increasing.** `migrate` applies a file only when its `when` is
  newer than the newest row in `drizzle.__drizzle_migrations`; equal stamps are skipped in silence
  (this is how `0017_library_without_marks` went unapplied while `db:migrate` printed success).
  `src/lib/migrations.ts` mirrors the journal, `src/lib/migrations.test.ts` fails if the two
  disagree or the stamps stop increasing, and `npm run db:check-chain` asserts the ordering too.
* `npm run db:repair` applies the files the journal still has pending and records them — the escape
  hatch for a database that was skipped once. `db:migrate` remains the normal path.
* Any migration that drops or rewrites a column with PII must be paired with a retention note in
  the PR and, where data leaves the system, a DPO sign-off comment.
* Every migration is reversible in principle: additive first, destructive in a later release after
  a deploy‑soak.
