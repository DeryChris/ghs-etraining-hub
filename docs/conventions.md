# Conventions — GHS‑ELN

Everything not covered by `AGENTS.md` §4 (placement) and §5 (data). When two rules could apply,
the stricter one wins.

## 1. Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files (`components`) | kebab‑case, one component per file | `discussion-thread.tsx` |
| Files (`lib`) | kebab‑case capability name | `material-queries.ts` |
| React components | PascalCase, named export only | `export function MaterialCard()` |
| Hooks | `use` + verb/noun | `useEnrollmentProgress()` |
| Server Actions | verb + noun | `publishMaterialVersion()` |
| DB tables | snake_case plural | `material_versions` |
| DB columns | snake_case | `published_at` |
| TS types | PascalCase; DTOs suffixed `Dto` | `MaterialSummaryDto` |
| Zod schemas | `<thing>Schema` | `createSpaceSchema` |
| Env keys | SCREAMING_SNAKE, client‑safe ones `NEXT_PUBLIC_` | `SESSION_SECRET` |
| Routes | kebab‑case, plural for collections | `/admin/audit-logs` |
| CSS classes | Tailwind utilities only; `@apply` is allowed only inside `globals.css` | `class="rounded-[10px] border border-hairline"` |
| Branches | `<type>/<task-code>-<slug>` | `feat/p3-t12-assessment-scoring` |
| Commits | `type(scope): summary (task-code)` | `feat(assessment): server-side scoring (P3-T08)` |

## 2. TypeScript

* `type` for object shapes, `interface` only when declaration merging is required, `const` + `as const`
  for unions, `satisfies` for config objects.
* No `any`, no non‑null `!` on data you did not yourself verify, no `// @ts-ignore`
  (`@ts-expect-error` with a reason and a ticket reference is acceptable for exactly one release).
* Discriminated unions over boolean flags: `{ status: "ok"; data } | { status: "error"; fieldErrors }`.
* DTOs describe what the UI needs, not what the table stores: never export a raw row type.
* `readonly` on props; `Record<string, never>` for empty object params.

## 3. Zod schemas

* One schema per action, colocated in `src/lib/server/actions/schemas/<domain>.ts`.
* Every field gets a message: `z.string().min(1, "Enter the material title")` — messages are
  user‑facing copy, written to the tone in `docs/ui-ux.md` §5.
* Transform at the boundary: `.trim()`, `.toLowerCase()` (email), `.transform(normalisePhone)`.
* Reject, never silently repair: `.strict()` on objects, `.max()` on every string, `z.enum` for
  closed sets. Free‑text length caps: comment 2,000; message 4,000; summary 600; title 160.

## 4. Error handling

```
AppError(code, status)            # known, user-presentable
ZodError                          # field errors → inline
unknown                           # 500 + correlation id + server log
```

* Never `catch (e) { return null }`. Catch, classify, and either recover or surface.
* Every `error.tsx` offers a next action; every failure is traceable by correlation id.
* Log the id, route, user id and message — never headers, cookies or request bodies.

## 5. Forms

* `useActionState` + `useOptimistic`; submit buttons disable and show "Publishing…" with unchanged
  width; success resets dirty state and toasts; validation errors render under the field with
  `aria-describedby`.
* Unsaved‑changes guard on long forms (`beforeunload` + in‑app dialog).
* File inputs show name, size, type, and the version/scan state before submit.

## 6. Git & PRs

* One vertical slice per PR; ≤ 400 changed lines excluding migrations and lockfiles.
* PR template: what/why, screenshots (dark UI), RBAC impact, audit events added, migration needed,
  bandwidth impact, §10 gate output.
* Squash merge; the commit title is the PR title.
* Migrations are never mixed with refactors in the same PR.

## 7. Comments and TODOs

* Explain *why*, not *what*. A comment that restates the code is deleted.
* `// TODO(task-code): what must happen before launch` — a TODO without a task code is removed on
  sight. `FIXME` requires a task code and a severity.
* Never commit commented‑out code.

## 8. Dependencies

Before adding a package: justify it in one line in the PR, confirm React 19 / Next 16
compatibility, confirm ≤ 40 KB gz, confirm it is maintained, and check whether an existing dep or a
~30‑line helper would do. Prefer `Intl`, `crypto.randomUUID`, `URLSearchParams`, `IntersectionObserver`
over libraries.

## 9. Documentation duty

Any change that alters: schema → `docs/data-model.md`; capabilities → `docs/rbac.md` + test vectors;
tokens/components → `docs/ui-ux.md`; request lifecycle/caching → `docs/architecture.md`; a
requirement → `docs/PRD.md` change log + an ADR in `docs/decisions/`. Code that changes behaviour
without changing docs is incomplete.
