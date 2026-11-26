# ADR-0017 — One library door: the catalogue *is* the Library tab

**Status:** accepted · **Date:** 2026‑11

**Context.** Two tabs answered the same question. `/library` was a flat, searchable list of every
published material; `/catalogue` was the browse-by-programme route (field → area → trainings and
material). A person looking for the malaria protocol had to guess which door it was behind, and the
two pages drifted: search lived in one, the taxonomy in the other, and the sidebar carried both.

**Decision.** There is one tab, labelled **Library**, and its route is `/catalogue` — because the
browse structure is the part of the library that teaches people what exists. Search moved onto that
page: a query (or a type filter) replaces the field tiles with paged results, and clearing it brings
the taxonomy back. `/library` survives as a redirect that carries `q`, `type` and `page` across, so
the header search, bookmarks and notice links written before this change still land somewhere
correct; nothing in the application links to it.

**Consequences.** (+) One place to look, one nav item, one page to keep correct. The flat list did
not disappear — it is the results view. (−) The catalogue page now has two modes, so its tests and
copy must cover both; the redirect adds a client-side hop for very old links.

---

# ADR-0018 — Unit head is chosen like a role, stored as a duty

**Status:** accepted · **Date:** 2026‑11

**Context.** A unit head is a facilitator who also signs off the material filed under their fields.
The database has carried that as `users.is_unit_head`, and the Users screen exposed it as a
"Make unit head" toggle beside the row. Administrators filling in the *role* dropdown — when creating
a person or editing their details — could not find it there, because it is the word the service uses
for the post.

**Decision.** The role field offers four choices: learner, facilitator, unit head, system
administrator. Choosing unit head writes `role = FACILITATOR, is_unit_head = true` in one action and
one audit entry; choosing facilitator clears the flag. The toggle is gone. Stored form is unchanged,
so area assignments, authoring, trainings and every `role = 'FACILITATOR'` query keep working — the
only extra permission a unit head has is deciding on the review queue.

**Consequences.** (+) The word in the dropdown matches the word in the service; one place to change
it; no fourth enum value to thread through scoping, assignment pickers and reports. (−) Role and
duty are two columns behind one choice, so the mapping lives in one pure module
(`roleForStaffRole` / `staffRoleOf`) and both the create and role-change actions go through it. A
future "unit head of a specific field" would need more than this flag.

---

# ADR-0019 — Employee numbers are digits

**Status:** accepted · **Date:** 2026‑11

**Context.** The directory demanded `GHS-\d{6}` and the form's placeholder said `GHS-000123`. Ghana
Health Service employee numbers are plain digits — `2681763` — so staff were being asked to reformat
their own payroll number, and the sign-in box rejected the form they knew.

**Decision.** Accept the number as printed, store its digits, and compare numbers rather than strings:
`src/lib/staff-id.ts` normalises a value (drops a legacy `GHS-` prefix, keeps the digits, drops leading
zeros) and `src/lib/server/staff-id-sql.ts` applies the same rule inside SQL for the duplicate check
and the sign-in lookup. Legacy rows spelled `GHS-000123` keep working, and `123` reaches them.

**Consequences.** (+) People type what is on their payslip. (−) Two rows could be created for the
same employee if their digits differ in a way normalisation does not cover (e.g. a letter suffix);
the duplicate check therefore compares normalised values, not the raw column.
