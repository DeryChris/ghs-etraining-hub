# ADR-0022 — Short forms, visible answers, and reading in place

**Status:** accepted · **Date:** 2026‑11

**Context.** Three complaints with the same shape: the interface asked for more
attention than the task deserved.

* A thirteen-field form in one undivided grid. People stopped halfway, or did not
  start.
* Submitting returned a message at the bottom of the page, below the fold on a
  phone — a saved record and a rejected one looked identical.
* A training in the library navigated away to the register's page, which is a
  management page with levers on it, to read a paragraph.

**Decision.**

1. **Long forms are stepped.** `FormSteps` splits the training form into *the
   basics*, *where and when* and *the record*, and the new-staff form into *who
   they are* and *posting and role*. Every panel stays mounted (inactive ones are
   `hidden`), so the browser still posts every field, dependent selects keep their
   state, and nothing has to be re-entered when a step is revisited. The form runs
   `noValidate`: on submit the component finds the first invalid control, brings
   its step into view and only then asks the browser to complain — a required field
   on a hidden step otherwise fails silently, which is worse than a long form.
2. **Every submission answers.** `FormFeedback` renders the pending state, the
   success and the failure next to the submit button, announced to screen readers
   and scrolled into view. A failure says explicitly that nothing typed was cleared
   (ADR‑0020 keeps it).
3. **Reading happens in place.** A training opened from the library opens in an
   overlay over the catalogue, loaded on demand by a server action that applies the
   same visibility rule as the page. The card stays a real link, so a new tab, a
   middle-click and an "open the full page" link all still work.
4. **Overlays scroll properly.** The dialog's title is fixed and only the body
   scrolls, inside a thin, inset track (`.overlay-scroll`) — a long edit form no
   longer loses the line saying which record it is editing.
5. **Destructive actions are confirmed.** Geography's delete/deactivate buttons
   open a panel that states the consequence, with "Keep it" beside the confirm.
6. **The role people read is Staff.** The key stays `LEARNER`; the label, the
   filters, the counts and the copy say Staff, and the Users tab carries a Staff
   lens beside Facilitators, Unit heads and Admins.

**Consequences.** (+) Shorter lists at any moment, an answer after every submit, a
library that behaves like a reading room. (−) `FormSteps` owns the submit logic, so
a form that uses it must not run its own `preventDefault`; and a step that is
skipped is still submitted — the server is what decides what is required.
