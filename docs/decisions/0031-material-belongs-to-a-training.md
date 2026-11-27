## ADR‑0031 — Material belongs to a training, not to a programme

**Status:** accepted · **Date:** 2026‑11

**Context.** The product carried two document systems. `materials` were versioned
teaching objects filed under a programme area: written in an authoring workspace,
sent for review, published, and then browsed in a library that was organised by
programme area and field. `training_resources` were the deck, the attendance sheet
and the report attached to one event. They overlapped in what they held — slides,
PDFs, spreadsheets — and were separated only by where they were filed.

Two effects followed. The library showed documents that belonged to no training,
so a reader could not tell what a document was used for or which cohort it was
written for. And "upload a document" was a destination of its own, which made the
service read like a document repository with trainings attached, rather than a
record of what GHS taught and what it handed out.

**Decision.** A file is uploaded from the training it belongs to, and nowhere
else.

- The authoring workspace (`/authoring`), the material viewer (`/materials/[id]`)
  and the material file API are removed, along with the "My materials" door.
- The library keeps its taxonomy — programme area, then field — but lists
  trainings rather than documents. Old `?q=` links are forwarded to the trainings
  list, which does have a text search.
- `training_resources` is the one place a file is attached. Its upload path
  (presign, record, replace, remove) was already built; it is now the only one.
- The `materials` tables are **not** dropped. Existing rows are the record of what
  was published; a migration that destroys them buys nothing this decision needs,
  and the review queue still reads them for versions already in flight.

**Consequences.** Positive: one place to upload, one meaning for "the slides from
that training", and the library answers "what was taught" instead of "what
documents exist". The learner home loses its reading record (opens, "pick up where
you left off") because those rows describe material that no longer has a page.

Negative: staff can no longer publish a standing reference document that applies
between trainings; it has to be attached to a training, or the product needs a new
concept for it. The dead authoring actions and components are left in the tree for
one more wave rather than deleted in the same commit as the route removal, so the
diff stays reviewable.
