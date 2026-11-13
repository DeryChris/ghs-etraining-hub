# GHS‑ELN Product Requirements Document — v2

**Status:** Approved for build · **Supersedes:** client PRD v1 (2026) · **Owner:** GHS Capacity
Development Directorate · **Implementation contract:** [`AGENTS.md`](../AGENTS.md)

> v1 described *content management* well but almost nothing about *learning outcomes*, *data
> protection*, *upload safety*, or *low‑bandwidth delivery*. v2 keeps everything that was right in
> v1 and closes those gaps. A change log is in §15.

---

## 1. Product summary

GHS‑ELN is the Ghana Health Service's national platform for continuous professional development
(CPD), clinical SOP dissemination and public‑health emergency training. It serves professional
staff in all 16 regions, on hospital networks and on personal mobile data, and it must produce
**evidence**: who was trained, on which protocol version, when, with what assessment score, and
what CPD credit was issued.

### 1.1 Success metrics (measured, not assumed)

| Metric | Baseline target (12 months post‑launch) |
| --- | --- |
| Active learners / registered staff | ≥ 65 % |
| Median time from SOP publication to 80 % facility coverage | ≤ 21 days |
| Mandatory training completion rate | ≥ 90 % |
| Critical‑priority material acknowledgement | ≥ 95 % within 14 days |
| Learner route LCP (throttled 3G) | ≤ 2.5 s |
| Support tickets per 1,000 users per month | ≤ 5 |
| Certified completions with valid CPD credit | ≥ 40,000 |

### 1.2 Non‑goals (v2)

* Not a Learning Record Store / SCORM player (integration via xAPI export is a v3 candidate).
* Not an HR system of record: staff identity is mirrored, not mastered, here.
* Not a public website: all content is behind authentication; nothing is crawlable.
* No clinical decision support, no patient records, no treatment advice — training material only.

---

## 2. Personas & primary journeys

| Persona | Context | Primary jobs |
| --- | --- | --- |
| **Abena**, Nurse‑Midwife, Eastern Region | Phone‑only, 2–3 GB monthly data cap, night shifts | Download SOP for offline, prove completion to supervisor, ask a facilitator a question |
| **Kwesi**, Medical Officer, Greater Accra | Laptop + hospital Wi‑Fi | Track mandatory training, claim CPD credit, take a timed refresher |
| **Dr. Mensah**, Regional Facilitator (PH‑Directorate) | Desktop, content owner | Upload a new SOP version, request review, answer discussions, see regional coverage |
| **Adjoa**, Learning Secretariat Admin | Desktop, national oversight | Provision accounts, assign facilitators, broadcast critical notices, inspect the audit trail |
| **Yaw**, Regional IT Officer | Desktop | Verify a staff member's completion certificate by PIN |

