Build this as production software, not a prototype.

1. Use Superpowers to clarify requirements and write acceptance criteria.
2. Inspect the existing architecture before changing code.
3. Use Context7 for every framework and library decision.
4. Establish the design system before implementing UI.
5. Include loading, empty, error, offline and permission states.
6. Run linting, type checking, unit tests and integration tests.
7. Use Playwright to test all critical flows at 390px, 768px and 1440px.
8. Run accessibility, security and performance audits.
9. Review the final diff using a separate reviewer agent.
10. Do not claim completion while tests, console errors or security findings remain.

# AGENTS.md ΓÇö Ghana Health Service Training Library (GHS-TL)

> **You are an autonomous engineering agent working on GHS-TL.**
> This file is your contract. It is *not* generic advice ΓÇö every rule below is scoped to this
> repository, this stack, this domain (Ghana Health Service continuous professional development)
> and this database. Read it fully before writing a single line of code. If a rule here conflicts
> with a blog post, a tutorial, or your prior training, **this file wins**.

---

## 0. Mission in one paragraph

GHS-TL (Ghana Health Service Training Library) is the **catalogue of record for GHS training
programmes**. Every directorate, programme and unit that runs training ΓÇö for medical officers,
nurses, midwives, pharmacists, laboratory technologists, records officers and administrators across
**all 16 administrative regions** ΓÇö files that training's material here instead of leaving it in a
WhatsApp group. Content is organised as **Category (directorate / national programme) ΓåÆ Space
(specialised unit / module) ΓåÆ Material (document, video, interactive lab)** and every upload is a
numbered version that is reviewed by a second person before it reaches staff. Nothing is deleted:
material is archived, and the hashΓÇæchained audit trail records who uploaded, reviewed, published,
downloaded or withdrew it. Every design decision must survive three constraints: **findable
material, low bandwidth, and auditability**.

---

## 1. Two environments, one codebase (the portability contract)

| | **This sandbox / CI (authoritative for building)** | **Production target** |
| --- | --- | --- |
| Runtime | Next.js 16 App Router, React 19, Node 22 | Vercel (serverless + edge) |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, no `tailwind.config.*`) | same |
| Database | Local PostgreSQL (`127.0.0.1:5432/app_db`) | Supabase PostgreSQL |
| ORM / access | **Drizzle ORM (`drizzle-orm` + `pg`)**, `src/db/index.ts` singleton | same, pooled URL |
| Auth | Cookie session via `src/lib/server/session.ts` (stubΓÇæable) | Supabase Auth (`@supabase/ssr`) |
| Files | `public/uploads/**` local disk (dev only) | Supabase Storage signed URLs |

**Hard rules**

1. **Drizzle is the ORM. Do not introduce Prisma.** The incoming PRD (v1) specified Prisma; the
   engineering decision record [ADRΓÇæ0001](docs/decisions/README.md) supersedes it. Drizzle is
   edgeΓÇæfriendly, has no generated client binary, and its schema lives in TypeScript next to the
   app so typecheck fails fast. If you find `prisma/*` in the repo, delete it.
2. **Never call Supabase SDKs directly from a component.** Wrap every provider behind an interface
   in `src/lib/server/*` (`storage.ts`, `auth-adapter.ts`) so the sandbox runs with local
   implementations and production swaps the adapter through one env check. Provider code must be
   reachable from **one** file.
3. **All data access goes through `src/lib/queries/**` or Server Actions.** A component (server or
   client) must never build SQL, never import `db`, never read `process.env.DATABASE_URL`.
4. Anything importing `db` lives under `src/lib/server/**`, `src/app/api/**` or a Server Action, and
   starts with `import "server-only";` where it is a shared module.
5. `DATABASE_URL` in this sandbox is `postgresql://postgres:postgres@127.0.0.1:5432/app_db`.
   Never commit real credentials; use `.env.example` for shape only.

---

## 2. NonΓÇænegotiables (the "golden rules")

Breaking any of these is a build failure, even if `npm run build` passes.

