# Architecture Decision Records

Any deviation from `docs/PRD.md` or `AGENTS.md` requires an ADR in this directory, reviewed in the
same pull request as the change it justifies. (The old in-app `/decisions` console was never shipped
with the product; this directory is the record.)

Format: `ADR-NNN ΓÇö Title`, then **Status** (proposed | accepted | superseded by ADR-NNN),
**Context**, **Decision**, **Consequences** (positive and negative), **Date**.

---

## ADRΓÇæ0001 ΓÇö Drizzle ORM instead of Prisma

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** The client's PRD v1 specified Prisma with Supabase. This repository's runtime is
Next.js 16 + local PostgreSQL, and the deployment target is Vercel serverless, where a generated
Prisma client binary, `directUrl`/pooledΓÇæURL juggling and engine downloads add build weight and
coldΓÇæstart cost. The repo already ships `drizzle-orm` + `pg` with a pooled singleton.

**Decision.** Use Drizzle ORM exclusively. Schema lives in `src/db/schema.ts`; migrations are
generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`; `drizzle-kit push` is
a localΓÇæonly convenience. No Prisma files may be committed.

**Consequences.** (+) One TypeScript source of truth, no codegen step, edgeΓÇæcompatible queries,
cheaper cold starts, `tsc` catches schema drift. (ΓêÆ) Drizzle has no migrationΓÇæstudio history view,
so migration SQL must be reviewed by hand; relational query helpers are less magical than
Prisma's, which means explicit joins (also a plus for reviewability).

---

## ADRΓÇæ0002 ΓÇö `MaterialVersion` replaces `Material.fileUrl`

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** v1 stored a single `fileUrl` string on the material row. That makes version history
impossible, invites public buckets, and gives no evidence of which version a staff member was
trained on.

**Decision.** Materials hold a `currentVersionId` pointer; bytes and metadata live in immutable
`material_versions` rows (`storageKey`, `checksumSha256`, `scanStatus`, `state`, `supersededByVersionId`).
Progress rows pin the version they were completed against. Objects live in a private bucket and are
streamed via 15ΓÇæminute signed URLs.

**Consequences.** (+) Real audit evidence, tamper detection via checksum, safe deletion of drafts,
straightforward "superseded" banner. (ΓêÆ) Slightly more complex UI and one extra join on the
material page.

---

## ADRΓÇæ0003 ΓÇö Server Actions over REST endpoints

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** v1 sketched a REST surface (`/api/categories`, `/api/materials`, ΓÇª). A bespoke REST
API for a firstΓÇæparty UI duplicates authorisation logic, invites CSRFΓÇæprone patterns, and doubles
the amount of code that must be securityΓÇæreviewed.

**Decision.** Mutations are Server Actions with guard ΓåÆ zod ΓåÆ transaction(logAudit) ΓåÆ revalidate.
Route Handlers exist only for webhooks, private file streaming, certificate verification and
`/api/health`.

**Consequences.** (+) EndΓÇætoΓÇæend types, one authorisation choke point, smaller attack surface.
(ΓêÆ) ThirdΓÇæparty integrations (mobile app, LMS bridges) will later need a deliberate API layer ΓÇö
deferred until there is a consumer, at which point it must reuse the same capability functions.

---

## ADRΓÇæ0004 ΓÇö Notification fanΓÇæout via broadcast + read cursors

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** A national CRITICAL notice written perΓÇærecipient would create ~60,000 rows per
broadcast and minutes of write latency.

**Decision.** Targeted audiences (`USER_IDS`) get `notification_recipients` rows; broad audiences
get one `notifications` row with an `audience` filter, resolved at read time against
`notification_read_cursors`.

**Consequences.** (+) O(1) broadcasts, cheap read inbox. (ΓêÆ) Inbox queries need an audienceΓÇæmatch
predicate and an index on `published_at`; unread counts for a user are eventually consistent with
deactivation.

---

## ADRΓÇæ0005 ΓÇö ServerΓÇæside assessment scoring, item bank hidden

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** Training compliance depends on score integrity. Any clientΓÇæside scoring leaks the
answer key in the payload.

**Decision.** Attempts store answers only; scoring happens on the server in the same transaction
that writes the attempt; `correctIndex` is never selected into a clientΓÇæfacing DTO. Overrides are
adminΓÇæonly, require a reason, and are audited.

**Consequences.** (+) Defensible CPD credits. (ΓêÆ) Instant feedback requires a round trip; item
bank edits invalidate inΓÇæflight attempts, so items are versioned by softΓÇædeactivation.

---

## ADRΓÇæ0006 ΓÇö Deactivate, never delete, user records

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ01

**Context.** Deleting a user destroys completion and audit evidence and breaks the audit hash chain
referential story, while Act 843 still requires a path for erasure of personal data.

**Decision.** Deactivation revokes sessions, keeps training history, and nulls/anonymises PII
columns (`fullName` ΓåÆ "Former GHS staff", email ΓåÆ hashed tombstone, phone ΓåÆ null). Discussion
authorship is preserved under the anonymised label.

**Consequences.** (+) Evidence and audit chain survive; erasure is satisfiable. (ΓêÆ) Unique email
constraints need a tombstone strategy; reporting must exclude deactivated users by default.

---

## ADRΓÇæ0007 ΓÇö CSP and security headers

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0007-csp-and-headers.md`](./0007-csp-and-headers.md)

