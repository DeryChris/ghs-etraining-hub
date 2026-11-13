# Data model — GHS‑ELN

Authoritative schema lives in `src/db/schema.ts`. This document explains intent, invariants and
indexes so an agent does not have to reverse‑engineer them. Naming/style rules are in
`AGENTS.md` §5.

## 1. Invariants

1. Every row has `id uuid defaultRandom` and `createdAt timestamptz defaultNow()`.
2. Rows that participate in audit history are never hard‑deleted: `users`, `materials`,
   `material_versions`, `certificates`, `audit_logs`.
3. Every FK is indexed. Every unique constraint exists because the domain says so, not for convenience.
4. Enum values are `SCREAMING_SNAKE`; adding a value requires a migration + a UI label mapping in
   `src/lib/labels.ts` (never a raw enum string in JSX).
5. Monetary/credit values are integers (`cpd_credits_x10`) — never floats.
6. PII columns are listed in `src/lib/pii-inventory.ts` and that file drives SAR/erasure tooling.

## 2. Tables

### users
`ghsStaffId` (unique, `^GHS-\d{6}$`), `email` (unique, lowercase), `fullName`, `phone` (E.164),
`role`, `cadre` (nurse / midwife / medical officer / pharmacy / laboratory / records / administration), `directorate`, `region`,
`facility`, `isActive`, `deactivatedAt`, `mfaEnabled`, `lastLoginAt`, `failedLoginCount`,
`lockedUntil`, `createdAt`, `updatedAt`.
Indexes: `users_region_role_idx (region, role)`, `users_directorate_idx`, `users_facility_idx`.
Soft‑delete only. Deactivation preserves history and anonymises the display name in discussions.

### sessions
`id`, `userId`, `tokenHash`, `ip`, `userAgent`, `expiresAt`, `revokedAt`, `createdAt`.
Purpose: revocable sessions (role change, deactivation, "sign out everywhere"). Store only the
SHA‑256 of the token, never the token.

### categories (directorates / national programmes)
`code` (unique, `CAT-XXX-nn`), `name`, `description`, `isRestricted`, `isArchived`, timestamps.

### category_facilitators
`categoryId`, `userId`, `scope` (`ALL_SPACES | OWN_SPACES`), `assignedAt`, unique on the pair.
This table is the object‑level scope source for every facilitator capability check.

### spaces
`slug` (unique, kebab‑case, immutable after creation — it appears in audit URLs), `title`,
`description`, `categoryId`, `createdById`, `audienceRegion`, `audienceDirectorate`, `audienceCadre`
(nullable audience filters), `isArchived`, timestamps.

### materials
`title`, `summary`, `type` (`DOCUMENT | VIDEO | LAB | ASSESSMENT_LINK`), `priority`
(`LOW | MEDIUM | HIGH | CRITICAL`), `requiresAcknowledgement`, `estimatedMinutes`, `cpdCreditsX10`,
`recertificationMonths`, `spaceId`, `authorId`, `currentVersionId`, `state`, `isPublished`,
timestamps. `currentVersionId` is the single pointer learners read; it flips only on publish.

### material_versions
`materialId`, `version` (monotonic per material), `storageKey`, `mimeType`, `sizeBytes`,
`checksumSha256`, `scanStatus` (`PENDING | CLEAN | INFECTED`), `state`
(`DRAFT | IN_REVIEW | PUBLISHED | SUPERSEDED | ARCHIVED`), `changeNote`, `uploadedById`,
`reviewedById`, `publishedAt`, `supersededByVersionId`, `createdAt`.
Immutable once `PUBLISHED`. Superseding inserts a new row and marks the old one, never updates bytes.

### enrollments
`userId`, `spaceId`, `source` (`SELF | ASSIGNED`), `assignedById`, `dueAt`, `completedAt`,
`lastRemindedAt`, unique on (`userId`, `spaceId`).

### material_progress
`userId`, `materialId`, `materialVersionId`, `status` (`NOT_STARTED | IN_PROGRESS | COMPLETED`),
`watchedPercent`, `acknowledgedAt`, `completedAt`, `updatedAt`, unique on (`userId`, `materialId`).
`materialVersionId` proves *which version* the staff member was trained on — required for audit
evidence (PRD §9.4).

### assessments, assessment_items, assessment_attempts
`assessments`: `materialId`, `passMarkPercent`, `questionCount`, `maxAttempts`, `cooldownHours`,
`timeLimitMinutes`, `isPublished`.
`assessment_items`: `assessmentId`, `stem`, `options jsonb`, `correctIndex`, `explanation`,
`isActive`. **`correctIndex` must never be selected into any client‑facing query.**
`assessment_attempts`: `assessmentId`, `userId`, `startedAt`, `submittedAt`, `answers jsonb`,
`scorePercent`, `passed`, `attemptNumber`, `gradedById` (null unless overridden), `overrideReason`.

### certificates
`code` (unique, `GHS-CPD-<year>-<base32>`), `userId`, `materialId`, `materialVersionId`,
`cpdCreditsX10`, `issuedAt`, `expiresAt`, `verificationCount`, `lastVerifiedAt`.
Public verification endpoint reveals name, masked PIN, title, issue/expiry, credits — nothing else.

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

### audit_logs
`userId` (nullable — `SYSTEM` actor), `action`, `entity`, `entityId`, `metadata jsonb`,
`ipAddress`, `userAgent`, `prevHash`, `hash`, `createdAt`. Append‑only; `INSERT|SELECT` grants only.

### message_reports, review_assignments, rate_limit_windows
Support tables for abuse handling, the two‑person publish rule, and login/upload throttling.

## 3. Suggested seed data (`src/db/seed.ts`)

Six categories with real GHS directorate names, 12 spaces (IPC, cold chain, malaria case
management, integrated disease surveillance & response, maternal & newborn care, AMR stewardship,
mental health, health records & DHIMS, emergency triage, HIV/STI, NTDs, quality of care), three
materials per space with at least one `CRITICAL` SOP requiring acknowledgement, a demo roster of
~40 staff spread across all 16 regions with fake PINs (`GHS-000001`…), and one superadmin whose
credentials come from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`. Idempotent: keyed upserts, safe to
re‑run, refuses to run in production unless `ALLOW_PROD_SEED=true`.

## 4. Migration discipline

* Schema change → edit `src/db/schema.ts` → `npx drizzle-kit generate` → commit SQL → apply with
  `npx drizzle-kit migrate` in staging/production. `drizzle-kit push` is a **local-only** tool.
* Any migration that drops or rewrites a column with PII must be paired with a retention note in
  the PR and, where data leaves the system, a DPO sign-off comment.
* Every migration is reversible in principle: additive first, destructive in a later release after
  a deploy‑soak.