1. **AuthΓÇædeny by default.** Every Server Action and mutating Route Handler begins with a guard
   from `src/lib/server/rbac.ts`. If you write a mutation without `requireCapability(...)`, the PR
   is rejected.
2. **Role Γëá permission.** Never check `user.role === "FACILITATOR"` inline. Use the capability
   matrix in `src/lib/rbac/capabilities.ts` (`can(user, "material.create", ctx)`). ObjectΓÇælevel
   scope (a facilitator may only touch *their assigned categories*) is part of the check, not an
   afterthought.
3. **Every mutation writes an audit row.** Use `logAudit()` from `src/lib/server/audit.ts` ΓÇö same
   transaction as the mutation, not a fireΓÇæandΓÇæforget. Event names follow ┬º7.
4. **PII is minimal and never logged.** `ghsStaffId`, `email`, `phone`, `fullName` are PII under
   Ghana's **Data Protection Act, 2012 (Act 843)**. Audit `metadata` must never contain raw PII or
   full request bodies ΓÇö store ids and diffs of nonΓÇæPII columns only.
5. **Client bundles stay thin.** No `db`, no secrets, no markdown files > 100 KB, no date library
   other than `Intl` + the helpers in `src/lib/format.ts`. Target < 200 KB gzip JS per route.
6. **BandwidthΓÇæfirst UI.** ServerΓÇærender content, paginate every list (> 25 rows), lazyΓÇæload heavy
   viewers (`pdf-viewer`, `lab-environment`) behind `next/dynamic` + a user gesture, always offer a
   "download for offline" path, and never autoplay video.
7. **TypeScript strict, no escape hatches.** `any` is banned (`eslint` rule `@typescript-eslint/no-explicit-any`
   as error), `as` casts are banned except in the two sanctioned spots in `src/lib/server/supabase.ts`.
   Validate all external input with `zod` at the boundary.
8. **Accessibility floor: WCAG 2.2 AA.** Semantic landmarks, visible focus rings (`focus-visible:ring-2
   focus-visible:ring-teal-400`), ΓëÑ 44 px hit areas, `aria-live` for async status, no colourΓÇæonly
   meaning, `prefers-reduced-motion` respected.
9. **Clinical content is never silently changed.** Materials are versioned; publishing a new version
   requires an approval step; superseded versions stay readable for 7 years (GHS records retention).
10. **Never fabricate domain data.** Region names, directorate names, CPD credit values and ICD/WHO
    references come from `src/lib/ghs-constants.ts` (16 real regions, real directorates). If you
    need a value that is not there, add it to that file with a source comment ΓÇö do not hardcode it
    in a component.

---

## 3. Domain glossary (use these words in code, UI and tests)

| Term | Meaning | Code representation |
| --- | --- | --- |
| Directorate | GHS division that owns training content (e.g. Public Health Directorate) | `Category` |
| National programme | Vertical programme (EPI/malaria/NTP) that also owns content | `Category` |
| Space | A specialised clinical unit / module inside a category | `Space` |
| Material | One versioned learning artefact (PDF, MP4, lab, quiz) | `Material` + `MaterialVersion` |
| Lab | Interactive browser exercise attached to a material | `LabEnvironment` |
| GHS Staff PIN | HR identifier, format `GHS-\d{6}` | `User.ghsStaffId` (unique, validated) |
| Region | One of Ghana's 16 administrative regions | `GHS_REGIONS` constant |
| Facility | Place of posting (e.g. Ridge Regional Hospital) | `User.facility` |
| CPD credit | Continuing professional development unit issued on completion | `Certificate.cpdCredits` |
| IPC | Infection Prevention & Control | sample category |
| Cold chain | Vaccine refrigeration logistics | sample space |

`src/lib/ghs-constants.ts` is the single source of truth and exports:
`GHS_REGIONS` (Ahafo, Ashanti, Bono, Bono East, Central, Eastern, Greater Accra, North East,
Northern, Oti, Savannah, Upper East, Upper West, Volta, Western, Western North), `GHS_DIRECTORATES`,
`PRIORITY_LEVELS`, `MIME_ALLOWLIST`, `MAX_UPLOAD_BYTES`, `CPD_CREDIT_TABLE`, `TIMEZONE = "Africa/Accra"`.