**Journey that must never break (happy path #1):** Abena opens `/dashboard` on 3G → sees two
mandatory modules (amber "due in 4 days") → downloads the PDF for offline → returns online, takes
a 10‑question assessment, scores 80 % → certificate issued, CPD credit recorded, facilitator sees
her facility's coverage move.

---

## 3. Information architecture

```
/                              → redirect by role (learner | facilitator | admin)
/dashboard                     → role-aware home (mandatory, in progress, announcements)
/directorates                  → all categories (facilitator-annoted "yours" badge)
/directorates/[category]       → spaces in a directorate
/directorates/[category]/[space] → materials, discussion, labs, progress
/learn/[material]              → viewer: PDF / video / lab / assessment + acknowledge button
/library                       → searchable, filterable index of all published materials
/messages                      → 1:1 direct messaging (moderated, notify-on-mention off by default)
/notifications                 → notification centre with per-type read cursors
/analytics                     → personal CPD record; facilitator: cohort coverage; admin: national
/profile                       → self-service profile (name, phone, facility, password)
/facilitator                   → assigned categories, content pipeline, review queue
/admin/users                   → roster, roles, activation, bulk import, password reset
/admin/categories              → directorates, spaces, facilitator assignment
/admin/announcements           → broadcast centre (priority, audience, window)
/admin/audit-logs              → immutable audit inspection (filtered, CSV export, itself audited)
/login, /forgot-password       → public
```

Navigation is **capability‑driven**, not role‑string driven: a menu item appears only if
`can(session, "…")` is true, and the same check protects the route behind it.

---

## 4. Roles & permissions

Roles: `SYSTEM_ADMIN`, `FACILITATOR`, `LEARNER`. See **`docs/rbac.md`** for the full machine‑readable
matrix, including object‑level scope (facilitators are scoped to assigned categories; regional
facilitators to their region). The rules that most often bite:

* Facilitator capabilities are **per assigned category**, and a space inherits its category's scope.
* Learners can read published material in *any* category unless the space is marked restricted to
  an audience (region/directorate/facility/cadre).
* No role, including admin, may read another user's direct messages except through a documented,
  audited abuse‑investigation workflow approved by the Data Protection Officer.
* Deactivating a user revokes sessions immediately and anonymises their discussion display name to
  "Former GHS staff" while preserving completion and audit history.

---

## 5. Functional requirements

### 5.1 Identity & onboarding (new in v2)
Invite‑only: an admin or the secretariat bulk‑imports a roster (CSV: staff PIN, name, email, phone,
directorate, region, facility, cadre). PINs are validated against the format `GHS-\d{6}` and
de‑duplicated; a mismatch row is reported back to the importer, not silently dropped. First login
forces password set + phone verification. Password policy: ≥ 12 chars, checked against a breach
list, no forced rotation. `SYSTEM_ADMIN` accounts require MFA (TOTP). Login is rate limited
(5 attempts / 15 min / account+IP) with exponential lockout and an audit event.

### 5.2 Content model & lifecycle (new in v2)
`Category → Space → Material → MaterialVersion`. Every upload creates a new **immutable version**;
publishing requires a second pair of eyes (a reviewer ≠ author) for clinical categories, and
material can be scheduled. States: `DRAFT → IN_REVIEW → PUBLISHED → SUPERSEDED | ARCHIVED`.
Learners only ever see `PUBLISHED`; facilitators see the pipeline; the audit trail records who
published what and when. Superseded versions remain readable for 7 years with an "out of date"
banner.

### 5.3 Media pipeline (new in v2)
Allowlist: `application/pdf`, `video/mp4`, `image/png|jpeg|webp`, `text/markdown`, plus lab JSON.
Caps: PDF 15 MB, video 250 MB, image 5 MB. Enforce magic‑byte sniffing, not just the declared
MIME type; normalise filenames (`kebab-case`, no unicode, no path segments); scan for malware
before the version can be published; store objects in a **private** bucket and stream via 15‑minute
signed URLs with `Content-Disposition` set and range support for video. Progress‑aware upload UI
with resumable chunks for video on flaky connections.

### 5.4 Learning loop (new in v2)
* **Enrollment**: self‑enroll (open spaces) or assigned (mandatory / cohort / region‑wide) with a
  due date and a reminder cadence.
* **Progress**: per material — `NOT_STARTED | IN_PROGRESS | COMPLETED`; auto‑advance for videos at
  90 % watched, manual completion for documents with an explicit "I have read and understood this
  SOP" acknowledgement (critical‑priority materials *require* acknowledgement, timestamped, and the
  acknowledgement is auditable).
* **Assessment**: item bank per material; n questions drawn at random with shuffled options;
  pass mark configurable (default 80 %); attempts (default 3) with a cooldown (default 24 h);
  server‑side scoring only — the client never receives the answer key; timer optional; results
  audited; manual score override is admin‑only and audited with a reason.
* **Certification**: on completion, issue a verifiable certificate (unique code
  `GHS-CPD-<year>-<base32>`, PDF export, QR/link to a public verification endpoint that reveals
  only name, PIN (masked), title, issue date, credit hours — no other PII).
* **Recertification**: cycles (e.g. IPC annually, cold chain every 2 years) with automated
  "expiring in 60 days" reminders and lapse reporting to the regional facilitator.

### 5.5 Discussion
Threaded comments per material, unlimited depth but rendered to depth 2 then collapsed. Content is
sanitised and rendered as plain text/markdown subset; links are `rel="nofollow noopener"` with an
external‑link affordance. Edit window 15 minutes; delete soft‑only. Moderation: facilitator remove
+ reason (audited), report‑abuse button, and a per‑user mute. No attachments in comments — link to
a material instead (stops the platform becoming a file‑sharing free‑for‑all).

### 5.6 Direct messaging
1:1 only (no group chat in v2). Recipient picker limited by capability. Unread counts, mark‑read,
opt‑out of message notifications per user, abuse reporting, retention 2 years then purge. Delivery
is realtime where available, polling otherwise; authoritative state always from the database.

### 5.7 Notifications
Types: `SYSTEM_MAINTENANCE`, `MATERIAL_UPDATE`, `SPACE_ANNOUNCEMENT`, `COMMENT_REPLY`,
`DIRECT_MESSAGE`, `ASSIGNMENT_DUE`, `CERTIFICATE_ISSUED`, `RECERTIFICATION_DUE`. Priority:
`LOW | MEDIUM | HIGH | CRITICAL`. **CRITICAL** banners are dismissible‑only‑after‑read and are the
only notifications allowed to send SMS/e‑mail fallbacks. Fan‑out strategy: targeted audiences get
recipient rows; platform‑wide notices get one broadcast row + per‑user read cursor (so a national
broadcast never becomes 60,000 writes).

