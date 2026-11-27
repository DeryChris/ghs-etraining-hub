# ADR-0025 — Complaints about files, and menus that match the product

**Status:** accepted · **Date:** 2026‑11

**Context.** Two problems with one shape: the interface knew less than the person
using it.

* "The wrong document is attached" and "the document will not open" both had to be
  filed as *Course related*, so the desk read the description to discover whether
  it needed to fetch an object or ask for a replacement — and often had to write
  back to ask *which* training, because nothing had recorded it.
* Every dropdown on every form was a native `<select>`. Its menu is drawn by the
  operating system: on Windows by Windows, on a phone by the phone. It matched
  nothing else on the page, could not carry a line explaining a choice, and made
  the complaint form in particular look like something borrowed from another
  product.

**Decision.**

1. **Two issue types of their own.** `WRONG_DOCUMENT` and `DOC_INACCESSIBLE` are
   names in the `complaint_issue` enum, with their own labels and their own
   one-line explanations. The remedies differ, so the intake differs.
2. **A complaint about a file names the training.** The form asks for it in the
   same breath, with a public, rate-limited search over published trainings
   (title and date only — the same thing the catalogue shows) and a picker. The
   complaint stores the training id *and* a copy of its title, so the record still
   reads correctly if the training is later withdrawn. Submitting without one is
   refused, on the client and on the server, because a document complaint without
   a training cannot be worked.
3. **The complaint form is three steps, not thirteen fields.** *You* (Staff ID,
   look-up, name, email, phone), *The problem* (issue cards, and the training
   picker when the issue is a file), *The details* (what happened — one field;
   the subject line is cut from it server-side, ADR‑0026). Every
   panel stays mounted, so nothing is lost by stepping; a failure keeps every
   value typed. The issue is a row of cards with an icon and a sentence, not a
   word in a list — it is the one answer that decides what the rest of the form
   asks.
4. **One dropdown, everywhere.** `components/ui/select.tsx` is a listbox that
   belongs to this product: same type, radii, focus ring and spacing as every
   other control, an optional line under each choice, grouping, and search for
   lists too long to scan (facilities, areas, people, trainings). It posts through
   a real, visually hidden `<select>` with the same `name` and `required`, so a
   form submits exactly what it submitted before and the browser still refuses an
   empty required field.
5. **Everything is converted.** All thirty-odd dropdowns in the product — the
   training form, the new-staff form, broadcast, compose, drafts, the role
   switcher, the complaint form, and the filter bars on trainings, users,
   catalogue, programme fields and geography — now use it. Leaving half of them
   native would have made the difference look like a bug.
6. **A failed file can be reported from the file.** The viewer links to the form
   with the issue, the training and a subject already filled in, so nobody has to
   describe which file it was.

**Consequences.** (+) The desk gets the training with the complaint, without a
round trip. (+) Menus look like the product, and a long list is searchable.
(+) The form is shorter in front of the person at any moment. (−) The custom
listbox owns keyboard handling, which is a real surface to keep correct: arrows,
Home/End, Enter, Escape, type-ahead, click-outside and the active-option id are
all handled and worth regression-checking when it changes. (−) `jsdom` becomes a
dev dependency so the new OOXML readers can be tested.
