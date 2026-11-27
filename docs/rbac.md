# RBAC — capability matrix and test vectors

Roles are `SYSTEM_ADMIN`, `FACILITATOR`, `LEARNER`. The key `LEARNER` is stored in the database and
read on every check, but it is **never shown to people**: the label is **Staff** (`STAFF_ROLE_LABELS`),
because "learner" described a CPD platform this product is not. Renaming the enum would rewrite every
grant, audit row and row-level rule for a word on a screen. **The matrix below is the spec; the code in
`src/lib/rbac/capabilities.ts` is the implementation, and the table‑driven tests must cover every
row.** Any change here is a `ROLE_CHANGE` audit event and requires an ADR.

`can(session, action, scope)` where `scope` is the object being acted on (or the intended parent).

## 1. Matrix

| Action | SYSTEM_ADMIN | FACILITATOR | LEARNER |
| --- | --- | --- | --- |
| `user.create` | ✅ | ❌ | ❌ |
| `user.bulk_import` | ✅ | ❌ | ❌ |
| `user.deactivate` / `user.reactivate` | ✅ | ❌ | ❌ |
| `user.assign_role` | ✅ | ❌ | ❌ |
| `user.reset_password` | ✅ (any) | ✅ (own assigned learners, temporary only) | ❌ (self reset via email only) |
| `user.read_pii` | ✅ (audited) | ✅ (assigned roster only) | ❌ (self only) |
| `area.update` | ✅ | ❌ | ❌ |
| `area.assign_facilitator` | ✅ | ❌ | ❌ |
| `material.create` | ✅ | ✅ (assigned area) | ❌ |
| `material.upload_version` | ✅ | ✅ (assigned area) | ❌ |
| `material.submit_review` | ✅ | ✅ (authored draft) | ❌ |
| `material.review` | ✅ | ✅ (assigned area, **reviewer ≠ uploader**, ADR‑0008) | ❌ |
| `material.publish` | ✅ | ✅ (assigned area, **reviewer ≠ author**) | ❌ |
| `material.archive` | ✅ | ✅ (assigned area) | ❌ |
| `material.read_draft` | ✅ | ✅ (assigned area) | ❌ |
| `material.read_published` | ✅ | ✅ | ✅ (audience match) |
| `material.download` | ✅ | ✅ | ✅ (audience match) |
| `comment.create` / `comment.edit_own` | ✅ | ✅ | ✅ |
| `comment.moderate` | ✅ (any) | ✅ (assigned areas) | ❌ |
| `message.send` | ✅ | ✅ (assigned learners, admins, peers in area) | ✅ (peers, facilitators, admins) |
| `message.read_any_thread` | ✅ (only with DPO‑approved investigation, audited) | ❌ | ❌ |
| `training.manage` | ✅ | ✅ (any training — field work, not library governance) | ❌ |
| `area.update` | ✅ | ❌ | ❌ |
| `area.assign_facilitator` | ✅ | ❌ | ❌ |
| `taxonomy.manage` | ✅ | ❌ | ❌ |
| `geography.manage` | ✅ | ❌ | ❌ |
| `notification.broadcast` | ✅ | ✅ (area announcement, assigned area) | ❌ |
| `notification.view` | ✅ | ✅ | ✅ (own) |
| `analytics.view_personal` | ✅ | ✅ | ✅ (own) |
| `analytics.view_cohort` | ✅ (national) | ✅ (assigned areas/regions) | ❌ |
| `analytics.export` | ✅ (audited) | ✅ (assigned scope, audited) | ❌ |
| `audit_log.read` | ✅ (all, reading is audited) | ✅ (own area events only) | ❌ |
| `maintenance_banner.manage` | ✅ | ❌ | view only |
| `certificate.verify` | public (no session, rate-limited per connection) | public | public |
| `certificate.revoke` | ✅ (audited) | ❌ | ❌ |

## 2. Scope resolution

`scopeFor(action, target)` must be resolved **from the database**, never from the request payload.
`checkCapability(action, scope)` → `src/lib/server/rbac.ts` enforces the area-scoped half of
this rule for facilitators by querying `area_facilitators`; the caller's `scope.areaId` is
only a hint, never proof of assignment.

