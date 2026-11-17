# GHS-ELN — Repository Analysis

> **Renamed 17 November 2026.** The product is now the **Ghana Health Service Training Library
> (GHS-TL)**. Everything below was written when it was called GHS-ELN and is kept verbatim as the
> dated assessment; read "GHS-ELN" as GHS-TL.
>
> **Remediation status — 16 November 2026.** The findings below have been worked in priority
> order across eight commits; this document is kept as the original assessment so the reasoning is
> auditable. Status per item is recorded in §12.
>
> | Commit | Scope |
> | --- | --- |
> | `chore(platform)` | Dependency upgrades (production audit now clean), hermetic font, hardened headers, Vercel/env correctness, CI + Dependabot, real migration config |
> | `fix(data)` | Versioned Drizzle migrations, immutable audit actor, idempotent seeder, unique keys, missing indexes, MIME-correct downloads |
> | `feat(learning)` | Cohort/restricted visibility enforced everywhere, certificate issuance with random serials, rate limiting, DB-verified facilitator scope, capability test sweep |
> | `perf(ui)` | Library pagination, paginated threads, bounded inbox/transcript |
> | `fix(resilience)` | Public pages and certificate verification degrade instead of crashing when the database is unreachable |
> | `feat(authoring)` | Draft → signed upload → review → publish → supersede → archive, the two-person rule, and its ADR (0008) |
> | `fix(errors)` | One error vocabulary, request ids forwarded downstream and quoted by both error boundaries |
> | `feat(notices)` | Cohort-targeted notices (`audience_filter`), a staff composer, and truthful read cursors |
> | `feat(certificates)` | Printable award for the holder, serial column on the transcript, public page still masked |

**Repository:** `DeryChris/ghs-etraining-hub` · **Branch:** `arena/28c03ab6-ghs-etraining-hub` · **Commit:** `f717cb6 feat(platform): launch GHS-ELN learning experience` (single commit, no upstream history)
**Analysed:** 16 November 2026 · **Method:** full read of source + docs, dependency install, typecheck, lint, unit tests, production build attempt, `npm audit`, schema/query/mutation review.

---

## 1. Verdict

A **well-disciplined, unusually coherent Next.js 16 / React 19 / Drizzle / Supabase codebase** — clean layering, strict TypeScript, a real tamper-evident audit chain, and thoughtful accessibility. It is, however, **a polished learner-facing slice of a much larger product**: roughly a third of the documented scope (authoring, review/publish, assessments, certificates, admin, cohort targeting, rate limiting) exists only as tables and prose. It also carries **known-critical dependency vulnerabilities** and **several deployment/config inconsistencies that would break a real Vercel rollout**.

| Dimension | Grade | Note |
| --- | --- | --- |
| Architecture & layering | **A−** | Conventions from `AGENTS.md` are genuinely followed (no `db` in components, `server-only`, adapters, zod at boundary) |
| Type safety / lint | **A** | `tsc --noEmit` and `eslint` both clean, zero `any`, zero non-null assertions |
| Security design | **B** | Strong identity model, RBAC, audit + RLS migration; undermined by vulnerable deps, weak CSP, no rate limiting |
| Feature completeness | **C** | Learner read paths + progress + messaging shipped; most operational/admin surfaces absent |
| Testing | **D** | 17 unit tests on pure helpers; zero integration/E2E despite a Playwright config and QA contract |
| Operability | **D+** | No CI, no versioned schema migrations, no structured logs, no correlation IDs |
| Docs | **B−** | Excellent intent, but drifted from the code in ~8 specific places |

---

## 2. What the product is

A CPD (continuous professional development) and clinical-protocol learning portal for Ghana Health Service staff:

- **Taxonomy:** Category (directorate / national programme) → Space (unit / module) → Material (versioned PDF, video, lab, assessment link).
- **Domain truth** lives in `src/lib/ghs-constants.ts` (16 real regions, directorates, MIME allowlist, CPD credit table, `Africa/Accra`).
- **Roles:** `SYSTEM_ADMIN`, `FACILITATOR`, `LEARNER`; identity from Supabase Auth, authority from `public.users`.
- **Differentiators claimed:** hash-chained audit trail, versioned controlled documents, verifiable CPD certificates, low-bandwidth-first UI.

