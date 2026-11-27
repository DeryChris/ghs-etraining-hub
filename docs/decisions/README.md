# Architecture Decision Records

Any deviation from `docs/PRD.md` or `AGENTS.md` requires an ADR in this directory, reviewed in the
same pull request as the change it justifies. (The old in-app `/decisions` console was never shipped
with the product; this directory is the record.)

Format: `ADR-NNN — Title`, then **Status** (proposed | accepted | superseded by ADR-NNN),
**Context**, **Decision**, **Consequences** (positive and negative), **Date**. This is a historical
decision log: later accepted ADRs can supersede earlier choices. For the current product baseline,
see [`docs/PRD.md`](../PRD.md) and the running implementation.

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
At the time this ADR was recorded, Route Handlers also covered certificate verification; that
public route was later removed by ADR‑0026. Current handlers serve webhooks, private file streaming
and `/api/health`.

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

---

## ADR‑0007 — CSP and security headers

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0007-csp-and-headers.md`](./0007-csp-and-headers.md)

**Decision.** Harden the header set (CSP with `object-src`/`base-uri`/`frame-ancestors`/`form-action`
locked down, COOP/CORP, Permissions-Policy), narrow `img-src` to the real allowlist, self-host the
typeface, and keep `script-src 'unsafe-inline'` until a per-request nonce migration lands. Follows
ADR‑0006 (staff are deactivated, never deleted), which lets the audit chain rely on an immutable
actor id.

---

## ADR‑0008 — Signed upload slots and the two‑person publish rule

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0008-signed-uploads-and-two-person-publish.md`](./0008-signed-uploads-and-two-person-publish.md)

**Decision.** Files go straight from the browser to Supabase Storage through server‑minted signed
upload slots (body limits make proxying impossible), and publishing a version requires a colleague
who did not upload it to approve it first, with an audited `SYSTEM_ADMIN` override as the only escape
hatch.

---

## ADR‑0009 — Rename to GHS Training Library, official emblem, one name source

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0009-training-library-rename.md`](./0009-training-library-rename.md)

**Decision.** The name has three forms — `GHS-TL`, `GHS Training Library`, `Ghana Health Service Training
Library` — declared once in `src/lib/site.ts` and read by every page, metadata block, seeder and script. The
official GHS emblem replaces the invented mark, in both supplied tone variants, with the theme switch done
in CSS. `vercel.json` stops referencing `@secret` values so a fresh project can build; variables live in the
project settings.

---

## ADR‑0010 — Role‑aware navigation, and the administration surfaces behind it

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0010-role-aware-navigation-and-administration.md`](./0010-role-aware-navigation-and-administration.md)

**Decision.** The signed-in menu becomes pure, unit‑tested data (`src/lib/nav.ts`) with a role on every item,
so the menu and `requireRole` cannot disagree. It was backed by four surfaces — `/assessments`,
`/insights`, `/users` (directory CRUD) and `/settings`; `/assessments` was later retired by ADR‑0026.
The directory invariants (no self‑demotion, last administrator protected) are enforced on the server
and audited.

---

## ADR‑0014 — One taxonomy: programme fields and areas replace directorates and spaces

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0014-programme-areas-replace-directorates.md`](./0014-programme-areas-replace-directorates.md)

**Decision.** `categories`, `spaces` and `category_facilitators` were dropped; Programme Areas and
Programme Fields became the only taxonomy. In the legacy schema, `programme_fields` stores parent
Programme Areas and `programme_areas` stores child Programme Fields. Materials are filed against the
child row (`materials.programme_area_id`); cohort targeting lives on that child, while the parent
row retains the restricted-area flag. Facilitator scope may be granted to a parent through
`field_facilitators` or to a child through `area_facilitators`; a parent grant covers its child
Programme Fields. The signed-in catalogue is `/catalogue`. Later, separate anonymous Programme Area
→ Programme Field browsing was added at `/programmes`; it does not replace `/catalogue`. The original
Sessions surface was retired and the Trainings register was introduced by ADR‑0013. Migration `0005`
maps every legacy space to the corresponding taxonomy row and preserves a JSON snapshot in
`legacy_taxonomy_backup`.

## ADR‑0013 — The Trainings register, and two surfaces for reference data

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0013-trainings-register-and-reference-data.md`](./0013-trainings-register-and-reference-data.md)

**Decision.** "Programmes" in the Learn section becomes **Trainings** (`/trainings`) for every role: the
register of trainings planned and run, with an enriched filter bar, counters and a "New training"
form (title, year, programme field, programme area, target group, region → district → sub‑district →
facility, start/end date, duration, venue). Programme fields and their areas become new reference
tables seeded from the GHS document, administered at `/programme-fields`; the region → facility tree
gets `/geography`. `training_sessions` becomes the register (nullable `categoryId`, new plan
columns), capabilities split into `session.create`, `training.manage`, `taxonomy.manage` and
`geography.manage`, and the sidebar is GHS green in both themes.

## ADR‑0011 — The library is informational: retire CPD awards, keep issued certificates

**Status:** accepted · **Partially superseded by:** ADR‑0026 · **Date:** 2026‑11 · **Detail:** [`0011-informational-library-retires-cpd.md`](./0011-informational-library-retires-cpd.md)

**Original decision.** Retire CPD points and cycles. The initial decision retained existing
certificates and `/verify`, then ADR‑0026 superseded that retention: the certificates table and
public verification surface were removed. Current product behavior has no certificate issuance or
verification. The activity surface was simplified to opens and downloads by ADR‑0026 and ADR‑0028.

---

## ADR‑0012 — A training is a session; traffic is measured per programme

**Status:** accepted · **Date:** 2026‑11 · **Detail:** [`0012-sessions-geography-and-traffic.md`](./0012-sessions-geography-and-traffic.md)

