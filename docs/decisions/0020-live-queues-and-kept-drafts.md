# ADR-0020 — Queues are derived, not assigned; forms keep what was typed

**Status:** accepted · **Date:** 2026‑11

**Context.** Two complaints about the same thing: the app only changed when
somebody reloaded it, and it lost work when they did.

The first was sharper than "it feels static". A unit head appointed today saw an
empty review queue for anything filed before their appointment — the queue was
scoped from assignment rows at read time for materials *only via areas*, so a
field-level grant produced nothing at all, and nothing told a reviewer that work
had arrived. Meanwhile a form that failed validation, or a tab closed by accident,
emptied itself on the way back.

**Decision.**

1. **Access to a queue is computed when the queue is read.** `review-scope.ts`
   answers "which fields and areas does this person decide?" from
   `field_facilitators` and `area_facilitators` plus the unit-head duty on the
   `users` row, on every call. Material versions and trainings both use it.
   Appointing a unit head is therefore retroactive by construction: everything
   already waiting in their fields is on the page on their first visit, however
   old. Nothing caches a reviewer list at submit time.
2. **Work that arrives rings the bell.** Filing a training or sending a version
   for review notifies whoever holds that field *at that moment*
   (`unitHeadsForField`); an appointment notifies the new unit head with the
   count already waiting (`countWaitingFor`). Both are best-effort and never fail
   the action that triggered them.
3. **Queue pages refresh themselves.** `LiveRefresh` asks the server for the page
   again on a slow timer and whenever the tab regains focus, so a decision taken
   in another tab, a submission or an appointment shows up without a manual
   reload.
4. **Drafts survive.** `FormDrafts` is mounted once in the root layout and watches
   every form on the page: values are saved to `sessionStorage` as they are typed
   and restored when the same form is shown again, including after a reload, a
   validation refusal or an accidental navigation. Password and file inputs are
   never saved. A draft is cleared once the submission takes (the page moves on or
   the overlay closes), so a successful form does not come back pre-filled.

**Consequences.** (+) An appointment is immediately useful; a queue left open
does not lie; nobody retypes a nine-field form. (−) Every queue read now costs two
small assignment queries, so the tables are read through indexes on `user_id`;
`FormDrafts` is DOM-level machinery that a unit test cannot see, so it is
documented here and in the component; and a draft survives a crash of the page
only as far as `sessionStorage` allows — a hard browser restart still loses it.