Stack: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 (`@theme` tokens, no config file), Drizzle ORM 0.36 + `postgres` driver, Supabase (Postgres/Auth/Storage), Vitest, Playwright. ~7,200 LOC across 137 tracked files.

---

## 3. Architecture as built

```
Browser
  └─ src/proxy.ts .................... edge gate (Next 16 "proxy" = middleware)
        Supabase session refresh, anonymous → /login?next=…, public allowlist
  └─ src/app/(marketing)/** .......... public site (layout resolves account → dynamic)
  └─ src/app/(auth)/** ............... login, forgot-password, reset-password (client)
  └─ src/app/(dash)/layout.tsx ....... server-side gate: resolveAccount() → AppShell
        pages → src/lib/server/*-queries.ts → Drizzle → typed DTOs
  └─ Server Actions .................. guard → zod → tx(mutation + logAudit) → revalidatePath
        learning.ts (start/acknowledge/complete), messages.ts (send/mark read),
        notifications.ts (mark all read), auth.ts (sign out)
  └─ Route Handlers .................. GET /api/health, GET /api/materials/[id]/file
                                        (session → signed URL 302 → audit)
```

**Strengths worth keeping:**

- **Identity ≠ authority is correct.** `resolveAccount()` reads Supabase Auth for *who*, then `public.users` for *role*; `user_metadata` is never trusted (`src/lib/server/session.ts`).
- **Double gate.** Proxy for cheap redirects; `(dash)/layout.tsx` + `requireSession()` re-check on the server, so protected HTML never renders for anonymous users.
- **Audit chain is real.** `src/lib/server/audit.ts` serialises writers with `pg_advisory_xact_lock`, reads the newest entry, monotonic timestamps, SHA-256 over `prevHash|actor|action|entity|entityId|metadata|createdAt`; `logAudit(input, tx)` commits/rolls back with the mutation. Metadata is PII-redacted (`src/lib/audit-hash.ts`).
- **Discipline that usually rots but hasn't:** 19 client components out of ~90 files, no `fetch()` anywhere in client code, no `db` import outside `src/lib/server/**` + actions, `escapeLike()` on ILIKE, `safeNextPath()` blocks `//host` and `/login` loops, `appOrigin()` defeats bind-host confusion, `safeAppLink()` validates notification URLs against a route allowlist.
- **Accessibility is designed, not retrofitted:** skip links, `aria-live` regions, `focus-visible` rings, ≥44 px targets, semantic landmarks, `inert` on the closed drawer, `MotionConfig reducedMotion="user"` plus a CSS `prefers-reduced-motion` block.
- **Data-access hygiene:** correlated subqueries built with `eq()/and()/exists()` rather than raw `sql` column references — a subtle bug class the codebase explicitly documents avoiding.

---

## 4. Implementation completeness

**Shipped (working code paths):** login/logout/password reset, dashboard, directorates → spaces → material viewer, library search, progress start/acknowledge/complete with version-change re-acknowledgement, enrol-on-progress, personal analytics/transcript, staff messaging (send, thread, read receipts), notifications (read-all), public certificate verification page, marketing site, health probe.

**Schema-only / not implemented** (verified by reference count outside `src/db/schema.ts`):

| Table / feature | Code references | Reality |
| --- | --- | --- |
| `assessments`, `assessment_items`, `assessment_attempts` | 0 | No quiz authoring, taking or grading |
| `certificates` | read-only | **Never inserted anywhere** — no issuance flow, so the "verify certificate" promise cannot be satisfied by the app |
| `comments` | 0 | No discussion threads |
| `category_facilitators` | 0 | Facilitator scope never resolved from the DB |
| `sessions` | 0 | Dead (Supabase owns sessions) |
| `rate_limit_windows` | 0 | No rate limiting anywhere |
| `failed_login_count`, `locked_until`, `mfa_enabled` | 0 | No lockout, no MFA enforcement (docs promise MFA in prod) |
| `message_reports`, `review_assignments` | 0 | No moderation / review workflow |
| `notifications.audience_filter`, `categories.is_restricted`, `spaces.audience_*` | 0 | **No cohort targeting and no restricted directorates** — every active user sees every published material |