**Decision.** Harden the header set (CSP with `object-src`/`base-uri`/`frame-ancestors`/`form-action`
locked down, COOP/CORP, Permissions-Policy), narrow `img-src` to the real allowlist, self-host the
typeface, and keep `script-src 'unsafe-inline'` until a per-request nonce migration lands. Follows
ADRΓÇæ0006 (staff are deactivated, never deleted), which lets the audit chain rely on an immutable
actor id.

---

## ADRΓÇæ0008 ΓÇö Signed upload slots and the twoΓÇæperson publish rule

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0008-signed-uploads-and-two-person-publish.md`](./0008-signed-uploads-and-two-person-publish.md)

**Decision.** Files go straight from the browser to Supabase Storage through serverΓÇæminted signed
upload slots (body limits make proxying impossible), and publishing a version requires a colleague
who did not upload it to approve it first, with an audited `SYSTEM_ADMIN` override as the only escape
hatch.

---

## ADRΓÇæ0009 ΓÇö Rename to GHS Training Library, official emblem, one name source

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0009-training-library-rename.md`](./0009-training-library-rename.md)

**Decision.** The name has three forms ΓÇö `GHS-TL`, `GHS Training Library`, `Ghana Health Service Training
Library` ΓÇö declared once in `src/lib/site.ts` and read by every page, metadata block, seeder and script. The
official GHS emblem replaces the invented mark, in both supplied tone variants, with the theme switch done
in CSS. `vercel.json` stops referencing `@secret` values so a fresh project can build; variables live in the
project settings.

---

## ADRΓÇæ0010 ΓÇö RoleΓÇæaware navigation, and the administration surfaces behind it

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0010-role-aware-navigation-and-administration.md`](./0010-role-aware-navigation-and-administration.md)

**Decision.** The signed-in menu becomes pure, unitΓÇætested data (`src/lib/nav.ts`) with a role on every item,
so the menu and `requireRole` cannot disagree. It is backed by four new surfaces ΓÇö `/assessments`,
`/insights`, `/users` (directory CRUD) and `/settings` ΓÇö each stating what it does not do yet, with the
directory invariants (no selfΓÇædemotion, last administrator protected) enforced on the server and audited.

---

## ADRΓÇæ0011 ΓÇö The library is informational: retire CPD awards, keep issued certificates

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0011-informational-library-retires-cpd.md`](./0011-informational-library-retires-cpd.md)

**Decision.** The service is an informational library: no CPD points, no cycle target, no certificate
awarded on completion. `My CPD` becomes `My activity` (what you opened, downloaded and finished). Every
alreadyΓÇæissued certificate row, the `/verify` check, the printable award and the frozen serial format stay
untouched ΓÇö certificates in people's hands must still check out.

---

## ADRΓÇæ0012 ΓÇö A training is a session; traffic is measured per programme

**Status:** accepted ┬╖ **Date:** 2026ΓÇæ11 ┬╖ **Detail:** [`0012-sessions-geography-and-traffic.md`](./0012-sessions-geography-and-traffic.md)

**Decision.** `training_sessions` records a dated training under a programme, at region ΓåÆ district ΓåÆ
subΓÇædistrict ΓåÆ facility (Upper West seeded, CHPS excluded, programme taxonomy left to a later client
upload). Traffic is openΓÇæcounts (`material_views`, one row per person per day, fireΓÇæandΓÇæforget beacon that
honours DNT) plus downloads from the existing audit trail, drawn as serverΓÇærendered SVG charts on `/insights`.