---

## 4. Repository map ΓÇö where things go

### 4.0 What exists today vs. what you will build

The learner-facing platform is live: sign-in (Supabase Auth), dashboard, directorates ΓåÆ
spaces ΓåÆ material viewer, library search with pagination, progress (start / acknowledge /
complete) with certificate issuance, personal CPD analytics, staff messaging, notifications,
public certificate verification, the marketing site, and the material authoring pipeline
(draft ΓåÆ signed upload ΓåÆ review ΓåÆ publish ΓåÆ supersede ΓåÆ archive, ADRΓÇæ0008). Schema, RLS
migration, CI and Drizzle migrations are versioned in this repository.

| Present and working | Not built yet (next milestones) |
| --- | --- |
| `src/app/(auth)/**`, `(dash)/**`, `(marketing)/**` | Remaining admin surfaces: create category/space, read the audit log |
| `(dash)/authoring/**`, `(dash)/review/**`, `(dash)/notices/**`, `(award)/certificates/**` ΓÇö draft, upload, review, publish, archive, targeted notices, printable award | Comments/discussion threads; assessments and grading; message reporting |
| `src/db/schema.ts` + `drizzle/**` migrations | Virus-scanning worker (versions sit at `scanStatus = PENDING`) |
| `src/lib/server/{session,rbac,audit,file-storage,authoring-queries,*-queries,rate-limit,certificates}.ts`, `src/lib/material-workflow.ts` | Category/space CRUD actions |
| Capability matrix, hash-chained audit, cohort visibility, CPD certificates, cohort-targeted notices | MFA enforcement, account lockout (needs an ICT policy decision) |
| `tests/e2e/**` (public + optional credentialled smoke), CI workflow | Per-request CSP nonce (see docs/decisions/0007) |

Do not re-implement what is here: extend it. When you add a mutation, follow the shape in ┬º6
and add its capability to the matrix with a test vector.

```
AGENTS.md                  # you are here ΓÇö the operating contract
docs/PRD.md                # product requirements (v2, supersedes the client's v1)
docs/architecture.md       # request lifecycle, rendering strategy, caching
docs/data-model.md         # every table, column, index, and why
docs/rbac.md               # the machine-readable capability matrix + test vectors
docs/ui-ux.md              # design tokens, components, copy tone, a11y
docs/conventions.md        # naming, commit, PR, error-handling conventions
docs/qa.md                 # verification gates and manual QA scripts
docs/migrations.md         # how schema changes ship (Drizzle + Supabase streams)
docs/decisions/**          # ADRs (identity/RLS/audit chain, CSP)
drizzle/**                 # generated, reviewed SQL migrations (versioned)
supabase/migrations/**     # raw SQL: RLS lock-down, grants
scripts/**                 # ops scripts (auth provisioning, audit-chain verification)
tests/e2e/**               # Playwright specs (public + credentialled smoke)
src/
  app/
    (auth)/                # /login, /forgot-password ΓÇö no shell, no session required
    (dash)/                # protected shell: /dashboard, /directorates, /messages, ...
    api/                   # route handlers ONLY for webhooks, file streaming, health
  components/
    ui/                    # primitives: button, badge, card, dialog, table, toast (forwardRef, no domain logic)
    layout/                # shell, sidebar, header, notification-center
    materials/             # pdf-viewer, video-player, discussion-thread, lab-environment
    analytics/             # recharts wrappers (client, dynamically imported)
  db/
    index.ts               # pooled Drizzle singleton (untouched)
    schema.ts              # ALL tables (snake_case names, camelCase TS fields)
    seed.ts                # idempotent seeder, run via `npm run db:seed`
  lib/
    server/                # server-only: session, rbac, audit, storage, queries, rate limits
    client/                # browser-only helpers (fetchers, optimistic stores)
    rbac/capabilities.ts   # shared (isomorphic) matrix ΓÇö safe to import from tests
    viewer.ts              # Viewer shape + isStaffRole(), used to scope content
    ghs-constants.ts       # domain truth
    format.ts              # dates (Intl, Africa/Accra), bytes, staff PIN masking
    utils.ts               # cn() and nothing else
```