### 5.8 Analytics
* Learner: completed modules, CPD credits earned, expiring certifications, time spent.
* Facilitator: cohort coverage (by region/facility/cadre), assessment score distribution,
  drop‑off point, discussion volume, overdue lists exportable as CSV.
* Admin: national coverage heat map, time‑to‑coverage, activation funnel, content staleness.
* Every export is streamed, paginated, audited (`EXPORT_ANALYTICS`), and PII‑minimised by default.

### 5.9 Offline & low‑bandwidth behaviours (new in v2)
Server‑rendered HTML, no client data fetching for first paint, PDF/MP4 download affordances with
size shown *before* download, a "data saver" preference (default on) that requests 360p video and
defers charts, and a service worker caching the last‑visited material list for offline reading.

---

## 6. Non‑functional requirements

| Area | Requirement |
| --- | --- |
| Performance | LCP ≤ 2.5 s and INP ≤ 200 ms on throttled 3G (mid‑tier Android). Learner route JS ≤ 200 KB gzip. |
| Scale | 60,000 staff, 5,000 concurrent on a training day, 20,000 materials, 2 M audit rows/year. |
| Availability | 99.5 % monthly; maintenance banners 72 h ahead; read‑only degradation beats full outage. |
| Security | OWASP ASVS L2; CSP without `unsafe-eval`; strict security headers; signed, httpOnly, sameSite cookies; CSRF tokens on state‑changing forms; no secrets in client bundles. |
| Privacy | Ghana Data Protection Act 2012 (Act 843): lawful basis recorded, PII inventory maintained, SAR/erasure workflow, 7‑year audit retention, DPIA on file before launch, data hosted in‑region unless approved. |
| Accessibility | WCAG 2.2 AA; keyboard‑complete flows; screen‑reader tested with NVDA + TalkBack; no colour‑only signalling. |
| Compatibility | Last 2 versions of Chrome/Edge/Firefox/Safari; Android 8+; iOS 15+. |
| Observability | `/api/health` returns DB + dependency status; error events carry correlation ids; p95 latency and error rate alerting. |
| Backup/DR | PITR, nightly logical backup, quarterly restore drill documented with the last drill date. |
| i18n | English first; strings externalised so Twi/Ewe/Ga/Dagbani/Hausa glossaries can be added without refactors; dates/numbers via `Intl`. |

---

## 7. Data model summary

Full column‑level detail in [`docs/data-model.md`](data-model.md). Beyond the v1 tables, v2 adds:

`Enrollment` (learner × space, due date, source `SELF|ASSIGNED`, assignedBy),
`MaterialProgress` (learner × material version, status, watchedPercent, acknowledgedAt),
`Assessment`, `AssessmentItem`, `AssessmentAttempt` (server‑scored),
`Certificate` (code, credits, issuedAt, verifiedAt),
`MaterialVersion` (immutable, storageKey, sizeBytes, mimeType, checksum, scanStatus, state,
publishedBy/At, supersededBy),
`ReviewAssignment` (reviewer, decision, comment),
`NotificationReadCursor`, `MessageReport`, `Session` (revocable), `RateLimitWindow`.

Removed/changed from v1: `Material.fileUrl` (replaced by `MaterialVersion.storageKey` — a public
URL on the row is an IDOR and a bucket‑leak waiting to happen); `AuditLog.user` becomes nullable
(`SYSTEM` events, e.g. scheduled publishing, have no actor).

---

## 8. Release plan (vertical slices)

Each phase ships something a user can do, and ends with the §10 gates green.

| Phase | Ships | Exit criteria |
| --- | --- | --- |
| **P0 Foundations** | Schema, session, RBAC skeleton, audit logger, design tokens, shell, health endpoint | `/api/health` ok; capability matrix tested; audit writes hash‑chained |
| **P1 Identity & roster** | Login, forced first‑login, profile, admin users, bulk import, lockout | Admin can import 500 rows; wrong PIN rejected with a readable report |
| **P2 Content** | Categories, spaces, upload pipeline, versioning, review, publish | New version published by reviewer ≠ author; superseded banner shows |
| **P3 Learning** | Enrollment, progress, acknowledgement, assessments, certificates, verification link | Certificate verifies publicly with masked PIN only |
| **P4 Social** | Discussions, messaging, notifications, moderation, abuse reports | Nested threads render; unread counts correct under polling and realtime |
| **P5 Insight** | Analytics per role, exports, national coverage | p95 analytics query < 800 ms; export streams 50k rows |
| **P6 Hardening** | Offline SW, data saver, a11y sweep, load test, DPIA sign‑off, DR drill | 3G smoke test passes; axe 0 critical; 5k concurrent users OK |