**Decision.** `training_sessions` records a dated training under a programme, at region → district →
sub‑district → facility (Upper West seeded, CHPS excluded, programme taxonomy left to a later client
upload). Traffic is open‑counts (`material_views`, one row per person per day, fire‑and‑forget beacon that
honours DNT) plus downloads from the existing audit trail, drawn as server‑rendered SVG charts on `/insights`.

---

## ADR‑0016 — Files do not wait for a bucket

**Status:** accepted · **Date:** 2026‑11‑17 · **Detail:** [`0016-files-without-a-bucket.md`](./0016-files-without-a-bucket.md)

**Decision.** When no S3-compatible bucket is configured, uploads are stored in Postgres (`file_blobs`)
and served through signed links, so the app works on a bare Neon + Vercel deployment. The ceiling is the
platform's request body limit (~4.5 MB), not Postgres. Configure a bucket and the same interface returns
to direct browser-to-bucket uploads with the 250 MB family limits.

---

## ADR‑0017 — One library door

**Status:** accepted · **Date:** 2026‑11

The Library tab and the catalogue were two doors to the same material. There is now one: the tab is
called **Library**, its route is `/catalogue`, and search happens on it. `/library` redirects. See
`0017-one-library-door.md`, which also carries ADR‑0018 (unit head as a role choice) and ADR‑0019
(employee numbers are digits).

---

## ADR‑0020 — Queues are derived, not assigned; forms keep what was typed

**Status:** accepted · **Date:** 2026‑11

Review access is computed from the assignments that exist when the queue is read,
so a unit head appointed today inherits everything already waiting in their
fields; arrivals and appointments notify; queue pages refresh themselves; and
every form keeps its values across a failed submission or a reload. See
`0020-live-queues-and-kept-drafts.md`.

---

## ADR‑0021 — The library is a reading surface

**Status:** accepted · **Date:** 2026‑11

A training opened from the library opens read-only — no uploads, no editing, the
same page a learner sees; the register keeps the management surfaces. Tiles are
one link over the whole card, painted above the content. See
`0021-library-is-a-reading-surface.md`.

---

## ADR‑0022 — Short forms, visible answers, and reading in place

**Status:** accepted · **Date:** 2026‑11

Long forms are stepped (all panels stay mounted so nothing is lost), every submit
answers next to the button, a training opened from the library opens in an overlay
over the catalogue, overlays keep a fixed title and a properly scrolling body,
destructive geography actions are confirmed, and the role people read is **Staff**
(key stays `LEARNER`). See `0022-short-forms-and-reading-in-place.md`.

---

## ADR‑0023 — An attachment opens; only Download saves it

**Status:** accepted · **Date:** 2026‑11

Clicking a resource opens it in a wide overlay with a full-screen control; only
the overlay's Download button saves a file. `FilePreview` is the single renderer
for every format, the browser draws PDF/image/video/audio while the server reads
Word/PowerPoint/Excel/text, and attachments inside the library panel are compact
tiles instead of full-width rows. See
`0023-attachments-open-before-they-save.md`.

---

## ADR‑0024 — The file is drawn, not described

**Status:** accepted · **Date:** 2026‑11 · **Supersedes** the reading-view part of ADR‑0023

A .pptx is drawn slide by slide at the author's coordinates, a .docx as Word's own
pages, an .xlsx as a grid with its own widths, merges, fills and number formats,
and a PDF through the browser's own engine. The readers run in the browser and are
unit-tested; what cannot be drawn is stated. A wrong upload can be replaced from
the viewer it was discovered in. See `0024-the-file-is-drawn-not-described.md`.

---

## ADR‑0025 — Complaints about files, and menus that match the product

**Status:** accepted · **Date:** 2026‑11

"Wrong document uploaded" and "document cannot be opened" are their own complaint
types, and either one asks which training — stored with a copy of its title. The
complaint form becomes three steps with issue cards. One listbox replaces every
native `<select>` in the product, posting through a real hidden select so forms
submit exactly what they did before. See
`0025-complaints-about-files-and-menus-that-match.md`.

## ADR‑0026 — No marks, no certificates

Supersedes ADR‑0011's temporary retention of certificates and `/verify`: no
certificate table, awarding flow or public verification surface remains. The
assessment pages and question-bank tables are also gone. Reading activity is
limited to opens and downloads, with no marks, completion status or signature.
See `0026-no-marks-no-certificates.md`.

## ADR‑0027 — Two shells

A rail for the people who run the library, a top bar (and a bottom bar on a
phone) for the people who read it. "My activity" folds into the dashboard;
`/analytics` redirects there. See `0027-two-shells.md`.

## ADR‑0028 — No signature

The library stops asking anybody to certify that they have read a document. The
flag, the panel, the dashboard section, `material_progress`, `enrollments` and the
`enrollment.*` capabilities are gone; the record of what was opened, by whom and
when stays. Same release: one name per surface — the material area is the
**Library** (still `/catalogue`), the trainings area is **Trainings** (never "the
register"). See `0028-no-signature.md`.

## ADR‑0029 — One inbox, and work that comes back

Messages and complaints are one list with a chip on each thread and three
buttons above it (All / Messages / Complaints); `/complaints` redirects into it.
A training a unit head sends back is shown as **Returned for correction**, opens
as a task card at the top of the author's dashboard, and goes straight back to
that unit head when saved. See `0029-one-inbox-and-returned-work.md`.

## ADR‑0030 — Accounts are claimed, not created

`/register` verifies the employee number against the application's imported staff
directory, then allows an active, passwordless row to be claimed. Name, region,
district, facility and grade are read-only directory facts; the application does
not query HRIMS. See `0030-accounts-are-claimed.md`.