**Also missing entirely:** any facilitator/admin UI (create category/space/material, upload a version, submit for review, publish, broadcast a notice, read the audit log, manage staff), a file-upload path (`createMaterialSignedUrl()` can only *read* from an externally populated bucket), a certificate PDF generator, a comments surface, and a `scripts/provision-auth-user.ts` referenced by the README.

**Net:** the product's *clinical-safety* claims (approval workflow, two-person publish rule, audience targeting, assessment integrity, certificate proof) are documented and data-modelled but **not enforced by shipped code**. `scopeAllows()` even contains the reviewer≠author rule, yet no publish action exists to apply it to.

---

## 5. Verification gates — measured

| Gate | Result |
| --- | --- |
| `npm ci` | ✅ 451 packages, 17 s (warns: `next@16.0.0` has a security vulnerability) |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean, 0 warnings |
| `vitest run` | ✅ 3 files / 17 tests pass (0.96 s) |
| `next build` | ❌ **fails in this sandbox**: `next/font/google` cannot reach `fonts.googleapis.com` (`Plus_Jakarta_Sans`). Environment egress restriction — but the same build fails in any air-gapped/restricted CI, and the repo has no self-hosted font fallback. |
| `npm audit` | ❌ **24 advisories: 3 critical, 5 high, 14 moderate, 2 low** |
| Health probe | Not run (no database in sandbox) |

---

## 6. Security findings

### P0 — fix before any deployment

1. **`next@16.0.0` is critically vulnerable** (`GHSA-9qr9-h5gf-34mp` RCE in the React flight protocol, plus unauthenticated image-optimizer RCEs, Server Action SSRF/DoS, proxy-bypass advisories). Pinned exact version, `^` absent. **Fix is a non-major bump → `16.4.6`.** `package.json:28`.
2. **No versioned database migrations.** The only SQL file is the RLS lock-down (`supabase/migrations/20260113000000_lock_public_api.sql`); every domain table exists solely in `src/db/schema.ts`, `drizzle/` is `.gitignore`d (line 40), and the README tells operators to run `drizzle-kit push`. Production schema changes are therefore **unauditable, unreviewable and unrepeatable** — directly at odds with the "controlled document" posture of the product.
3. **`vercel.json` declares the wrong environment variables.** It maps `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SESSION_SECRET`, but the code reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`src/lib/server/supabase-server.ts`, `src/lib/client/supabase-browser.ts`, `src/proxy.ts`). On a clean Vercel project the proxy returns **500 "GHS-ELN is not configured"** for every request. `SESSION_SECRET` is dead code — no signed session cookie exists any more (the README still describes one).
4. **Certificate enumeration surface.** `/verify` is public and unthrottled; serials are presented as sequential (`GHS-CPD-2026-000184` in `src/app/(marketing)/verify/page.tsx`), and the lookup returns masked holder name, material title, credits and dates. Once issuance exists, sequential codes become a directory-harvesting oracle. Use random 128-bit codes + per-IP rate limiting.
5. **`.gitignore` excludes `scripts/` and `tests/`** (lines 56–57). The Playwright E2E suite and the auth-provisioning script the README instructs operators to run **cannot be committed** — so the QA contract and the onboarding path are structurally unenforceable.

### P1 — security hardening

