# ADR-0021 — The library is a reading surface

**Status:** accepted · **Date:** 2026‑11

**Context.** The catalogue (the "library" tab) links to a training so people can
read what was covered and open its files. But the training page it opened was the
*register's* page, complete with the edit form, the archive button, the cover
uploader and the resource uploader — shown to anyone with `training.manage`. An
administrator reading a write-up was therefore looking at a page of levers, and
the difference between "read this" and "change this" disappeared exactly where
people spend most of their time.

**Decision.**

1. A training opened **from the library** (`?from=library`) renders as a reading
   page: write-up, files, discussion. No edit form, no archive panel, no review
   decision panel, no cover uploader, no resource uploader — the same page a
   learner sees. The link back says "Back to the library".
2. `/trainings` (the register) keeps every management surface. Editing stays where
   the work is; reading stays where the reading is.
3. The same rule as ADR-0020 applies to the tiles: the whole card is the link, and
   the link sits **above** the content. Painted underneath, headings and
   paragraphs swallow the click and only the padding responds, which reads as a
   broken tile.

**Consequences.** (+) A reading page is a reading page, whatever your role; nothing
is hidden that a learner would see, and nothing appears that they would not. (−)
The management controls are one navigation away rather than on the page, and two
URLs for one record must both stay honest — the read-only flag is a query
parameter, so a hand-typed `/trainings/<id>` still opens the register's view.
