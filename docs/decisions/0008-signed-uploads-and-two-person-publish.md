# ADR‑0008 — Signed upload slots and the two‑person publish rule

**Status:** accepted · **Date:** 2026‑11

## Context

The content lifecycle in `AGENTS.md` (draft → in review → published → superseded/archived) was
described in the docs and modelled in `src/db/schema.ts`, but nothing implemented it: there was no
authoring surface, no review queue, and no code path that could create a `material_versions` row,
so the library could only ever be populated by the seed script. Two constraints shaped the fix:

1. **Body limits.** Files are up to 15 MB (PDF) and 250 MB (video). Vercel caps a serverless request
   body at ~4.5 MB, so proxying bytes through a Server Action or Route Handler cannot work, and
   raising the limit is not an option we control.
2. **Clinical safety.** A single facilitator publishing their own clinical protocol without a second
   reader is a patient‑safety risk, and `docs/rbac.md` already promised "reviewer ≠ author".

## Decision

**Uploads go directly to Supabase Storage through short‑lived signed slots.** The server chooses the
path (`materials/<materialId>/<uuid>.<ext>`), checks the declared MIME type and size against
`MIME_ALLOWLIST` / `MAX_UPLOAD_BYTES`, and mints a signed upload URL. The browser `PUT`s the bytes and
computes the SHA‑256 checksum locally with Web Crypto; a second Server Action ("finalise") re‑reads
the object's metadata from storage (`info()`), re‑validates type and size, assigns the version number
in a transaction, and writes the audit entry. A rejected finalise deletes the object so no orphan
bytes are kept, and every client‑supplied path is validated against the shape the server issued.

**Publishing needs two people.** `publishBlockers()` in `src/lib/material-workflow.ts` refuses to
publish unless the version is `IN_REVIEW`, the publisher is not the uploader, and at least one
approval from a non‑uploader is on record. A `SYSTEM_ADMIN` may override with a free‑text reason of
at least 10 characters, which is written to the audit entry. `scopeAllows()` applies the same rule to
the `material.review` capability, so an author cannot approve their own version even by posting the
form directly.

## Consequences

**(+)**
* File size is no longer bounded by the application server; a 250 MB video behaves like a 1 MB memo.
* Every lifecycle step is a capability check plus an audit row, so the chain in `verify-audit-chain`
  explains who moved a version and when.
* The rules that decide *whether* an action is allowed are pure functions with unit tests
  (`material-workflow.test.ts`, `schemas/authoring.test.ts`), independent of the database.
* Storage keys are server‑generated and immutable, so a signed URL never leaks a listing.

**(−)**
* Two round trips per upload, and the checksum is computed by the client: a malicious client can
  claim any checksum. Size and content type are re‑verified server‑side from storage metadata, and
  virus scanning (`scanStatus = PENDING`) remains the control for content.
* The version number is assigned at finalise, not at upload, so the storage key cannot embed it and
  the layout in `docs/architecture.md` §8 changed from `v<version>/` to a flat per‑material folder.
* Abandoned uploads (target minted, bytes never sent) leave nothing in the database but can leave a
  stray object if the client never finalises; a storage‑lifecycle rule on the bucket prefix is the
  follow‑up control.
