# RBAC — capability matrix and test vectors

Roles are `SYSTEM_ADMIN`, `FACILITATOR`, and `LEARNER`. The stored `LEARNER` role is displayed as
**Staff** (`STAFF_ROLE_LABELS`). **The matrix below documents the signed-in capability layer; the
code in `src/lib/rbac/capabilities.ts` is the implementation, and tests must cover every action.**
Any role change is audited and requires an ADR.

Anonymous public Programme Area/Programme Field browsing is implemented by separate server-side
queries and visibility predicates, not by an anonymous RBAC capability. `PUBLIC_ACTIONS` is
intentionally empty: no Server Action is anonymous. `can(session, action, scope)` evaluates a
signed-in capability, where `scope` is the object being acted on (or its intended parent).

## 1. Matrix

| Action | SYSTEM_ADMIN | FACILITATOR | LEARNER |
| --- | --- | --- | --- |
| `user.create` | ✅ | ❌ | ❌ |
| `user.bulk_import` | ✅ | ❌ | ❌ |
| `user.deactivate` / `user.reactivate` | ✅ | ❌ | ❌ |
| `user.assign_role` | ✅ | ❌ | ❌ |
| `user.reset_password` | ✅ (any, audited) | ❌ | ❌ |
| `user.read_pii` | ✅ (audited) | ❌ | ❌ |
| `area.update` | ✅ | ❌ | ❌ |
| `area.assign_facilitator` | ✅ | ❌ | ❌ |
| `material.create` | ✅ | ✅ (assigned Programme Area/Field) | ❌ |
| `material.upload_version` | ✅ | ✅ (assigned Programme Area/Field) | ❌ |
| `material.submit_review` | ✅ | ✅ (authored draft) | ❌ |
| `material.review` | ✅ | ✅ (assigned Programme Area/Field, **reviewer ≠ uploader**, ADR‑0008) | ❌ |
| `material.publish` | ✅ | ✅ (assigned Programme Area/Field, **reviewer ≠ author**) | ❌ |
| `material.archive` | ✅ | ✅ (assigned Programme Area/Field) | ❌ |
| `material.read_draft` | ✅ | ✅ (assigned Programme Area/Field) | ❌ |
| `material.read_published` | ✅ | ✅ | ✅ (audience match) |
| `material.download` | ✅ | ✅ | ✅ (audience match) |
| `comment.create` / `comment.edit_own` | ✅ | ✅ | ✅ |
| `comment.moderate` | ✅ (any) | ✅ (assigned Programme Area/Field) | ❌ |
| `message.send` | ✅ | ✅ (assigned learners, admins, peers in area) | ✅ (peers, facilitators, admins) |
| `message.read_any_thread` | ✅ (only with DPO‑approved investigation, audited) | ❌ | ❌ |
| `training.manage` | ✅ | ✅ (Upper West service records; not Programme Field governance) | ❌ |
| `taxonomy.manage` | ✅ | ❌ | ❌ |
| `geography.manage` | ✅ | ❌ | ❌ |
| `notification.broadcast` | ✅ | ✅ (Programme Field announcement, assigned scope) | ❌ |
| `notification.view` | ✅ | ✅ | ✅ (own) |
| `analytics.view_personal` | ✅ | ✅ | ✅ (own) |
| `analytics.view_cohort` | ✅ (service data) | ✅ (assigned scope) | ❌ |
| `analytics.export` | ✅ (audited) | ✅ (assigned scope, audited) | ❌ |
| `audit_log.read` | ✅ (all, reading is audited) | ❌ | ❌ |
| `maintenance_banner.manage` | ✅ | ❌ | ❌ |

## 2. Scope resolution

Scope is resolved **from the database**, never from the request payload. `checkCapability(action,
scope)` in `src/lib/server/rbac.ts` checks the facilitator's assignment when a material-authoring
action is attempted; the caller's `scope.areaId` is only a locator, never proof of assignment. In
material queries, `scopeFor()` in `src/lib/server/scope.ts` applies those grants as a SQL row filter.
Training register visibility is separate: facilitators see published records and their own entries;
administrators and unit heads can see all review states. `trainingVisibilityFilter()` in
`src/lib/server/training-queries.ts` applies that rule to lists and aggregates.