**Placement tests (ask before creating a file)**

* Does it render JSX? ΓåÆ `src/components/**`.
* Does it touch `db`? ΓåÆ `src/lib/server/**`, and the filename must describe the capability
  (`learning-queries.ts`, not `helpers.ts`).
* Is it used by both server and client? ΓåÆ `src/lib/**` root, and it must not import `server-only`.
* Is it a constant a clinician would recognise? ΓåÆ `src/lib/ghs-constants.ts`.
* Is it a one-off script? ΓåÆ `scripts/` + an `npm run` alias, never `src/`.

---

## 5. Data layer rules (Drizzle, this repo)

```ts
// src/db/schema.ts ΓÇö the house style
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  ghsStaffId: varchar("ghs_staff_id", { length: 16 }).notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("LEARNER"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("users_region_role_idx").on(t.region, t.role)]);
```

* Table names `snake_case` plural; TS identifiers `camelCase` plural; enums `SCREAMING_SNAKE`;
  every FK gets an index; every table gets `createdAt` (+ `updatedAt` when mutable);
  timestamps are always `withTimezone: true`.
* SoftΓÇædelete only where audit retention requires it (`isArchived`, `deactivatedAt`). Never
  `DELETE` a row that has audit or completion history ΓÇö deactivate instead.
* Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, review the SQL in
  `drizzle/`, commit it, apply with `npm run db:migrate`. `drizzle-kit push` is a sandbox-only
  shortcut. Never edit an applied migration; add a new one. See docs/migrations.md.
* Queries: select explicit columns (no `select *` on wide tables), paginate with `limit/offset`
  plus a stable `orderBy`, batch with `inArray` instead of N+1, wrap multiΓÇæwrite flows in
  `db.transaction(...)`. Return **typed DTOs** from `src/lib/server/*-queries.ts` ΓÇö components
  consume DTOs, never table rows.
* Money is never a float; CPD credits are integers of tenths (`cpdCreditsx10`) or a `numeric(4,1)`.

---

## 6. Auth & RBAC implementation contract

**Session** (`src/lib/server/session.ts`): identity comes from **Supabase Auth** cookies
(`@supabase/ssr`), authority from `public.users`. `resolveAccount()` returns a discriminated
state (`anonymous | unprovisioned | inactive | active`) and `getSession()` returns `Session | null`
ΓÇö it never throws, so callers `redirect("/login")`. The session carries `region`, `directorate`
and `cadre` because content visibility depends on them. Never trust `user_metadata`: it is
user-writable, so role and scope are read from the database.

**The edge file is `src/proxy.ts`** (Next 16 renamed `middleware.ts` to `proxy.ts`). It refreshes
the session cookie and redirects anonymous visitors on protected paths ΓÇö a convenience layer.
It runs on the edge: no DB, no Node APIs.

**Middleware is a tripwire, not the gate.** Real authorisation happens in the Server Action /
Route Handler via `src/lib/server/rbac.ts`:

```ts
// Canonical mutation shape ΓÇö copy this skeleton
"use server";
export async function createSpace(input: unknown) {
  const session = await requireSession();                 // 1. who
  const dto = createSpaceSchema.parse(input);             // 2. what (zod)
  const category = await getCategory(dto.categoryId);     // 3. scope target
  assertCan(session, "space.create", { category });       // 4. may they? (throws)
  return db.transaction(async (tx) => {                   // 5. do + audit atomically
    const [space] = await insertSpace(tx, dto, session.sub);
    await logAudit(tx, { actor: session, action: "SPACE_CREATED", entity: "Space",
                         entityId: space.id, metadata: { categoryId: space.categoryId } });
    return space;
  });
}
```

