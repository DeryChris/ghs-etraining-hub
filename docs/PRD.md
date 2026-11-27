# Product Requirements Document — GHS-UWRHD Training Library

**Status:** Current product baseline · **Reviewed:** 27 November 2026

**Product identifier:** `GHS-UWRHD-TL` · **Product name:** GHS-UWRHD Training Library

**Service scope:** Upper West Region, Ghana

**Implementation contract:** [`AGENTS.md`](../AGENTS.md)

This document replaces the obsolete national-rollout/CPD requirements previously in this file.
Current decisions are recorded in the accepted ADRs, especially [0012](./decisions/0012-sessions-geography-and-traffic.md),
[0014](./decisions/0014-programme-areas-replace-directorates.md), [0026](./decisions/0026-no-marks-no-certificates.md),
[0028](./decisions/0028-no-signature.md), and [0030](./decisions/0030-accounts-are-claimed.md).
ADR-0011 is historical: its original decision to keep prior certificates and `/verify` was superseded
by ADR-0026. Where older documents conflict with the current behavior below, the current
implementation and later accepted decisions take precedence.

## 1. Product scope

The GHS-UWRHD Training Library is an institutional service for organising and accessing Ghana Health
Service training materials associated with programmes in the Upper West Region. It is not a
nationwide rollout. Other Ghanaian region names present as reference geography do not imply service
availability outside Upper West.

The public-facing hierarchy is:

**Programme Areas → Programme Fields → Training Materials**

A Programme Area contains Programme Fields. Training Materials are filed under a Programme Field and
retain their parent Programme Area. The legacy schema names are intentionally different:
`programme_fields` stores parent Programme Areas, `programme_areas` stores child Programme Fields,
and `materials.programme_area_id` points to the child Programme Field. See [`data-model.md`](./data-model.md).

The product also has a signed-in Trainings register for planned and recorded training events. These
events are not a record that an individual completed a course, earned a credit or received a
certificate.

## 2. Public and signed-in experiences

### Public Programme browse

Anonymous visitors can browse the database-backed public taxonomy without entering the signed-in
Library:

1. `/programmes` lists visible Programme Areas.
2. Opening a Programme Area shows its visible Programme Fields.
3. Opening a Programme Field shows the Training Materials currently published and visible to the
   public under that field.

The material list uses the same publication and visibility rules as the public counters. Draft,
in-review, withdrawn, archived and restricted material must not appear in public browse. Public
material cards must not expose staff names, Staff IDs or other directory PII. A field with no public
material shows an honest empty state. A database error must not be presented as a genuine empty
catalogue.

### Signed-in Library

`/catalogue` is the authenticated catalogue, with its own search, filters, pagination and
role-/audience-aware access rules. It remains separate from the signed-out `/programmes` hierarchy.
Public browse is not a replacement or alias for `/catalogue`; the two surfaces may have different
results because signed-in users can have different access.

Signed-in users can also use role-authorised surfaces such as the dashboard, Trainings, messages,
notifications, authoring, review, administration and insights. The capability matrix and route guards
in `docs/rbac.md` and `src/lib/rbac/` govern access; hiding a navigation item is not authorization.

### Account setup

`/register` does not create an arbitrary staff identity. It checks the GHS Staff ID against an
existing active, unclaimed directory row. If eligible, the person supplies contact details and sets
a password; the directory facts are read back by the server. The application does not make a live
HRIMS query. Staff-directory records are supplied through operator-managed data/import workflows.
People without a matching or claimable row must use the public support/complaint path.

## 3. Database-backed public counts

The landing-page statistics are aggregates from the database, not constants, sample data or manually
entered marketing figures:

- visible Programme Areas;
- visible Programme Fields;
- currently public, published Training Materials;
- published, unarchived Training Sessions recorded for the Upper West Region only.

Taxonomy and material counts use the same visibility predicates as public browse. Training totals are
filtered by the Upper West region code and publication/archive state. The aggregate response is cached
for five minutes; it is database-derived, but not a real-time counter. If there is no eligible data,
the truthful value is zero. If the aggregate query fails, the statistics section is omitted rather
than rendered as zero.