The schema names preserve an older, reversed taxonomy: a `field_facilitators` grant points to a
`programme_fields` row, presented to users as a **Programme Area**; an `area_facilitators` grant
points to a `programme_areas` row, presented as a **Programme Field**. For material authoring and unit-head review, a grant covers its own node; a parent Programme Area
grant also covers all its child Programme Fields, including later additions. These grants do not
restrict Training register access. Facilitator scope does not grant nationwide access.

* `training.manage` is global with respect to Programme Field assignment: a facilitator may manage
  a training record without being assigned to the field it references. The service and its training
  data remain Upper West-focused. Reading published material and selected self-service actions are
  also global to the role; authoring and review remain scoped to assigned Programme Areas/Fields
  (ADR‑0014).
* `taxonomy.manage` and `geography.manage` are administrator‑only: they change the words and places
  every other form offers.
* Material authoring and review scope is the material's Programme Field; a facilitator may act when
  assigned either directly to that field or to its parent Programme Area.
* Audience match for a Staff account (stored role `LEARNER`) = `audienceRegion IS NULL OR
  audienceRegion = user.region` (and the same for directorate/grade). This is enforced in SQL by
  `audienceFor()` in `src/lib/server/visibility.ts`, not in the UI: a viewer with no cohort
  attribute matches untargeted content only, and the stored `programme_fields.is_restricted` flag
  hides its corresponding Programme Area from Staff.
* A facilitator who is also the author of a version **cannot** approve/publish that version alone —
  the reviewer must differ from the author (clinical two‑person rule).

## 3. Failure semantics

| Situation | Result |
| --- | --- |
| No session | Page redirects to sign-in; a Server Action returns a plain session-ended refusal |
| Session, wrong role for a page the user cannot know exists | `notFound()` (404), where that route uses a not-found guard |
| Session, wrong role for a known surface | `requireRole()` redirects to `/dashboard?notice=forbidden` |
| Scope mismatch (facilitator, unassigned Programme Area/Field) | Queries omit the row; detail routes return not-found; a Server Action returns a plain refusal |
| Inactive user | Session resolution rejects the account; protected pages send the visitor to sign-in |

## 4. Required test vectors (keep in sync)

The table-driven unit tests are in `src/lib/rbac/capabilities.test.ts`. They check role grants,
facilitator scope, cohort filtering, and that no capability is available to an anonymous session.
Keep those tests and the matrix above in sync; a newly added capability must be covered.

## 5. UI consequences

* Sidebar items are computed from `can(...)`, so the nav never advertises a forbidden route.
* Buttons that fail the capability check are **hidden**, not disabled (a disabled "Publish" button
  for a non‑facilitator is a confusing dead end; the same button disabled because *review is
  pending* is legitimate — always add a tooltip explaining the state).
* Server Actions re‑check every capability: hiding a button is UX, not security.

## 6. Unit heads

A unit head is a **facilitator carrying one extra duty**: deciding on material and training records
within the Programme Areas and Programme Fields they are assigned. It is `users.is_unit_head`, not a
fourth stored role, because everything else the person does is a facilitator's; the flag does not
change their assignments or the scope of training management.

* Effect: the review queue appears in their sidebar and on their dashboard, and `/review` opens.
  A plain facilitator is redirected away from it: facilitators author, unit heads and
  administrators sign off.
* Granting and removing it is an administrator action (`setUnitHeadAction`, audited as
  `USER_UNIT_HEAD_GRANTED` / `USER_UNIT_HEAD_REMOVED`), offered on the Users page for facilitator
  rows only.
* The flag widens a facilitator's menu; it never promotes a learner. `navFor` checks the role
  before honouring it.

## District HR — an administrator for one district

`DISTRICT_HR` is a fourth role, added in ADR‑0032. It carries the administrator's
capabilities minus everything that reaches past a district:

| | District HR | System administrator |
|---|---|---|
| Create, edit, deactivate, reactivate people | in their district | everywhere |
| Reset passwords, read PII | in their district | everywhere |
| Appoint staff, facilitator, unit head | yes | yes |
| Appoint administrator or another District HR | no | yes |
| Bulk staff import | no — the sheet is regional | yes |
| Programme taxonomy, area grants | no — both are regional | yes |
| Record or approve trainings | no | yes |
| Geography, notices, complaints | **not yet** — screens still administrator-only | yes |

The boundary is `users.district_id` (a foreign key), never `users.district`
(free text from the staff sheet). Every people action calls
`src/lib/server/district-scope.ts`, which reads the district from the database on
each request; a `DISTRICT_HR` row without a district can act on nobody.
