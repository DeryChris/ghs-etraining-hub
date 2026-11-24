# ADR‑0013 — The Trainings register, and two surfaces for reference data

**Status:** accepted · **Date:** 2026‑11

**Context.** The product shipped with two overlapping ideas of "a training". `categories` →
`spaces` → `materials` is a *library* taxonomy: a directorate owns spaces, spaces own material, and
facilitator authority is scoped to the directorates they are assigned to. `training_sessions` is a
*field* record: a training that ran, at a place, on a date, filed under a category. What GHS actually
plans and reports on is a third thing — the training plan: a title, a plan year, a programme field,
the area inside that field, a target group, a place (region → district → sub‑district → facility), a
start and end date, a duration and a venue. They supplied that vocabulary as a document of ten
fields and forty‑one areas ("Programme Fields and Sub‑Areas"), together with screenshots of the
HRIMS form they use today.

The Learn section also offered "Programmes", which opened the directorate catalogue
(`/directorates`) — a browsing surface for material, wearing the name of the thing staff plan.

**Decision.**

1. **"Programmes" becomes "Trainings"** in the signed‑in menu, for every role, and it opens
   `/trainings`: the register, with an enriched filter bar (search, year, programme field, programme
   area, region, district, status), counters, pagination, and a "New training" action at the top
   right. The directorate catalogue is unchanged at `/directorates` and stays reachable from the
   register header and the Library; it is a browsing destination, not a planning one.
2. **Programme fields and areas are new reference tables**, not a re‑parenting of `categories`.
   `programme_fields` ← `programme_areas`, seeded from the GHS document, keyed on stable codes
   (`PF‑ADM`, `PF‑ADM‑01`) so a revised list updates in place rather than duplicating. They are
   administered at `/programme-fields` (`taxonomy.manage`, administrator only).
3. **`training_sessions` becomes the register.** It gains `year`, `programmeFieldId`,
   `programmeAreaId`, `targetGroup`, `endsOn`, `durationText`, `status`, `venue`; `categoryId`
   becomes nullable, because a plan filed through the register is classified by field and area, not
   by directorate. `organisedOn` remains the start date. Existing rows are preserved: the migration
   backfills `year` from `organisedOn` and defaults `status` to `COMPLETED`.
4. **Geography gets an administration surface** (`/geography`, `geography.manage`, administrator
   only): regions → districts → sub‑districts → facilities, drill‑down by query parameter, forms
   posting Server Actions so the page works without JavaScript.
5. **Capabilities are renamed and added** rather than overloading `training.create`:
   `session.create` (category‑scoped, what the Sessions page always meant), `training.manage`
   (global for staff — a training is field work), `taxonomy.manage`, `geography.manage`
   (administrator only). docs/rbac.md carries the matrix, and the capability test still sweeps every
   action for every role.
6. **The sidebar is GHS green in both themes.** It carries the crest, one kente‑derived weave at
   under 10% opacity, the flag hairline and an outline of the black star; the active item is the
   gold band with near‑black ink (12:1), and white text on the green is 7:1.

**Consequences.**

(+) One place to plan a training, one place to look for it afterwards; coverage can be counted by
programme field, which is the unit the Ministry reports in. The taxonomy and the geography are
editable by the people who own them, so a misspelt district stops being permanent. Reference data is
archived, never deleted, and every write is audited with the actor.

(−) Two taxonomies now exist side by side: `categories` (library, facilitator scope) and programme
fields/areas (training plans). Merging them is the better end state and is deferred until GHS
confirms the mapping between a directorate and a programme area — guessing would re‑file every
existing space and material under names nobody approved. Until then, a training filed through the
register carries no category, which is why the Sessions page and the insights chart join them with
`LEFT JOIN` and why a facilitator's category‑scoped insights do not include them. The `year` column
is denormalised (it can be derived from `organisedOn`); it is stored because the plan year is a
reporting label that deliberately may differ by one from the start date, and filtering on it must
not mean recomputing it per row.