6. **CSP is weak.** `script-src 'self' 'unsafe-inline'` (inline theme boot script), `img-src https:` (any host), no `object-src 'none'`, no `base-uri 'none'`, no `frame-ancestors`, no `form-action 'self'`, no `upgrade-insecure-requests`; `X-Frame-Options` is deprecated in favour of `frame-ancestors`. Add `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`. `next.config.ts:22-24`.
7. **No rate limiting or account lockout** despite `rate_limit_windows`, `failed_login_count`, `locked_until`. Login throttling is delegated entirely to Supabase; `/verify` and Server Actions are unthrottled.
8. **`drizzle-orm@0.36` is in the high-severity SQL-identifier-injection range** (`GHSA-gpj5-g38j-94v9`, fixed 0.45.4). Practical exposure is low (identifiers are static, values are parameterised), but this is the ORM that gates your entire data layer. Same for `zod@3.24` (high, memory exhaustion; fixed 4.6.7) and `postcss`/`sharp` transitively via Next.
9. **Download filename is hard-coded to `.pdf`** (`src/app/api/materials/[id]/file/route.ts:34`). A published MP4 or Markdown material downloads as `Title.pdf` with `Content-Disposition: attachment` — wrong type, confusing to staff, and defeats the MIME allowlist's purpose.
10. **`material.download` is never checked.** The file route verifies "any active session" only. Harmless today; becomes a leak the moment `categories.is_restricted` or `spaces.audience_*` is honoured.
11. `/api/health` is public and returns `version` + `uptime`; harmless but free recon. Consider restricting to a platform IP range or returning only `{ok}` publicly.

### P2 — latent design risks

12. **Facilitator scoping is a stub.** `scopeAllows()` returns `true` for any facilitator action as soon as `scope.categoryId` is *present* — it never checks `category_facilitators` (`src/lib/rbac/capabilities.ts`). Today no facilitator mutation exists, so nothing leaks; the first "create material" action written against this helper would be exploitable.
13. **Docs ↔ matrix drift:** `docs/rbac.md` gives FACILITATOR `message.read_thread` = "own threads", but the matrix sets it `false` (line 130) and nothing checks it; `docs/rbac.md` marks `certificate.verify` public for `null`, while `can(null, …)` returns `false` (harmless — the public page never consults it).
14. **`requireRole()` is dead code** — every page uses `requireSession()`, so there is no role-gated surface (`notFound()`/403 semantics from `docs/rbac.md` §3 are unimplemented).

---

## 7. Data integrity & correctness

1. **Audit chain breaks when a user is deleted.** `audit_logs.user_id` is `onDelete: "set null"` (`src/db/schema.ts:258`) while the hash covers `actorId`, and `verifyAuditChain()` substitutes `"SYSTEM"` for null. Deleting one user re-hashes every past event of theirs → the verifier reports false tampering. Use `RESTRICT`, or persist an immutable actor snapshot (id + hash) and never null it.
2. **The seeder is not idempotent for materials.** `materials` has no unique constraint on `(title, space_id)`, yet the seed relies on `.onConflictDoNothing()` with no conflict target (`src/db/seed.ts:101`). Every `npm run db:seed` inserts another "IPC Core Protocol 2026". (`users`/`categories`/`spaces` upserts are correct.)
3. **`certificates` are never issued**, so CPD "proof" is a UI promise with no writer. `verification_count` / `last_verified_at` are also never incremented.
4. **Missing constraints:** `material_versions` lacks `unique(material_id, version)`; `materials.current_version_id` and `superseded_by_version_id` have no FK; `comments.parent_id` has no FK. Fine as deliberate circularity, but undocumented — a duplicate version row is currently accepted silently.
5. **No `updated_at` triggers** — `updated_at` is maintained by hand in a handful of queries and will drift.
6. **No retention/erasure implementation** for audit IP/user-agent (Act 843 obligations described in `docs/qa.md` §3 but no code).

---

## 8. Performance & scalability (against the "metered mobile data" premise)

- **No pagination anywhere.** Library caps at 120 rows (`learning-queries.ts:205`), conversations scan 400 messages into JS (`messaging-queries.ts:28`), transcript caps at 500, notifications 50. `AGENTS.md` §2.6 explicitly requires pagination above 25 rows.
- **Message inbox is O(all messages).** `listConversations()` fetches up to 400 rows and aggregates in memory — no cursor, no `DISTINCT ON`, and **`direct_messages` has no index at all** beyond its PK.
- **Missing indexes:** `materials` has only `(space_id)` — no `(state, is_published, space_id)` for the universal published-content filter; `notifications`, `comments`, `certificates`, `material_progress` (unique pair only), `direct_messages` unindexed for their access patterns.
- **Every marketing page makes two Supabase Auth round-trips** (proxy `getUser()` + `(marketing)/layout.tsx → resolveAccount()`), and `/` additionally runs `listCategories()` + `getPublicStats()` uncached. For a 3G audience the landing page should be static/CDN-cached with a cookie-presence check instead of a network call.
- **Proxy calls Supabase for static-ish public paths** it could short-circuit — measurable latency on every asset-adjacent navigation.
- Connection pool is correct for serverless (`max: 3`, `prepare: false`) — good.