* Fail **closed**: unknown capability ΓåÆ deny; missing scope object ΓåÆ deny; inactive user ΓåÆ deny.
* Return `notFound()` (404) when a learner must not learn a resource exists; return
  `forbidden()` (403) only when existence is already known (e.g. "you are not a facilitator of
  this directorate"). Never leak the existence of admin surfaces in a 404 message body.
* The capability matrix lives in `src/lib/rbac/capabilities.ts` as data, and `docs/rbac.md`
  documents it. Every change to the matrix requires a matching test vector in
  `src/lib/rbac/capabilities.test.ts`, which sweeps every action ├ù role so a new capability
  cannot ship unverified. Category-scoped facilitator actions are checked against
  `category_facilitators` inside `checkCapability()`, never trusted from the payload.

---

## 7. Audit trail contract

* API: `logAudit({ actor, action, entity, entityId, metadata }, tx)` ΓÇö pass the caller's
  transaction so the row commits or rolls back with the mutation. `ip`/`userAgent` are captured
  from headers inside the helper; do not pass or log them yourself.
* The actor's id is part of the hash, so `audit_logs.user_id` is `ON DELETE RESTRICT`: staff are
  deactivated, never deleted. Verify the chain with `npm run db:verify-chain` after a restore.
* Action taxonomy: `"<VERB>_<ENTITY>"` in `SCREAMING_SNAKE`, verbs limited to
  `CREATE | UPDATE | DELETE | ARCHIVE | RESTORE | PUBLISH | ASSIGN | UNASSIGN | LOGIN | LOGOUT |
  EXPORT | ROLE_CHANGE | APPROVE | REJECT`. Entities are PascalCase singular (`Material`, `User`).
* `metadata` is a JSONB **diff snapshot of nonΓÇæPII columns**:
  `{ before: { isPublished: false }, after: { isPublished: true }, changedBy: "SYSTEM_ADMIN" }`.
  Redact keys matching `/pass|token|secret|otp|phone|email|staffid/i`.
* Capture `ip` and `userAgent` from headers at the edge of the request only; store them, never
  log them to stdout.
* Audit rows are appendΓÇæonly: no update/delete endpoints exist, and the table is granted
  `INSERT`/`SELECT` only in production migrations. Include a `prevHash`/`hash` chain
  (`sha256(prevHash + canonicalJson)`), computed in `logAudit`, to make tampering detectable.
* Retention: 7 years, then archival export. Reading audit data is itself audited (`EXPORT_AUDIT_LOG`).

---

## 8. Rendering & interaction rules (frontend)

| Concern | Rule |
| --- | --- |
| Default | React Server Component + `async/await` data. Client components only for state, animation or browser APIs. |
| Marking client | `"use client"` at the top, and the component must be **leafΓÇæish**: keep data fetching in the parent server component. |
| Mutations | Server Actions, then `revalidatePath()` / `revalidateTag()`. Prefer `useActionState`/`useOptimistic` over handΓÇærolled `fetch` + `useEffect`. |
| Route Handlers | Only for: webhooks, file streaming/signed URLs, `GET /api/health`, and thirdΓÇæparty callbacks. Everything else is a Server Action. |
| Loading | `loading.tsx` with skeletons that match final layout (no spinnerΓÇæonly pages); stream slow panels with `<Suspense>`. |
| Empty states | Every list has one: what it is, why it's empty, the next action (e.g. "No materials yet ΓÇö ask your facilitator to publish the SOP"). |
| Errors | `error.tsx` per segment; log a redacted message serverΓÇæside; show a correlation id, never a stack trace. Form errors inline, fieldΓÇælevel, in plain English. |
| Animation | CSS transitions/keyframes first; Framer Motion only for layout morphs and page transitions (`duration <= 240ms`, `ease: [0.22, 1, 0.36, 1]`), disabled under `prefers-reduced-motion`. |
| Icons | `lucide-react` only, 16/20 px, `aria-hidden` when decorative. No emoji in the product UI (they are fine in seed data). |
| Dates | Always `formatDateTime()` from `src/lib/format.ts` ΓåÆ `Intl.DateTimeFormat("en-GH", { timeZone: "Africa/Accra" })`. Never `new Date().toString()` in UI. |
| Copy tone | Plain, warm, GhanaianΓÇæprofessional English. "Sign in with your GHS staff PIN". Sentence case. No "Oops!", no developer jargon, no fake urgency. |
| Colour semantics | Teal/Emerald = primary/positive; Amber = attention/overdue; Rose = critical/error; Slate = neutral. Priority chips never rely on colour alone ΓÇö they carry a label. |

Design tokens live in `src/app/globals.css` under `@theme` (Tailwind v4) ΓÇö do not handΓÇæcopy hex
values into components; use the token utilities (`bg-surface`, `text-ink-muted`, `border-hairline`).

---

## 9. Performance & data budgets (lowΓÇæbandwidth Ghana context)

* Route JS budget: **Γëñ 200 KB gzip** for learner routes. Check with `ANALYZE=1 npm run build`.
* Media: PDFs Γëñ 15 MB, MP4 Γëñ 250 MB, H.264 480p default with a 720p optΓÇæin; serve via signed URLs
  with a 15ΓÇæminute TTL; range requests enabled for video seeking.
* Images: `next/image` with explicit `sizes`, AVIF/WebP, `quality={70}` on photographic content.
* Never send a 60kΓÇærow table to the client. ServerΓÇæside paginate, filter, sort; expose CSV export
  through an audited streaming endpoint instead.
* Notifications: fan out with a single insert into `notification_recipients` **only for targeted
  audiences**; platformΓÇæwide notices use one broadcast row + a perΓÇæuser read cursor, so a
  broadcast to 60,000 staff stays one write.
* Realtime is an enhancement, never a source of truth: presence/typing via WebSocket, but the
  authoritative read comes from a revalidated query. Provide a 30ΓÇæsecond polling fallback.

---

## 10. Verification gates (must pass before you say "done")

```bash
npm exec tsc -- --noEmit               # zero errors
npm run lint                           # zero errors, zero warnings
npm test                               # unit tests (vitest)
npm run db:check                       # drizzle migration/snapshot consistency
npm run build                          # must be clean (hermetic: no font/CDN fetch)
npm run test:e2e:public                # Playwright, public surface
curl -s localhost:3000/api/health      # {"ok":true,"checks":{"db":"up"}}
npm run db:verify-chain                # audit hash chain intact (after restores)
```

CI runs the first five on every push (`.github/workflows/ci.yml`).

Additionally:

* Every new capability is covered by a tableΓÇædriven RBAC test (role ├ù action ├ù scope).
* Every Server Action has a validation test for its zod schema (valid, invalid, hostile input).
* No page ships without: loading skeleton, empty state, error boundary, a11y pass (tab order,
  labels, contrast), and a 3G throttled smoke check in the dev tools.
* `grep -rn "process.env" src/components src/app/\(dash\)` must return nothing that is not a
  `NEXT_PUBLIC_` variable.

---

## 11. Workflow for an agent working in this repo

1. **Orient.** `Read` AGENTS.md ΓåÆ `docs/PRD.md` ΓåÆ the relevant `docs/*.md`. Check the build board at
   `/build` (this repo's own console app) for the current phase and next unblocked task.
2. **Claim one task.** Small, vertical slices: schema + guard + action + UI + test + docs. Never
   "do the whole admin area" in one pass.
3. **Record the decision.** If you deviate from the PRD, add an ADR at `/decisions` in the console
   (or `docs/decisions/`) with context/decision/consequences. Undocumented deviation = bug.
4. **Verify** with ┬º10. If a gate fails, fix it before moving on ΓÇö do not leave `TODO` in place of a
   failing gate.
5. **Commit message convention:** `feat(space): publish flow with version bump` ΓÇö
   `type(scope): summary`, types `feat|fix|refactor|docs|test|chore|a11y|perf|sec`. Reference the
   task code, e.g. `(P4-T12)`.
6. **PR description template:** what changed, why, screenshots (dark UI), RBAC impact, audit events
   added, migration needed (y/n), bandwidth impact, how you verified ┬º10.
7. **Blocked?** Write the blocker as a note at `/notes` with severity `BLOCKER`, state your
   assumption, and continue with the leastΓÇæcoupled task. Never silently skip a requirement.

### Definition of Done (per task)
- [ ] Guarded by a capability check; test vectors added/updated
- [ ] Audit event emitted for every mutation
- [ ] zod schema + inline field errors; hostile input rejected
- [ ] Loading / empty / error states present
- [ ] Types exact; no `any`, no nonΓÇænull `!` on data you did not verify
- [ ] Docs updated (`docs/data-model.md` for schema, `docs/rbac.md` for matrix, `/build` status)
- [ ] All ┬º10 gates green

---

## 12. Skills, commands and plugins (use them, don't reinvent them)

Skills are **procedural playbooks** that live in `.claude/skills/<name>/SKILL.md`. Load the
matching skill before starting work in its area ΓÇö they contain the exact code idioms, checklists
and copy blocks that the PRD expects.

| Skill | Load whenΓÇª | Path |
| --- | --- | --- |
| `ghs-rbac-guard` | adding any mutation, route, nav item or server action | `.claude/skills/ghs-rbac-guard/SKILL.md` |
| `ghs-audit-trail` | adding a mutation, a new table, or anything with `role`/`isActive` | `.claude/skills/ghs-audit-trail/SKILL.md` |
| `ghs-content-lifecycle` | touching materials, versions, uploads, approvals, publish states | `.claude/skills/ghs-content-lifecycle/SKILL.md` |
| `ghs-bandwidth-first` | building learnerΓÇæfacing pages, viewers, media, charts | `.claude/skills/ghs-bandwidth-first/SKILL.md` |
| `ghs-verify-gate` | before declaring a task complete | `.claude/skills/ghs-verify-gate/SKILL.md` |

Slash commands (`.claude/commands/`):

* `/ghs-implement <task-code>` ΓÇö full verticalΓÇæslice workflow with gate checks.
* `/ghs-audit <area>` ΓÇö security/RBAC/audit sweep; produces a findings report with severities.
* `/ghs-review` ΓÇö self code review against ┬º2, ┬º6, ┬º8 and ┬º10.

Plugin manifest: `.claude/plugin/ghs-tl/plugin.json` wires the skills, commands and hooks above
into a single named plugin (`ghs-tl`) so a fresh agent session gets the whole toolchain at once.

Hooks defined in `.claude/settings.json` (all nonΓÇæblocking, `|| true` so they can never brick a
session): remind on session start, run typecheck + lint on stop, and block commits containing
`.env`, `service_role`, or `BEGIN PRIVATE KEY`.

---

## 13. AntiΓÇæpatterns that will get a change reverted

* Client component importing `@/db`, `drizzle-orm`, or anything from `src/lib/server/**`.
* `useEffect` + `fetch('/api/...')` where a Server Component or Server Action would do.
* Inline `role ===` checks, or a nav item rendered without a capability check.
* Mutations without `logAudit`, or audit writes *after* the transaction commits.
* `alert()`, `confirm()`, `console.log` in shipped code; `window.confirm` ΓåÆ `<Dialog>`.
* A spinnerΓÇæonly loading state, or a list with no empty state.
* New date/time formatting inline instead of `src/lib/format.ts`.
* Hardcoded region/directorate names, or sample data with real people's names.
* Adding a dependency without: (a) a oneΓÇæline justification in the PR, (b) < 40 KB gz, (c) a
  maintained React 19ΓÇæcompatible version.
* "Temporary" seeded admin credentials that work in production ΓÇö seed credentials must come from
  env (`SEED_ADMIN_EMAIL`) and the seeder must refuse to run when `NODE_ENV=production` unless
  `ALLOW_PROD_SEED=true`.

---

## 14. When the PRD and reality disagree

The client's PRD v1 is a good brief but it shipped **gaps**; `docs/PRD.md` is the superset v2 that
this repo implements. The material differences (all intentional, all recorded as ADRs) are:

1. **Prisma ΓåÆ Drizzle** (this repo's runtime and edge portability).
2. **Learning loop added**: enrollment/assignment, progress tracking, assessments with pass marks
   and attempts, certificates with CPD credits, recertification cycles, competency coverage per
   region. v1 had content but no learning outcome.
3. **Content lifecycle added**: draft ΓåÆ in review ΓåÆ published ΓåÆ superseded/archived, with a
   facilitatorΓÇæplusΓÇæreviewer approval step (clinical content cannot be selfΓÇæpublished), immutable
   version history and a 7ΓÇæyear retention path.
4. **Auth hardening added**: inviteΓÇæonly onboarding (no public selfΓÇæsignup), adminΓÇædriven password
   reset, MFA for `SYSTEM_ADMIN`, account lockout + login rate limiting, session rotation on role
   change, "deactivate, never delete" user lifecycle, and a bulk CSV roster import mapped to
   directorate/region/facility.
5. **Data protection added**: Ghana Data Protection Act 2012 (Act 843) obligations ΓÇö lawful basis,
   PII inventory, subject access/erasure workflow, 7ΓÇæyear audit retention, DPIA note, no
   crossΓÇæborder replication without approval.
6. **Upload safety added**: MIME allowlist + magicΓÇæbyte sniffing, size caps, filename
   normalisation, malwareΓÇæscan hook before publish, and private buckets with 15ΓÇæminute signed URLs
   (v1 had a bare `fileUrl` string, which invites IDOR and public buckets).
7. **Performance realism**: lowΓÇæbandwidth budgets, offline/download paths, pagination rules,
   notification fanΓÇæout strategy (v1's perΓÇærecipient inserts would melt on a national broadcast).
8. **Assessment integrity**: serverΓÇæside scoring only, attempt limits with cooldowns, item banks
   with shuffled options, timeΓÇæboxed quizzes, and audit of score overrides.
9. **Observability & ops**: health endpoint contract, structured error reporting with correlation
   ids, migration discipline (no `db push` in production), backup/restore drill, staging parity.
10. **Accessibility & localisation**: WCAG 2.2 AA floor, plainΓÇæEnglish clinical copy, screenΓÇæreader
    tested, and hooks for Ghanaian language glossaries (Twi, Ewe, Ga, Dagbani, Hausa).
11. **Testing strategy**: RBAC truth table, zod boundary tests, Playwright happy paths per role,
    axe a11y assertions, connectionΓÇæpool stress test.
12. **No `unsafe-eval` in production CSP**; Monaco runs from a worker with `worker-src blob:` and a
    nonceΓÇæbased script policy instead of weakening the whole site.

If you believe a rule here is wrong, propose the change as an ADR with evidence ΓÇö do not fork the
conventions inside your own files.

---

## 15. Quick reference

```bash
npm run dev           # local dev server
npm run build         # production build (must be clean)
npx drizzle-kit push  # apply the schema to the sandbox database (local only)
npx drizzle-kit generate  # emit reviewable migration SQL before committing a schema change
curl -s localhost:3000/api/health      # {"ok":true,"checks":{"db":"up",...}}
curl -s localhost:3000/api/progress    # board, blockers and last gate run
```

Seeding rule for this repository: the console seeds itself on first data access
(`ensureSeeded()` in `src/lib/server/queries.ts`), keyed on natural codes so it is
idempotent. When the GHS-TL application itself lands, replace that with a proper
`npm run db:seed` script that reads `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and
refuses to run when `NODE_ENV=production` unless `ALLOW_PROD_SEED=true`.

* Timezone everywhere: `Africa/Accra`. Locale: `en-GH`. Currency: `GHS` (rarely needed).
* Phone format: `+233XXXXXXXXX` (10ΓÇô12 chars, validated by zod, stored E.164).
* Staff PIN regex: `^GHS-\d{6}$`.
* The UI is **darkΓÇæfirst**: `Slate-950` canvas, `Teal-400/500` primary, `Emerald` success,
  `Amber` warning, `Rose` critical ΓÇö tokens in `src/app/globals.css`, never raw hex in components.