* Facilitator scope = `areaIds` from `area_facilitators` (+ `region` if regional).
* `training.manage` is global for staff: Trainings is the GHS training calendar, not an
  area's filing cabinet, so a facilitator may plan a training without being assigned to the area it
  is filed under. Reading and authoring material in an area stays area‑scoped, through
  `area_facilitators` (ADR‑0014).
* `taxonomy.manage` and `geography.manage` are administrator‑only: they change the words and places
  every other form offers.
* Material scope is its programme area; a facilitator may only act on an area they are assigned to.
* Audience match for learners = `audienceRegion IS NULL OR audienceRegion = user.region` (and the
  same for directorate/cadre). This is enforced in SQL by `audienceFor()` in
  `src/lib/server/learning-queries.ts`, not in the UI: staff are exempt, a viewer with no cohort
  attribute matches untargeted content only, and `programme_fields.isRestricted` hides the programme
  from learners entirely.
* A facilitator who is also the author of a version **cannot** approve/publish that version alone —
  the reviewer must differ from the author (clinical two‑person rule).

## 3. Failure semantics

| Situation | Result |
| --- | --- |
| No session | redirect `/login?next=<path>` (page) / 401 JSON (action) |
| Session, wrong role for a page the user cannot know exists | `notFound()` (404) |
| Session, wrong role for a surface whose existence is known (admin area link, facilitator link) | 403 with a plain‑English message + correlation id |
| Scope mismatch (facilitator, other directorate) | 404, never a hint that the object exists elsewhere |
| Inactive user | 403 + `USER_DEACTIVATED` audit event |

## 4. Required test vectors (keep in sync)

```ts
// src/lib/rbac/__tests__/capabilities.test.ts
const vectors: Vector[] = [
  { role: "LEARNER", action: "material.publish", scope: assigned, expect: false },
  { role: "FACILITATOR", action: "material.publish", scope: assigned, reviewerIsAuthor: true, expect: false },
  { role: "FACILITATOR", action: "material.review", scope: assigned, reviewerIsAuthor: true, expect: false },
  { role: "LEARNER", action: "material.review", scope: assigned, expect: false },
  { role: "FACILITATOR", action: "material.publish", scope: otherCategory, expect: false },
  { role: "SYSTEM_ADMIN", action: "audit_log.read", expect: true, mustAudit: true },
  { role: "LEARNER", action: "material.read_published", scope: { audienceRegion: "Volta", userRegion: "Ashanti" }, expect: false },
  { role: "FACILITATOR", action: "comment.moderate", scope: assigned, expect: true },
  { role: "LEARNER", action: "comment.moderate", scope: assigned, expect: false },
  { role: null, action: "certificate.verify", expect: true },
];
```

CI must also assert that **every** action string in `capabilities.ts` appears in the vectors file,
so a new capability cannot ship untested.

## 5. UI consequences

* Sidebar items are computed from `can(...)`, so the nav never advertises a forbidden route.
* Buttons that fail the capability check are **hidden**, not disabled (a disabled "Publish" button
  for a non‑facilitator is a confusing dead end; the same button disabled because *review is
  pending* is legitimate — always add a tooltip explaining the state).
* Server Actions re‑check every capability: hiding a button is UX, not security.

## 6. Unit heads

A unit head is a **facilitator carrying one extra duty**: signing off the material filed under
their programme fields. It is `users.is_unit_head`, not a fourth role, because everything else the
person does is a facilitator's — their area assignments, trainings and materials are untouched
whichever way the flag is set.

* Effect: the review queue appears in their sidebar and on their dashboard, and `/review` opens.
  A plain facilitator is redirected away from it: facilitators author, unit heads and
  administrators sign off.
* Granting and removing it is an administrator action (`setUnitHeadAction`, audited as
  `USER_UNIT_HEAD_GRANTED` / `USER_UNIT_HEAD_REMOVED`), offered on the Users page for facilitator
  rows only.
* The flag widens a facilitator's menu; it never promotes a learner. `navFor` checks the role
  before honouring it.