---

## 9. Testing & operability

- **17 tests, all pure-function.** `capabilities.test.ts` (8 assertions), `audit-hash.test.ts`, `safe-redirect.test.ts`. Nothing exercises Drizzle, the audit append path, Server Actions, the file-signing route, or the session/rbac gates.
- `docs/rbac.md` §4 requires a vector for **every capability row** (39 actions × 3 roles = 117) plus a CI assertion that every action string is covered. Actual coverage: 8.
- `playwright.config.ts` points at `./tests/e2e` — **directory does not exist**, and would be gitignored if it did.
- **No CI at all** (`.github/` absent): no typecheck/lint/test/build gate, no dependency scanning (hence the 24 advisories), no preview deployments.
- **No observability**: `docs/architecture.md` promises structured one-line request logs, correlation IDs and alert thresholds; there is no logger, no request ID, no metrics. `error.tsx` shows Next's `digest` only.
- `docs/architecture.md` also references `src/lib/server/errors.ts` (`AppError`, `toFieldErrors`) — **file does not exist**.

---

## 10. Documentation drift (README / AGENTS vs. code)

| Document says | Repository actually has |
| --- | --- |
| `middleware.ts` at root | `src/proxy.ts` (Next 16 rename) |
| `src/lib/server/queries.ts` | `learning-queries.ts`, `messaging-queries.ts`, `notification-queries.ts`, `public-queries.ts` |
| `src/lib/server/storage.ts`, `auth-adapter.ts` | `file-storage.ts`; no auth adapter (Supabase direct) |
| `src/app/page.tsx` redirects to `/dashboard` | `(marketing)/page.tsx` is the public landing page |
| Signed `ghs_session` cookie, `SESSION_SECRET` | Supabase Auth cookies; `SESSION_SECRET` unused (`vercel.json`, `.env.example`) |
| `DIRECT_URL` used by drizzle-kit | `drizzle.config.ts` uses `DATABASE_URL`; `DIRECT_URL` is read by nothing |
| `.claude/skills/**`, `.claude/commands/**` | Absent (`.gitignore` line 63) |
| `scripts/provision-auth-user.ts` | Absent (`scripts/` gitignored) |
| `npx drizzle-kit migrate` in staging | No migrations to run |
| `.env.example` is complete ("every variable is read by the code") | Missing `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE`; includes unused `SESSION_SECRET`/`DIRECT_URL`/`SEED_ADMIN_PASSWORD` |

`docs/` also carries ~174 KB of standalone HTML mock-ups (`docs/ghs_learnportal.html`, `docs/ghana_health_service_cpd_…html`) that duplicate the PRD's intent — fine as design references, but they should be labelled as such or moved out of the shipped tree. `public/brand/` and the Unsplash-allowlisted remote images should have provenance/licence notes.

---

## 11. Prioritised recommendations

