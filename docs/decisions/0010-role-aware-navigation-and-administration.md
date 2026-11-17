# ADR‑0010 — Role‑aware navigation, and the administration surfaces behind it

**Status:** accepted · **Date:** 2026‑11

## Context

The signed-in sidebar was one list with a single branch: learners saw three sections, everybody else saw
the same list plus an "Author" group. That produced three problems:

1. **Facilitators had more doors than were shown and administrators had fewer than they needed.** Nothing
   in the UI reached `/notices` except by typing the URL for some roles; no surface existed for the staff
   directory, service insight, labs/assessments or deployment settings, so those pages simply did not exist
   even though the capability matrix already granted the actions.
2. **Visibility decided by role, one page at a time.** Each `requireRole` call encoded its own idea of who
   should see what, so the menu and the guards could disagree.
3. **The gap list is not the menu's job.** An unbuilt feature should be named as unbuilt; a menu entry
   that 404s is worse than no entry.

## Decision

**The menu is pure data with a role on each item.** `src/lib/nav.ts` declares sections (`Learn`,
`Community`, `My record`, `Author`, `Administration`) and, per item, the roles that may see it. `navFor(role)`
filters items, drops sections that lose all of theirs, and never reorders what remains. The module is
React‑free so it is unit‑tested (ten cases, including "an administrator has no authoring workspace" and
"the dashboard is not highlighted on every page"). Icons are resolved in the sidebar from a name, which is
what keeps the model pure.

**The final menu, by role**

| Section | Administrator | Facilitator | Learner |
| --- | --- | --- | --- |
| Learn | Dashboard · Programmes · Library · Pre/Post Test | same | same |
| Community | Messages · Notifications | same | same |
| My record | My CPD · Insights | same | My CPD |
| Author | Review queue | My materials · Review queue · Send notice | — |
| Administration | Users · Settings | — | — |

**Four new destinations, each honest about its state.**

* `/assessments` — every published pre-test, post-test and practical lab in scope, with the viewer's own
  attempts, best score and progress. A test with no question bank is labelled facilitator-led; sitting a
  test is still a facilitator-led step on the material page, and the page says so.
* `/insights` — coverage, backlog and completion, scoped to the whole service for an administrator and to
  assigned categories for a facilitator. The dashboard carries a four‑stat overview of the same numbers.
  Downloads-per-material and per-region reach are explicitly listed as not measured yet.
* `/users` — the staff directory: search, filters, server pagination, create, change role, deactivate or
  reactivate, and re-send the set-password link. Creating a person inserts the directory row first (that is
  what grants authority) and then tries to provision the Supabase login; when the service key or mail
  delivery is missing the message says exactly what to run instead.
* `/settings` — a read‑only statement of how the deployment is configured, the policies enforced in code,
  and the settings that are still to be built, each with where it lives today. No switch that does nothing.

**Invariants are enforced on the server, not by hiding buttons.** An administrator cannot change their own
role or close their own account, and the last active administrator can never be demoted or deactivated.
Every directory mutation runs through `checkCapability` and writes its audit entry in the same transaction
as the change (ADR‑0006 keeps the actor id valid forever).

**Shared predicates moved out of the queries that happened to define them.** `visibility.ts` owns
"published and live and in my cohort"; `scope.ts` owns "the categories this facilitator is assigned to".
The library, the assessment index and the insights page now read the catalogue the same way, so a
difference between two copies of an access rule cannot creep in.

## Consequences

(+) The menu and the guards cannot disagree about who may reach what. (+) Administrators can run the
directory from the product instead of SQL. (+) Review backlog, coverage gaps and completions are visible
without a query console. (+) Every new page states what it does not do yet.
(−) `navFor` is a second place a role is mentioned; the unit tests and the `requireRole` calls keep them in
step, but adding a role means touching both. (−) The insights aggregates are six queries per load (the
dashboard pays for four of them); fine at this data size, and the counts are indexed, but a materialised
summary is the next step if the catalogue grows.