---

## 9. Acceptance criteria for "training evidence"

1. For any staff PIN, an admin can produce, in ≤ 3 clicks, a report of: modules completed, versions
   trained on, scores, attempts, certificates, CPD credits and pending mandatory items.
2. Every score or completion change has an audit row with actor, timestamp and diff.
3. A certificate code can be verified by a third party with no login, revealing no PII beyond name,
   masked PIN and credential details.
4. A superseded SOP still proves which version a staff member was trained on.

---

## 10. QA strategy

* **RBAC truth table**: table‑driven tests over every (role × action × scope) triple; CI fails if a
  capability exists without a test vector.
* **Boundary tests**: zod schemas exercised with valid, invalid and hostile payloads (oversize,
  control chars, unicode RTL, HTML injection, 10 MB string).
* **E2E**: Playwright per role — learner happy path, facilitator publish path, admin audit export.
* **A11y**: `@axe-core/playwright` assertions on every page; manual NVDA pass on the learner viewer.
* **Load**: k6 script at 5,000 concurrent learners hitting `/dashboard` and a PDF stream; assert no
  connection exhaustion (pool sizing documented in `docs/architecture.md`).
* **Manual QA scripts** in `docs/qa.md`, written as checklists a non‑engineer can execute.

---

## 11. Open questions (tracked, must be answered before the phase that needs them)

1. Official GHS visual identity assets (crest, colours) and the approved wordmark usage rules.
2. Does the secretariat want regional admin accounts (a fourth, scoped role) in v2 or v3?
3. SMS gateway provider and budget for CRITICAL fallbacks.
4. CPD credit equivalence table per module — who owns and approves it?
5. Whether item banks must be versioned like materials (assumed yes in the schema).

---

## 12. Glossary

See §3 of `AGENTS.md` (single source of truth, mirrored nowhere else).

---

## 13. Environment variables

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | server | Pooled connection string (sandbox: local Postgres) |
| `DIRECT_URL` | server, migrations only | Direct connection for `drizzle-kit` |
| `SESSION_SECRET` | server | 32+ bytes, rotates quarterly; signs the session cookie |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | server | Adapter inputs; **never** `NEXT_PUBLIC_` |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Storage/auth admin; must never reach the browser |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | seed only | Seeder refuses to run in production without `ALLOW_PROD_SEED=true` |
| `NEXT_PUBLIC_APP_URL` | client | Absolute link generation for certificates |

---

## 14. Out‑of‑scope dependencies to confirm

Certificate PDF rendering library, video transcoding service, SMS gateway, malware scanning
service, and error monitoring (Sentry) are integration points, not build items — each needs an
owner and a budget line before its phase starts.

---

## 15. Change log v1 → v2

| # | Change | Why |
| --- | --- | --- |
| 1 | Prisma → Drizzle ORM | This repo's runtime, edge portability, TS‑native schema, no client codegen binary |
| 2 | Added enrollment, progress, assessments, certificates, recertification | v1 had content but no learning outcome or evidence |
| 3 | Added material versioning + approval workflow + 7‑year retention | Clinical content cannot be self‑published or silently overwritten |
| 4 | Replaced `Material.fileUrl` with private‑bucket `MaterialVersion.storageKey` + signed URLs | Prevents IDOR / public‑bucket leakage |
| 5 | Added upload safety (MIME sniffing, caps, malware scan, filename normalisation) | Unscanned clinical content is a risk to staff and patients |
| 6 | Added invite‑only onboarding, MFA for admins, lockout, login rate limiting | Public self‑signup cannot be reconciled with a verified GHS roster |
| 7 | Added Data Protection Act 2012 (Act 843) obligations, SAR/erasure, DPIA, PII inventory | Legal requirement for processing staff data in Ghana |
| 8 | Added low‑bandwidth budgets, offline download, data saver, pagination rules | Real network conditions for field staff |
| 9 | Notification fan‑out via broadcast + read cursors | Per‑recipient inserts do not scale to a national broadcast |
| 10 | Removed `unsafe-eval` from production CSP; Monaco via worker + nonce | Keeps the CSP meaningful while still shipping interactive labs |
| 11 | Added success metrics, phase exit criteria, QA strategy, open questions | Turns a spec into something buildable and verifiable |
| 12 | Added analytics/observability/DR requirements | Operational readiness, not just features |