**P0 — this week (deployability + critical risk)**
1. `npm i next@16.4.6` (non-major), then `drizzle-orm@0.45.4`, `zod@4`, `vitest@5`, `@supabase/ssr@0.12` as separate PRs; re-run gates each time.
2. Add `.github/workflows/ci.yml`: `npm ci` → `tsc` → `lint` → `test` → `build`, plus `npm audit --audit-level=high` and Dependabot.
3. Fix `vercel.json`: declare `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; delete `SESSION_SECRET`/`SUPABASE_URL`/`SUPABASE_ANON_KEY` or document them as aliases.
4. Commit the domain schema as real Drizzle migrations (`drizzle-kit generate`, un-ignore `drizzle/`), make `DATABASE_URL` pooled + `DIRECT_URL` the kit's credential.
5. Un-ignore `tests/` and `scripts/`; land at least one Playwright smoke spec (login → dashboard → material → complete) at 390/768/1440.
6. Self-host the Plus Jakarta Sans woff2 (or fall back to the system stack) so builds don't depend on Google Fonts egress.

**P1 — next sprint (integrity + the product's core promises)**
7. Make the audit chain survive user deletion (`RESTRICT` + actor snapshot), and expose `verifyAuditChain()` as an admin-only action/scheduled job.
8. Ship the **publish pipeline** (upload → version → submit → reviewer ≠ author → publish → supersede), or explicitly de-scope it and strip "controlled/versioned/approved" claims from the marketing copy.
9. Enforce `categories.is_restricted` + `spaces.audience_*` in `learning-queries`; wire `material.download` and DB-backed facilitator scope into `scopeAllows`.
10. Implement certificate issuance with **random** serials, `verification_count` increment, and rate limiting on `/verify`.
11. Add pagination (cursor-based) to library, conversations, transcript; add the missing composite indexes.
12. Tighten CSP (`script-src` with a nonce for the theme script, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'none'`), add `Permissions-Policy`/COOP.

**P2 — when the surface grows**
13. Structured logging + request IDs; align `error.tsx` with a real `AppError`/correlation ID contract.
14. Capability test vectors for all 39 actions, generated from the matrix to stop drift; DB integration tests for the audit chain and the file route.
15. Fix the seeder's material upsert (unique `(space_id, title)` or explicit conflict target); add `updated_at` triggers; document the deliberate circular FKs.
16. Fix the download filename to derive its extension from `version.mimeType`; drop `requireRole()` or use it for the first admin surface.
17. Refresh README/AGENTS to the actual tree — or better, generate the structure section from the filesystem.

---

## Appendix — evidence commands

```bash
npm ci                                    # 451 packages; deprecation: next@16.0.0 vulnerable
npx tsc --noEmit                          # exit 0
npx eslint .                              # exit 0
npx vitest run                            # 3 files, 17 tests passed
npx next build                            # FAILED: next/font could not reach fonts.googleapis.com
npm audit --json                          # 24 advisories: 3 critical, 5 high, 14 moderate, 2 low
git ls-files | wc -l                      # 137 tracked files
grep -rn "process.env." src | …           # env surface vs .env.example / vercel.json
grep -rn "\.insert(\|\.update(" src       # 6 mutation sites in app code (2 actions + 1 route)
```

---

## 12. Remediation status

### Fixed in this pass

