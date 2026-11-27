# ADR-0026 — No marks, no certificates

**Status:** accepted · **Date:** 2026‑11

**Context.** The award model was retired in ADR‑0011: the `certificates` table
went, the verification route went, and the marketing copy stopped promising a
credential. What stayed was the machinery behind it, and the vocabulary around
it — a *Pre/Post Test* destination that ranked people by pass mark and best
score, a material page that said "mark the material complete", and sentences in
the terms, the privacy notice and the FAQ that explained at length what the
library did **not** award. A disclaimer is still a paragraph about certificates.
Somebody opening the product read about scores, transcripts and completions, and
reasonably concluded the product was about them.

The library is an information service: a member of GHS staff finds the material
for a training they attended, reads or downloads it, and signs an acknowledgement
where a protocol asks for one. That is the whole loop.

**Decision.** Nothing in the product describes, records or ranks learning
outcomes.

1. **The Pre/Post Test surface is gone.** `/assessments` is deleted, with its
   navigation entry, `assessment-queries.ts`, the three capabilities behind it
   (`assessment.configure`, `assessment.take`, `assessment.override_score`) and
   the enrolment/attempts scope that only that page consulted. There is no score,
   pass mark, attempt count or transcript anywhere in the interface.
2. **The tables go with it.** `drizzle/0020_retire_the_marks.sql` drops
   `assessment_attempts`, `assessment_items` and `assessments`. A material may
   still be of type `ASSESSMENT_LINK` or `LAB` — a training can attach the paper
   a facilitator hands out — but what the library keeps is the paper.
3. **The word "finished" leaves the interface.** A material is *opened* or
   *downloaded*; an acknowledgement is *signed* against a version. No page asks
   anybody to "mark it complete", and no page claims a completion was recorded.
4. **The disclaimers are deleted, not softened.** Terms, privacy and the FAQ now
   state what is kept (opens, downloads, acknowledgements, against a version) and
   stop there. Saying "this is not a certificate" keeps the subject on the page.
5. **The complaint form asks one thing.** "In a few words" asked the reporter to
   summarise what they were about to describe. It is gone; `What happened?` is the
   only narrative field, and the subject line the desk reads is cut from its first
   sentence server-side (`summarise()`), so no case is filed without one.

**Consequences.** Training attendance is still recorded on the training register
(`training_status = COMPLETED` means *the training ran*, which is a fact about the
event, not about a person). Facilitators lose the attempt history they could
technically see; in practice no question bank was ever attached, and every test
listed there was already facilitator-led. `docs/data-model.md` and `docs/rbac.md`
lose their assessment sections, and the action vocabulary shrinks from 38 to 35 —
a floor the capability test now asserts against rather than a pinned number.

**Alternatives considered.** Keeping the page but removing the scores was the
first instinct; it leaves a menu item that leads to a list of tests the product
cannot run, which is worse than not offering it. Rewording the disclaimers to be
"neutral" was rejected for the reason in §4.
