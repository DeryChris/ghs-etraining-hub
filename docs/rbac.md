# RBAC — capability matrix and test vectors

Roles are `SYSTEM_ADMIN`, `FACILITATOR`, `LEARNER`. **The matrix below is the spec; the code in
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
| `category.create` / `category.update` / `category.archive` | ✅ | ❌ | ❌ |
| `category.assign_facilitator` | ✅ | ❌ | ❌ |
| `space.create` | ✅ (any category) | ✅ (assigned category) | ❌ |
| `space.update` | ✅ | ✅ (assigned category) | ❌ |
| `material.create` | ✅ | ✅ (assigned category) | ❌ |
| `material.upload_version` | ✅ | ✅ (assigned category) | ❌ |
| `material.submit_review` | ✅ | ✅ (authored draft) | ❌ |
| `material.publish` | ✅ | ✅ (assigned category, **reviewer ≠ author**) | ❌ |
| `material.archive` | ✅ | ✅ (assigned category) | ❌ |
| `material.read_draft` | ✅ | ✅ (assigned category) | ❌ |
| `material.read_published` | ✅ | ✅ | ✅ (audience match) |
| `material.download` | ✅ | ✅ | ✅ (audience match) |
| `assessment.configure` | ✅ | ✅ (assigned category) | ❌ |
| `assessment.take` | ✅ (audited, no answer-key access) | ✅ | ✅ (enrolled + attempts left) |
| `assessment.override_score` | ✅ (reason + audit) | ❌ | ❌ |
| `enrollment.self` | ✅ | ✅ | ✅ (open spaces) |
| `enrollment.assign` | ✅ | ✅ (assigned category) | ❌ |
| `comment.create` / `comment.edit_own` | ✅ | ✅ | ✅ |
| `comment.moderate` | ✅ (any) | ✅ (assigned spaces) | ❌ |
| `message.send` | ✅ | ✅ (assigned learners, admins, peers in category) | ✅ (peers, facilitators, admins) |
| `message.read_thread` | ✅ (only with DPO‑approved investigation, audited) | own threads | own threads |
| `notification.broadcast` | ✅ | ✅ (space announcement, assigned space) | ❌ |
| `notification.view` | ✅ | ✅ | ✅ (own) |
| `analytics.view_personal` | ✅ | ✅ | ✅ (own) |
| `analytics.view_cohort` | ✅ (national) | ✅ (assigned categories/regions) | ❌ |
| `analytics.export` | ✅ (audited) | ✅ (assigned scope, audited) | ❌ |
| `audit_log.read` | ✅ (all, reading is audited) | ✅ (own space events only) | ❌ |
| `maintenance_banner.manage` | ✅ | ❌ | view only |
| `certificate.verify` | public (no session) | public | public |
| `certificate.revoke` | ✅ (audited) | ❌ | ❌ |

## 2. Scope resolution

`scopeFor(action, target)` must be resolved **from the database**, never from the request payload:

* Facilitator scope = `categoryIds` from `category_facilitators` (+ `region` if regional).
* Space scope inherits its category; material inherits its space.
* Audience match for learners = `audienceRegion IS NULL OR audienceRegion = user.region` (and the
  same for directorate/cadre).
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