Do not infer individual attendance, learner completion, clinical coverage or nationwide activity
from these aggregate values. A Training Session is an event record; it does not certify an individual.

## 4. Content and operational workflows

- Programme taxonomy is reference data maintained by authorised staff. Seed data may install the
  source-backed taxonomy, but must not invent additional Areas or Fields.
- Materials follow the existing authoring workflow: draft, upload, review, publish, supersede or
  archive. Publication requires the configured second-person review rule, subject to the audited
  system-administrator override.
- Public and signed-in queries must exclude material outside the caller's visibility scope. Public
  records may be cached only with the existing invalidation strategy; do not leak restricted
  audience data through aggregates or previews.
- Opens and controlled downloads may be recorded against the material/version for operational
  activity. They are not a completion, assessment, signature, CPD award or certificate.
- Training records use the geographic hierarchy and Upper West service scope. Public training
  totals include only published, unarchived records linked to Upper West.
- Seed operations are idempotent and non-destructive. On a fresh database, `npm run db:seed` adds
  reference taxonomy, reference geography and a passwordless bootstrap administrator. It does not
  reset an existing administrator password or create a learner roster, sample materials or training
  sessions, and it does not clean up pre-existing rows.

Detailed schema invariants, migrations and operational commands are in [`data-model.md`](./data-model.md),
[`architecture.md`](./architecture.md), and [`deploy-vercel.md`](./deploy-vercel.md).

## 5. Explicit exclusions

The current release is an informational Training Library, not a learning-outcomes or credentialing
platform. The product does not provide:

- CPD points, credits, cycles, targets or recertification;
- in-product learner assessments or attempt tracking, marks, scores or individual completion states. A
  Training Material may be an `ASSESSMENT_LINK`; the Library stores the resource, not responses or scores;
- acknowledgements or signatures asserting that a person completed or read material;
- certificate awarding or public certificate verification; or
- a national or multi-region service rollout.

Do not reintroduce these concepts through navigation, public copy, seed data, analytics, mockups or
route links without a new approved product decision and implementation.

## 6. Content and copy constraints

- Never imply that a Training Material, Training Session, named resource, approval record or statistic
  exists unless it comes from current source-backed database records.
- Mark a capability illustration as illustrative and avoid specific fake titles, dates, version
  numbers, people or approval histories that could be mistaken for real records.
- Describe material availability conditionally where the underlying catalogue may be empty. Keep the
  zero-result and error states distinct.
- Use **Programme Areas → Programme Fields → Training Materials** consistently in user-facing copy.
  Do not use the old directorate/space hierarchy as current product terminology.
- Keep public browsing separate from the signed-in `/catalogue`.
- State Upper West scope where availability is described. National reference region names do not
  signal deployment beyond the Upper West Region.
- Do not claim a live HRIMS integration, open account creation for arbitrary visitors, or that staff
  identities are created through `/register`.

## 7. Acceptance checks

A change to public browse, counts, copy, seed data or authentication is acceptable when:

1. Public navigation is Programme Areas → Programme Fields → Training Materials and follows the
   real parent-child taxonomy mapping.
2. Public Programme Area/Field pages show only database-backed, publicly visible records, expose no
   staff PII, and render an empty state for a legitimate zero-result query.
3. `/catalogue` remains signed-in and functionally distinct from public browse.
4. Public statistics use database aggregates and the same visibility rules, with Training Session
   totals scoped to Upper West and filtered to published, unarchived rows.
5. Registration only claims an eligible existing directory record; arbitrary or ineligible IDs do
   not create users.
6. No copy or UI implies nationwide availability, CPD, scoring, completion, certificate issuance or
   verification.
7. The seed creates reference data and the bootstrap administrator only; it does not add demo
   learners, materials or training sessions.
8. Public and learner browser tests in `tests/e2e/public.spec.ts` and
   `tests/e2e/learner.spec.ts` match the behavior above.

Run the project verification gates from [`qa.md`](./qa.md).