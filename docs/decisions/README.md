# Architecture Decision Records

Any deviation from `docs/PRD.md` or `AGENTS.md` requires an ADR here **and** an entry in the
console at `/decisions` (same content, so agents working in a browser session can see it).

Format: `ADR-NNN — Title`, then **Status** (proposed | accepted | superseded by ADR-NNN),
**Context**, **Decision**, **Consequences** (positive and negative), **Date**.

---

## ADR‑0001 — Drizzle ORM instead of Prisma

**Status:** accepted · **Date:** 2026‑01

**Context.** The client's PRD v1 specified Prisma with Supabase. This repository's runtime is
Next.js 16 + local PostgreSQL, and the deployment target is Vercel serverless, where a generated
Prisma client binary, `directUrl`/pooled‑URL juggling and engine downloads add build weight and
cold‑start cost. The repo already ships `drizzle-orm` + `pg` with a pooled singleton.

**Decision.** Use Drizzle ORM exclusively. Schema lives in `src/db/schema.ts`; migrations are
generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`; `drizzle-kit push` is
a local‑only convenience. No Prisma files may be committed.

**Consequences.** (+) One TypeScript source of truth, no codegen step, edge‑compatible queries,
cheaper cold starts, `tsc` catches schema drift. (−) Drizzle has no migration‑studio history view,
so migration SQL must be reviewed by hand; relational query helpers are less magical than
Prisma's, which means explicit joins (also a plus for reviewability).

---

## ADR‑0002 — `MaterialVersion` replaces `Material.fileUrl`

**Status:** accepted · **Date:** 2026‑01

**Context.** v1 stored a single `fileUrl` string on the material row. That makes version history
impossible, invites public buckets, and gives no evidence of which version a staff member was
trained on.

**Decision.** Materials hold a `currentVersionId` pointer; bytes and metadata live in immutable
`material_versions` rows (`storageKey`, `checksumSha256`, `scanStatus`, `state`, `supersededByVersionId`).
Progress rows pin the version they were completed against. Objects live in a private bucket and are
streamed via 15‑minute signed URLs.

**Consequences.** (+) Real audit evidence, tamper detection via checksum, safe deletion of drafts,
straightforward "superseded" banner. (−) Slightly more complex UI and one extra join on the
material page.

---

## ADR‑0003 — Server Actions over REST endpoints

**Status:** accepted · **Date:** 2026‑01

**Context.** v1 sketched a REST surface (`/api/categories`, `/api/materials`, …). A bespoke REST
API for a first‑party UI duplicates authorisation logic, invites CSRF‑prone patterns, and doubles
the amount of code that must be security‑reviewed.

**Decision.** Mutations are Server Actions with guard → zod → transaction(logAudit) → revalidate.
Route Handlers exist only for webhooks, private file streaming, certificate verification and
`/api/health`.

**Consequences.** (+) End‑to‑end types, one authorisation choke point, smaller attack surface.
(−) Third‑party integrations (mobile app, LMS bridges) will later need a deliberate API layer —
deferred until there is a consumer, at which point it must reuse the same capability functions.

---

## ADR‑0004 — Notification fan‑out via broadcast + read cursors

**Status:** accepted · **Date:** 2026‑01

**Context.** A national CRITICAL notice written per‑recipient would create ~60,000 rows per
broadcast and minutes of write latency.

**Decision.** Targeted audiences (`USER_IDS`) get `notification_recipients` rows; broad audiences
get one `notifications` row with an `audience` filter, resolved at read time against
`notification_read_cursors`.

**Consequences.** (+) O(1) broadcasts, cheap read inbox. (−) Inbox queries need an audience‑match
predicate and an index on `published_at`; unread counts for a user are eventually consistent with
deactivation.

---

## ADR‑0005 — Server‑side assessment scoring, item bank hidden

**Status:** accepted · **Date:** 2026‑01

**Context.** Training compliance depends on score integrity. Any client‑side scoring leaks the
answer key in the payload.

**Decision.** Attempts store answers only; scoring happens on the server in the same transaction
that writes the attempt; `correctIndex` is never selected into a client‑facing DTO. Overrides are
admin‑only, require a reason, and are audited.

**Consequences.** (+) Defensible CPD credits. (−) Instant feedback requires a round trip; item
bank edits invalidate in‑flight attempts, so items are versioned by soft‑deactivation.

---

## ADR‑0006 — Deactivate, never delete, user records

**Status:** accepted · **Date:** 2026‑01

**Context.** Deleting a user destroys completion and audit evidence and breaks the audit hash chain
referential story, while Act 843 still requires a path for erasure of personal data.

**Decision.** Deactivation revokes sessions, keeps training history, and nulls/anonymises PII
columns (`fullName` → "Former GHS staff", email → hashed tombstone, phone → null). Discussion
authorship is preserved under the anonymised label.

**Consequences.** (+) Evidence and audit chain survive; erasure is satisfiable. (−) Unique email
constraints need a tombstone strategy; reporting must exclude deactivated users by default.
