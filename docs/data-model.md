# Data model — GHS-TL

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

### users
`ghsStaffId` (unique — the employee number as the payroll list prints it, plain digits such as
`2681763`; the older `GHS-000123` spelling is still read, and both resolve to the same person via
`src/lib/staff-id.ts`), `email` (unique, lowercase), `fullName`, `phone` (E.164),
`role`, `cadre` (nurse / midwife / medical officer / pharmacy / laboratory / records / administration), `directorate`, `region`,
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
(`LOW | MEDIUM | HIGH | CRITICAL`), `requiresAcknowledgement`, `estimatedMinutes`, `cpdCreditsX10`,
`recertificationMonths`, `programmeAreaId`, `authorId`, `currentVersionId`, `state`, `isPublished`,
timestamps. `currentVersionId` is the single pointer learners read; it flips only on publish.

### material_versions
`materialId`, `version` (monotonic per material), `storageKey`, `mimeType`, `sizeBytes`,
`checksumSha256`, `scanStatus` (`PENDING | CLEAN | INFECTED`), `state`
(`DRAFT | IN_REVIEW | PUBLISHED | SUPERSEDED | ARCHIVED`), `changeNote`, `uploadedById`,
`reviewedById`, `publishedAt`, `supersededByVersionId`, `createdAt`.
Immutable once `PUBLISHED`. Superseding inserts a new row and marks the old one, never updates bytes.

### enrollments
`userId`, `programmeAreaId`, `source` (`SELF | ASSIGNED`), `assignedById`, `dueAt`, `completedAt`,
`lastRemindedAt`, unique on (`userId`, `programmeAreaId`).

### material_progress (acknowledgements)
`userId`, `materialId`, `materialVersionId`, `acknowledgedAt`, `updatedAt`, unique on
(`userId`, `materialId`). `materialVersionId` proves *which version* the staff member read and signed
for — required for audit evidence (PRD §9.4).

The learning path that used to live here — `status`, `watchedPercent`, `completedAt` — was dropped in
`drizzle/0017_library_without_marks.sql`. A library does not have a completion state: "0 of 0
materials completed" was arithmetic about a course nobody had enrolled in. What remains is the one
fact a directorate can be asked about, and it is not a grade.

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
Open and download records (`material_progress`, `material_views`) exist so programme teams can see what
is being read, and `material_progress.acknowledged_at` records a signature against a material version
where a protocol asks for one. Nothing is marked, scored, issued or verified.

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
marks staff-only programmes, `programme_areas.audience_region|directorate|cadre` targets a cohort (null
means everyone), and `area_facilitators` (`area_id`, `user_id`, unique together) grants a facilitator
the right to author and review in that area. Directorates and spaces — the earlier `categories` →
`spaces` pair — are gone; the migration that removed them left a JSON snapshot in
`legacy_taxonomy_backup`.

### training_sessions (the Trainings register)
`title`, `year` (defaults to the current year, corrected to the start date's year on backfill),
`programmeFieldId`, `programmeAreaId`, `targetGroup`, `organisedOn` (start date), `endsOn`,
`durationText`, `status` (`PLANNED | COMPLETED | CANCELLED`), `venue`, `regionId`, `districtId`,
`subDistrictId`, `facilityId`, `attendeeCount`, `notes`, `isArchived`, `createdById`, timestamps.
A training carries no category and no space since ADR‑0014: the field and the area are the whole
classification. Indexes on (`year`, `organisedOn`) and `programmeAreaId` back the register's filters.
Rows are archived, never deleted.

### audit_logs
`userId` (nullable — `SYSTEM` actor), `action`, `entity`, `entityId`, `metadata jsonb`,
`ipAddress`, `userAgent`, `prevHash`, `hash`, `createdAt`. Append‑only; `INSERT|SELECT` grants only.

### message_reports, review_assignments, rate_limit_windows
Support tables for abuse handling, the two‑person publish rule, and login/upload throttling.

## 3. Suggested seed data (`src/db/seed.ts`)

The ten programme fields and forty-one areas GHS supplied (`PROGRAMME_FIELDS`), keyed on their
codes so a revised list updates rather than duplicates. Three starter materials filed under real
programme areas (standard precautions → Quality Assurance, cold chain → EPI, surveillance → Surveillance),
one of them a `CRITICAL` SOP requiring acknowledgement; the sixteen regions; the eleven Upper West
districts with their Nadowli‑Kaleo sub-districts and hospitals; a facilitator assigned to two areas so
the authoring and review queues are not empty; a demo roster of staff across all 16 regions with fake
PINs (`GHS-000001`…); and one superadmin whose credentials come from
`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`. Idempotent: keyed upserts, safe to
re‑run, refuses to run in production unless `ALLOW_PROD_SEED=true`.

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
