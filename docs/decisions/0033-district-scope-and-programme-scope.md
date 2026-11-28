## ADR‑0033 — Two boundaries: a district, and a programme

**Status:** accepted · **Date:** 2026‑11

**Context.** ADR‑0032 gave District HR the people register and stopped there,
because the neighbouring screens had no boundary to stand on: the geography page
listed every region, the complaint queue listed every complaint, and a complaint
had no district column at all. Meanwhile a facilitator — and a unit head, who is
a facilitator carrying the `is_unit_head` duty — could open any training by id,
archive it, attach a file to it or comment on it, even though the review queue
already knew which programme areas they held.

Two boundaries were needed, and they are different kinds of boundary:

* a **district** is a place, and the row that names it must be a foreign key;
* a **programme** is an assignment, and it must be read from the grants that
  exist at the moment of the request.

**Decision — the district.** `complaints.district_id` (migration `0025`) is a
uuid foreign key to `districts`, `on delete set null`. It is written when the
complaint is filed, from the filer's account; the migration backfills existing
rows from `users.district_id` and then from an exact facility-name match. A
complaint that matches neither keeps `null`, and `null` means **in no district's
queue**: the administrator still sees it, no officer does. Guessing a district
would hand a grievance to the wrong officer, which is worse than an extra review
in Wa.

`geography.manage` turns on for District HR in the same change as the filter.
Regions and districts remain administrator-only *inside the action*, not merely
by hiding a button: `manageNational` refuses anybody but an administrator, and
each sub-district and facility action re-reads the row's district before writing,
because the id in a posted form is the caller's to choose. The page loads
`listGeographyForDistrict`, so the tree they see is one region holding one
district.

**Decision — the programme.** `src/lib/server/programme-scope.ts` reads the two
grant tables on every request (`field_facilitators` = a whole Programme Area,
`area_facilitators` = one Programme Field) and returns a predicate over
`training_sessions`. It is applied in three places:

1. **Visibility.** `trainingVisibilityFilter` ANDs the grants with publication, so
   the list, its counters and the record page show only the programmes the
   facilitator holds — plus their own drafts. Empty grants mean an empty register,
   not the region's.
2. **Writing.** Editing, attaching, commenting and archiving check the posted
   training id against the grants, so a URL typed from memory cannot reach a
   record the register does not show.
3. **Choosing.** The create form offers only granted Programme Fields, so no
   option exists that the action would then refuse.

Administrators are unrestricted; learners are limited by publication rather than
grants; everyone else is view-only. The unit head's width comes from the grant
they were given, not from a wider role: a `field_facilitators` row covers the
whole Programme Area including fields created later, an `area_facilitators` row
covers one Programme Field.

**Consequence.** Notices are the one piece of the district brief still switched
off. The audience filter holds region, directorate and grade; a broadcast from a
district officer would reach the region. Adding a `district` dimension to
`AUDIENCE_KEYS` is the change that turns `notification.broadcast` on, and it is
deliberately not smuggled in here.
