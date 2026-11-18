# ADR‑0014 — One taxonomy: programme fields and areas replace directorates and spaces

**Status:** accepted (supersedes the "two taxonomies" deferral in ADR‑0013) · **Date:** 2026‑11

**Context.** ADR‑0013 introduced programme fields and areas for trainings and deliberately left the
older structure — directorates (`categories`) → spaces → materials — in place, on the grounds that
merging them would re-file every existing space and material under a mapping GHS had not confirmed.
Living with both for a week answered the question: they are the same question asked twice. A learner
looking for the malaria protocol had one door (Directorates → Disease Control → Malaria Case
Management) and a training about malaria had another (Trainings → Public Health → NMCP). Counts could
not be added up, a facilitator's authority was granted per directorate while their content was filed
per area, and every screen had to explain which of the two words it meant.

**Decision.** Programme fields and areas are the only taxonomy.

1. **`categories`, `spaces` and `category_facilitators` are dropped.** A field holds areas; an area
   holds the materials that teach it, the facilitators assigned to it, and the trainings filed under
   it. `programme_fields` gained `is_restricted` (the flag that used to sit on a directorate) and
   `programme_areas` gained the three `audience_*` columns that used to sit on a space, so cohort
   targeting and staff-only programmes behave exactly as before — they simply live one level down.
2. **Materials moved to `materials.programme_area_id`** (unique per area + title). Enrolments moved
   with them. Nothing was lost: the migration mapped each existing space to the area that teaches the
   same subject and failed loudly on anything it could not map, rather than guessing.
3. **Facilitator authority moved to `area_facilitators`.** Each old per-directorate grant was expanded
   to every area of the field that directorate became — nobody lost reach, and the grant is now as
   precise as the content it protects.
4. **The browse surface is `/catalogue`**: fields → areas → materials. `trainings` stays the register.
   The old `/directorates`, `/directorates/[id]` and `/spaces/[slug]` routes are gone, not aliased:
   bookmarks into a retired vocabulary should fail rather than quietly mean something else.
5. **The Sessions tab is gone.** A session is a training. `/trainings` already records the dates,
   place, target group, attendance and notes a session needed, so the separate form was a second
   place to type the same facts.
6. **Capabilities follow the data**: `category.*` and `space.*` are retired, `area.update` and
   `area.assign_facilitator` replace them, and the facilitator scope key is `areaId` instead of
   `categoryId`. Reference data is administered at `/programme-fields` (`taxonomy.manage`) and
   `/geography` (`geography.manage`), both administrator-only.

**Migration.** `0005_programme_areas_replace_spaces.sql`, applied to the live project:

* the ten fields and forty-one areas are inserted first, because the backfill needs somewhere to
  point (the seeder re-upserts the same rows afterwards, idempotently);
* `legacy_taxonomy_backup` keeps a JSON snapshot of every category, space and facilitator grant
  before anything is dropped — eight spaces and five directorates in the live database, 18 rows;
* a temporary `space_area_map` drives the moves, and two `DO` blocks stop the migration rather than
  leave a material unfiled or a space unmapped;
* ten materials and forty progress rows came through intact, and the five old grants became
  twenty-one area assignments.

**Consequences.**

(+) One vocabulary, so counts add up: "how many people did Public Health train, and what did they
read?" is now one join. A facilitator is assigned to the areas they actually work in. The catalogue,
the library, the register and the insights page all read the same two tables.

(−) A material can only be filed under one area. Where a space genuinely spanned two areas
(precautions covering both quality assurance and occupational health) the more central area was
chosen and the material can be re-filed in the admin screens in seconds. The `users.directorate`
column survives as an HR attribute on a person's profile — it is no longer a taxonomy, and nothing
authorises on it. And the `legacy_taxonomy_backup` table should be dropped once GHS has reviewed the
mapping; it is deliberately not dropped by the migration that created it.
