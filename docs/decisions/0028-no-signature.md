# ADR-0028 — The library does not ask for a signature

**Status:** accepted · **Date:** 2026‑11

**Context.** Since v2 a material could be flagged `requires_acknowledgement`, and
the dashboard opened with a section headed *Waiting for your signature*: protocols
a person had to open and certify they had read the current version of. It carried
a whole second record beside the reading record — `material_progress`, one row per
person per material, holding the version that was signed against — and it wrote
`enrollments` as a side effect, enrolling the signer in the area.

That machinery made a claim the product could not keep. An acknowledgement is a
statement *by a person about themselves*, held by a database, on behalf of a
directorate: nothing in the workflow verified that the document had been read, no
report was ever asked to produce the list, and no page in the product displayed an
enrolment. Meanwhile the same screens said the library was for reading. Two
vocabularies for one surface is how a product starts to feel like a form.

**Decision.** The acknowledgement leaves the product, and it takes with it
everything that existed only to serve it.

1. **No flag, no prompt, no panel.** `materials.requires_acknowledgement` is
   dropped, along with the badge on the material card, the panel on the material
   page, the section on the reading home and the "Protocols to sign" KPI on the
   staff dashboard.
2. **The tables go with it.** `drizzle/0021_retire_the_signature.sql` drops
   `material_progress`, `enrollments` and the `enrollment_source` enum. The
   `enrollment.self` and `enrollment.assign` capabilities go too: nothing can
   enrol anybody when nothing writes an enrolment.
3. **The reading record is the record.** `material_views` says which material was
   opened, by whom, on which day and how often; `MATERIAL_FILE_ISSUED` audit rows
   say what was downloaded. That is activity about a person, not a claim by them,
   and it is what programme teams actually ask for.
4. **The copy says one thing.** The privacy notice, the about page, the terms, the
   QA drills and the staff dashboard describe opens and downloads and stop there.
   Nothing in the interface promises, requests or reports a signature.
5. **One name per surface, while we were here.** The material area is the
   **Library** everywhere it is shown (the route stays `/catalogue`; the label and
   every sentence about it say Library), and the trainings area is **Trainings**
   everywhere — "the register", "Go to the register" and "training register" are
   gone from the interface, the seeded notices and the review panels.

**Consequences.** A database migrated past 0021 has no way to answer "who signed
for the SOP", because the product no longer asks. Where a directorate needs that
attestation it has to come from the training itself — attendance, minutes, a
signed sheet — rather than from a button in a reading library. The staff dashboard
loses one KPI and gains nothing in its place, which is correct: it was the only
card on that row that measured an obligation instead of the service.

The learner's page is simpler by one section and one conditional headline. Its one
essential read is now the record of opens: if that read fails, the page renders a
retry card rather than three empty lists that would claim the person has read
nothing.
