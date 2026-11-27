# ADR‑0012 — A training is a session; traffic is measured per programme

**Status:** accepted · **Date:** 2026‑11

## Context

The library could tell you what exists. It could not tell you **what was used**, or **what ran**. Insights
counted completions and certificates — outputs of a CPD model that ADR‑0011 retires — and the PRD left
"per‑region reach" and "trainings organised" as unmeasured areas while sessions were rolled into a text
`region` field that could hold anything.

Three facts shaped the model:

1. A training is a **dated event** held under a **programme field (area)** — not a property of a document.
   The same protocol is taught in Wa Municipal in March and in Gwollu in July.
2. The event happens somewhere specific: **region → district → sub‑district → facility**. For now the pilot
   is the **Upper West Region**, and facilities are GHS/CHAG facilities that hold stocks and staff —
   hospitals, polyclinics, health centres, clinics and directorates. **CHPS compounds are excluded**: they
   are served by the sub‑district, not by this training calendar.
3. Programme fields and their sub‑areas will be **uploaded by the client later**. Hard‑coding a taxonomy now
   would have to be undone, and any hard‑coded list would be wrong in a way users cannot fix.

## Decision

**Sessions are first class.** `training_sessions` holds a title, the programme (`category_id`), an optional
module (`space_id`), the date it ran, the four geographic keys, the facilitator (a person, or a typed name
for someone not on the platform), attendee count and notes. Only administrators and facilitators may record
one (`training.create`); the role matrix and the capability test enforce that. Dates in the future are
rejected: a session records something that happened. `/sessions` records them and lists recent ones;
`/insights` charts them.

**Geography is normalised, not text.** `regions`, `districts`, `sub_districts` and `facilities` store the
hierarchy with unique natural keys (`regions.code`, `[region_id, name]`, `[district_id, name]`,
`[district_id, name]`), so the seed can be re‑run and extended without duplicates. The migration creates the
tables; `src/db/seed.ts` fills Upper West's 11 districts, the one district whose sub‑districts could be
sourced, and ~25 facilities, and says in its own header that it is a **pilot subset, not the master facility
list**. No full 75‑sub‑district list was ever found, so nothing pretends to be complete.

**Programme taxonomy stays data.** Sessions reference `categories`, the same table the upload and authoring
flows use. When the client uploads programme fields and areas, the sessions form picks them up with no code
change. This is why a session needs a programme but does not require a module.

**Traffic is two events, recorded differently.**

* **Opens** — `material_views`, unique on `(material_id, user_id, viewed_on)`. A person/material pair
  contributes at most one open per Accra calendar day; repeat beacons update `last_viewed_at` but do not
  inflate the count. Analytics counts daily ledger rows, not the legacy `view_count` column. The material
  page mounts a client beacon that POSTs to `/api/materials/[id]/view`; the route always answers `204`,
  never blocks rendering, and **honours Do Not Track**. A counter is not worth a broken page or a tracking
  banner.
* **Downloads** — not a new event type. `MATERIAL_FILE_ISSUED` audit rows already record every controlled
  file that left the platform, per person and per material. Adding a parallel counter would create two
  sources of truth that can drift, and the audit trail is the record that must survive.

**Charts are server‑rendered SVG.** The insights page draws a multi‑series area chart (opens vs downloads by
week), stacked bars (versions uploaded per month, per programme), a monthly session count, ranked bars
(opened per programme; sessions per programme) and a donut (published material by type). Each reads colours
from `--chart-1..8` and gridlines from `--chart-grid` in `globals.css`, so light and dark both work and no
charting dependency was added. Every chart carries its numbers in a native `<details>` table and in `<title>`
elements, because the audience includes people on metered data and screen readers.

## Consequences

* Per‑programme traffic and trainings organised are now real numbers, not aspirations. Per‑**region** reach is
  derivable from sessions and their facilities; it is not charted yet, and the page says so rather than
  drawing a map of guesses.
* The seed's partial geography is honest but incomplete. When the client supplies the facility list, it
  becomes another data file or an upload; nothing in the schema changes.
* `material_views` grows one row per person per material per day — small, bounded, and prunable by date if it
  ever matters. Views are deliberately *not* backfilled: charts start from the deploy, and an empty chart is
  labelled as "no opens recorded yet" rather than shown as a zero.
* Time‑to‑publish is still not measured; it needs a `published_at` stamp and is the next figure to add.
