## ADR‑0032 — A fourth role: District HR, scoped to one district

**Status:** accepted · **Date:** 2026‑11

**Context.** The district is where the establishment is actually run: people are
posted, facilities open and close, and grievances originate there. Until now only
a regional system administrator could create an account, reset a password or
close one, so every one of those acts was a message to Wa and a wait. Giving
district officers the administrator role outright would hand them the whole
region — including the taxonomy, which decides what exists for every district at
once, and the ability to create more administrators.

**Decision.** `user_role` gains `DISTRICT_HR`. The authority it carries is the
administrator's, less everything that reaches past a district:

* **People, inside their district.** Create, edit details, deactivate,
  reactivate, reset a password, read PII. They may hand out **staff, facilitator
  and unit head** — running the establishment is the job — but not
  administrator and not another District HR, because either would multiply
  authority over their own district without anybody above them deciding to.
* **Not** the programme taxonomy or area grants (regional), not bulk import (a
  regional sheet), not the maintenance banner, not authoring or approving
  trainings.

The boundary is `users.district_id`, a foreign key resolved from the district
names already in the staff sheet, **not** `users.district`, which is free text:
a boundary drawn on "Wa" would leak into "Wa East". One district per officer.
A `DISTRICT_HR` row with no `district_id` can do nothing at all — the scope
refuses to build a filter, rather than becoming a query for "everybody whose
district is unknown".

Geography, notices and complaints inside the district are the role's **next**
slice, not this one: their screens are still administrator-only and the
capability is deliberately left off, because switching it on before the queries
carry the district filter would open a route that edits every district.

**Consequences.** One more enum value, one more matrix row and one scope module
(`src/lib/server/district-scope.ts`) that every people action goes through. The
matrix row is written as the administrator's row minus exceptions, so a newly
added action defaults to "the administrator's answer" and any exception has to be
argued for in a test. The cost is that a district HR cannot be given one district
in one region and another elsewhere — that constraint is the point.
