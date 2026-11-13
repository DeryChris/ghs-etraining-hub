# Architecture — GHS‑ELN

Companion to `AGENTS.md` (contract) and `docs/PRD.md` (requirements). This file explains *how the
request lifecycle works* so an agent never has to guess where code belongs.

## 1. Rendering strategy

```
Browser ──▶ Edge Middleware (cheap session signature check, redirect, security headers)
        └─▶ Server Component tree (async, sequential/parallel data loading)
              ├─ src/lib/server/*-queries.ts   → Drizzle → typed DTOs
              ├─ <Suspense> boundaries          → stream slow panels
              └─ Client leaves ("use client")   → interactivity only
        └─▶ Server Actions                     → guard → validate → tx(logAudit) → revalidate
```

**Rules**

1. Server Components fetch. Client Components receive serialisable DTOs and own only
   interaction state. A client component must never contain a query path.
2. `export const revalidate` / `cache tags`: dashboard and library data are user‑scoped, so they
   are `dynamic = "force-dynamic"` by default. Only truly public artefacts (certificate
   verification, published SOP *metadata*) may be cached — and then tagged
   `["material", material.id]` so publishing can `revalidateTag`.
3. Parallelise independent awaits with `Promise.all`; sequential awaits only when a value feeds the
   next query.
4. Never `await` a database call inside `.map()` — use `inArray` batches.

## 2. Server Actions vs Route Handlers

| Need | Use |
| --- | --- |
| Form submit, modal confirm, inline edit | Server Action (`"use server"` in `src/app/**/actions.ts` or `src/lib/server/actions/*`) |
| Guarded data read for a client widget that cannot be a prop | Server Action returning DTO (not a REST GET) |
| Webhook (transcode done, malware scan done, SMS delivery) | Route Handler `POST` with HMAC verification |
| Streaming a private file | Route Handler issuing a 302 to a signed URL or proxying bytes |
| Health / status | `GET /api/health` |

Server Actions are the default because they cannot be casually CSRF‑sprayed across origins, keep
types end‑to‑end, and remove a whole REST surface from the security review.

## 3. Connection & pool sizing

Sandbox: `pg.Pool` with defaults (max 10) is fine. Production: **pool per serverless instance is
the danger** — set `max: 3–5`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 10000`, and
point `DATABASE_URL` at the transaction pooler (port 6543). `DIRECT_URL` is used only by
`drizzle-kit`. Never hold a transaction open across an `await fetch` or file read.

## 4. Error handling

```
throw new AppError("MATERIAL_NOT_FOUND", 404)      → renders not-found, no detail leak
throw new AppError("FORBIDDEN", 403)               → generic message + correlation id
throw new ZodError                                 → field map to inline form errors
throw new Error                                    → 500, logged server-side with correlation id
```

`src/lib/server/errors.ts` defines `AppError` and `toFieldErrors(zodError)`. Every `error.tsx`
shows the correlation id (`crypto.randomUUID()` propagated via `headers()`), never a stack trace.

## 5. Observability

* `GET /api/health` → `{ ok, checks: { db, storage, migrations } , uptime, version }`; returns 503
  if `db` fails so the platform can act on it.
* Structured logs: one line per request `{ requestId, route, userId?, role?, ms, status }`.
* Alert thresholds: p95 > 1.5 s for 10 min, error rate > 1 %, login failures > 20/min per account.

## 6. Environments

| Env | Data | Behaviour |
| --- | --- | --- |
| local | seeded demo roster, fake PINs | verbose Drizzle logging, seeded admin from env |
| preview | anonymised copy | every PR gets a URL, seeded, no real PII |
| staging | anonymised + masked | mirrors prod, DPIA checks |
| production | real | migrations only (`drizzle-kit migrate`), seeder blocked, MFA enforced |

**Anonymised copy rule**: any data copied to a lower environment must pass
`scripts/anonymise-roster.ts` (names → "Test User N", phones → null, emails → `user<n>@example.gh`).

## 7. Caching & invalidation map

| Data | Cache | Invalidated by |
| --- | --- | --- |
| Dashboard aggregates | none (dynamic) | n/a |
| Published material metadata | tagged `material:{id}` | `revalidateTag` on publish |
| Region/directorate lists | `unstable_cache` 24 h | `revalidateTag("taxonomy")` on category write |
| Certificate lookup | `unstable_cache` 1 h | `revalidateTag("certificate:{code}")` on verification |
| Static assets / media | CDN, immutable keys (version‑prefixed) | never — new version = new key |

## 8. File storage layout

```
private bucket: ghs-materials
  materials/<materialId>/v<version>/<uuid>.<ext>     # immutable, checksum in DB
  certificates/<certificateId>.pdf
  avatars/<userId>/<uuid>.<ext>
```

Keys are never derived from user input. Signed URLs are minted per request with a 15‑minute TTL,
`Content-Disposition: attachment` for downloads and `inline` only for the in‑app viewer.
