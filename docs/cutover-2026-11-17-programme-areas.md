# Cutover note — categories and spaces → programme areas

**Date:** 17 November 2026 · **Project:** `cnrbtodbgiczblwvfvzq` (ghs-etraining-hub, eu-west-3)
**Decision:** [ADR-0014](decisions/0014-programme-areas-replace-directorates.md)

## What changed

`categories`, `spaces` and `category_facilitators` are gone. Programme **field → area**
is now the only filing system in the platform: it files material, it files trainings, it
decides which facilitator may author where, and it carries the audience (region,
directorate, cadre) that targeting reads.

## What was preserved

| Table | Before | After |
| --- | --- | --- |
| `users` | 7 | 7 |
| `materials` (+ versions) | 10 (+10) | 10 (+10), every one filed under a real area |
| `material_progress` | 40 | 40 |
| `facilitator grants` | 5 directorate grants | 21 area assignments |
| `audit_logs` | 22 | 22 |
| `programme_fields / areas` | — | 10 / 41 |
| `regions` | 0 | 16 |

## Where the material went

Each of the ten documents was matched by name to the closest GHS programme area — none were
parked in a generic bucket.

| Material | Programme area |
| --- | --- |
| GTAT | PF-CLIN-02 Clinical Service Development |
| GHS Standard Precautions SOP — 2026 Revision | PF-CLIN-03 Quality Assurance |
| Hand Hygiene Compliance Audit | PF-CLIN-03 Quality Assurance |
| PPE Donning & Doffing | PF-CLIN-03 Quality Assurance |
| Partograph Completion Standard | PF-FAM-02 Reproductive and Child Health |
| Risk Communication During an Outbreak | PF-HPR-05 Health Communication |
| Cold Chain Temperature Monitoring | PF-PH-01 EPI |
| Cold Chain Temperature Log — Correct the Errors | PF-PH-01 EPI |
| Malaria Case Management — Test, Treat, Track | PF-PH-03 NMCP |
| IDSR Immediately Notifiable Diseases | PF-PH-06 Surveillance |

Directorates became fields: PHD + DCD → **Public Health**, FHD → **Family and Health**,
ICD → **Clinical Care**, HPD → **Health Promotion**.

## Facilitator access

The five directorate grants became 21 area assignments, so every facilitator keeps the
reach they had: a Public Health grant covers all six Public Health areas. The two grants
that both pointed into Public Health collapsed onto the same areas — that overlap is why
the migration needed `SELECT DISTINCT` and why this was caught on live data rather than in
the fixture.

Review and change these from **Programme fields → People (n)** on any area: pick a person
to give them the area, or remove them. Removing an area never unpublishes their material.

## Reviewing `legacy_taxonomy_backup`

The old rows were copied, not destroyed, so the mapping above can be audited before the
table is dropped. It holds 18 rows — 5 categories, 8 spaces, 5 category grants — as `(entity, payload)` pairs where `payload` is the original row.

```sql
-- the 18 archived rows, one JSON object each
select entity, taken_at, payload
from legacy_taxonomy_backup
order by entity, payload ->> 'name';

-- the old categories beside the field each one became
select payload ->> 'code' as old_code,
       payload ->> 'name' as old_name,
       f.code as new_field,
       f.name as new_field_name
from legacy_taxonomy_backup
left join programme_fields f on f.code = case payload ->> 'code'
  when 'CAT-PHD-01' then 'PF-PH'  when 'CAT-DCD-04' then 'PF-PH'
  when 'CAT-FHD-03' then 'PF-FAM' when 'CAT-ICD-02' then 'PF-CLIN'
  when 'CAT-HPD-05' then 'PF-HPR' end
where entity = 'categories'
order by old_code;

-- the eight former spaces, beside the area their material now lives in
select payload ->> 'slug' as slug,
       payload ->> 'title' as title,
       a.code as area_code,
       (select count(*) from materials m where m.programme_area_id = a.id) as materials_in_area
from legacy_taxonomy_backup
left join programme_areas a on a.code = case payload ->> 'slug'
  when 'cold-chain-and-vaccine-management' then 'PF-PH-01'
  when 'malaria-case-management'          then 'PF-PH-03'
  when 'integrated-disease-surveillance'  then 'PF-PH-06'
  when 'emergency-obstetric-care'         then 'PF-FAM-02'
  when 'risk-communication'               then 'PF-HPR-05'
  when 'triage-and-emergency-care'        then 'PF-CLIN-02'
  when 'ppe-donning-and-doffing'          then 'PF-CLIN-03'
  when 'standard-precautions-sop'         then 'PF-CLIN-03' end
where entity = 'spaces'
order by slug;
```

When the mapping reads correctly, drop it:

```sql
drop table if exists legacy_taxonomy_backup;
```

Nothing in the application reads that table, so dropping it changes no behaviour. Before
dropping, take a `pg_dump --table=legacy_taxonomy_backup` if the row-level detail matters
for the audit trail.

## If something looks wrong

- **A material sits in the wrong area** — open it in Library → Edit and change the area; no
  migration is needed.
- **A facilitator cannot author** — check **Programme fields → People** for that area.
- **A training cannot be created** — the form needs a field *and* an area; areas exist for
  all ten fields, so this usually means a stale tab loaded before the deploy.

`drizzle/0004` and `drizzle/0005` are applied to production; their hashes are recorded in
`drizzle.__drizzle_migrations`. Do not re-run either. See [migrations](migrations.md).