| # | Finding | Where |
| --- | --- | --- |
| 1 | `next@16.0.0` critical advisories | upgraded to 16.4.6 (+ React 19.3.1); `npm audit --omit=dev` is **0** |
| 2 | No versioned migrations | `drizzle/0000_baseline.sql`, `0001_integrity_and_indexes.sql`, `0002_certificates_unique.sql`, `docs/migrations.md`; `db:migrate` / `db:check` scripts |
| 3 | `vercel.json` env names | now declares `NEXT_PUBLIC_SUPABASE_*`; `SESSION_SECRET`/bare `SUPABASE_*` removed |
| 4 | Certificate enumeration | random 50-bit Crockford serials, format validation, 20/5 min per-connection limit, verification counted |
| 5 | `tests/` + `scripts/` gitignored | both tracked; `scripts/provision-auth-user.ts` and `scripts/verify-audit-chain.ts` added |
| 6 | Weak CSP / headers | `object-src`/`base-uri`/`frame-ancestors`/`form-action` locked, `img-src` narrowed, COOP/CORP/Permissions-Policy added; nonce migration tracked as ADR-0007 |
| 7 | No rate limiting / lockout | fixed-window limiter over `rate_limit_windows` on progress, messages, verification (hashed keys, no raw IPs) |
| 8 | Vulnerable ORM/validator | drizzle-orm 0.45.4, zod 4.6.7, @supabase/ssr 0.12.7, vitest 4.1.12 |
| 9 | Download hard-coded `.pdf` | `src/lib/file-name.ts` derives the extension from the stored MIME type (8 tests) |
| 10 | `material.download` unenforced | file route consults the matrix; audience rule added to `scopeAllows` |
| 11 | Facilitator scope was a stub | `checkCapability()` verifies `category_facilitators` |
| 12 | Audit chain broke on user deletion | FK is `ON DELETE RESTRICT` (ADR-0006), documented in the migration |
| 13 | Non-idempotent seeder | `UNIQUE (space_id, title)` + upsert; running twice no longer duplicates |
| 14 | Missing indexes | added for messages, notifications, visibility, progress, certificates, comments, enrollments, lower(email) |
| 15 | No pagination | library (24/page with links), threads (50 with cursor), transcript (25 rendered), 50 conversations |
| 16 | Restricted/audience columns unused | enforced in every learner-facing query **and** the progress action |
| 17 | Certificates never issued | issued in the same transaction as completion + audit; unique (user, material, version) |
| 18 | Build depends on Google Fonts | Plus Jakarta Sans self-hosted (SIL OFL) — build is hermetic |
| 19 | No CI / dependency scanning | `.github/workflows/ci.yml` + Dependabot |
| 20 | Docs drift (README/AGENTS/architecture/qa) | rewritten against the real tree; ADR-0007 added; `docs/migrations.md` created |
| 21 | No observability | `logEvent()` JSON lines with PII redaction, `x-request-id` on every response |
| 22 | Capability test coverage | sweep over every action × role (55 unit tests total) |
| 23 | Public pages fell over when the database was unavailable | marketing counters/taxonomy and certificate verification now degrade with a friendly message; outage is logged as a structured event |
| 24 | No authoring/publish pipeline (the lifecycle existed only in the docs and schema) | `/authoring` + `/authoring/[id]` + `/review`: draft → signed upload → review → publish → supersede → archive, with audit rows at every step (ADR‑0008) |
| 25 | The two-person rule was documented but unenforced | `publishBlockers()` + new `material.review` capability + `scopeAllows(reviewerIsAuthor)`; reason required to reject; audited `SYSTEM_ADMIN` override (14 + 8 unit tests) |
| 26 | Uploads could not work through the app server (body limits) | browser → storage signed slots; server re-verifies type/size from storage metadata and removes rejected objects |
| 27 | `src/lib/server/errors.ts` referenced by the docs did not exist; errors surfaced as stack traces or bare digests | one `AppError` vocabulary with statuses + `toFieldErrors`, request id forwarded downstream, mirrored into `ghs_rid` and quoted by both error boundaries (7 tests) |
| 30 | ~174 KB of duplicate HTML mock-ups sat in `docs/` as if they documented the build | moved to `docs/reference/` with a README that states they are design references, not a specification |
| 29 | Certificates could be verified but never produced — no printable award and no serial on the transcript | `/certificates/<code>` print-first award (holder or staff only), serial column on the transcript, masked name kept on the public page |
| 28 | `notifications.audience_filter` was unused — every notice reached everyone, and there was no way to send one | `/notices` composer for staff, cohort filter resolved from the space's audience, strict matching (blank dimension never matches), "mark all read" honours the filter (6 tests) |

### Deliberately not done in this pass

| # | Finding | Why / next step |
| --- | --- | --- |
| B | Assessments, comments, message reporting, notifications targeting | Tables exist, flows do not. Each is a feature slice with its own UI and tests. |
| C | MFA enforcement and account lockout | Needs an ICT policy decision (Supabase MFA enrolment flow) before code. |
| D | Per-request CSP nonce | Tracked in ADR-0007; forces dynamic rendering on every route. |
| E | Authenticated E2E suite executed in CI | Spec exists (`tests/e2e/learner.spec.ts`) and skips without credentials; CI needs a seeded database + Supabase project to run it. |
| F | Server-rendered certificate PDF + e-mail delivery | The printable award now exists as HTML (`/certificates/<code>`, browser print → PDF) and the transcript carries the serial; generating the file server-side and mailing it is still open. |
