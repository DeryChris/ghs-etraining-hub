# ADR-0027 — Two shells: a rail for the people who run the library, a top bar for the people who read it

**Status:** accepted · **Date:** 2026‑11

**Context.** Every signed-in surface drew the same frame: a 264 px sidebar of
sections, a collapsible rail, a header. That frame was designed for the people
who administer the catalogue — facilitators filing versions, reviewers deciding
queues, administrators importing payroll — and it holds a dozen destinations
well.

A member of GHS staff has five: the dashboard, the library, the trainings, their
messages and their notifications. Given the rail they saw a management console,
with the two things they actually do (find the protocol, pick up where they left
off) pushed to one corner and a column of empty space beside them. On a phone the
rail collapsed into a drawer, so the five links were behind a hamburger — the
thing every learning product stopped doing years ago. And "My activity" was a
tab of its own, which meant the one page that could have answered *what was I
reading?* had to be found first.

**Decision.**

1. **Two shells, chosen by role, from one gate.** `(dash)/layout.tsx` resolves the
   session, then renders either `AppShell` (facilitator, unit head, administrator)
   or `LearnerShell` (roster role). Both receive the same props, both wrap
   `PageTransition`, and a page is unchanged either way — the difference is the
   frame, not the content.
2. **The learner gets the public site's shape.** Brand, five links, search, theme,
   bell, account, and a footer line. No sidebar, no sections, no collapsible rail,
   no administration. On screens under `lg` the same five links are a fixed bottom
   bar with icons and labels, within thumb reach, with the unread counts on
   Messages and Notifications.
3. **The dashboard is the record.** "My activity" — the totals, the list of opens,
   the way back to what was being read — is folded into `/dashboard`: totals in the
   hero strip beside the greeting, the three most recent items as *Pick up where
   you left off*, and the fuller list as *Your reading* beside the announcements.
   Nothing is labelled "My activity" and there is no second tab for it.
   `/analytics` is deleted and redirects to `/dashboard`, so bookmarks and links
   written under the old menu still land somewhere useful.
4. **The learner's menu is data, not a filter of the staff menu.** `LEARNER_NAV` in
   `src/lib/nav.ts` is a flat list of five, drawn by the top bar and the bottom
   bar alike, and a test asserts it matches what `navFor("LEARNER")` returns. A
   destination added to one but not the other fails the suite rather than shipping
   a link nobody can reach.
5. **No charts on the learner's page.** The staff dashboard keeps its KPIs and
   charts — that is the job it does. What a member of staff needs on arrival is
   the material they were reading, what is waiting for a signature, and what they
   have read; anything else is one tap away in the library.

**Consequences.** The learner's page is wider (1280 px), so material cards sit
three‑across on a laptop and one‑across on a phone without a rail taking 264 px.
`header.tsx` exports `AccountMenu` for both shells, and the icon map moved to
`layout/nav-icons.ts` so the sidebar and the top bar cannot drift apart.
`SAFE_APP_LINK` now accepts `/dashboard` and no longer `/analytics`, because
notification links are stored data and must only point at routes that exist.

**Alternatives considered.** One shell with the sidebar hidden for learners was
rejected: hiding a rail still spends the layout on it, and the mobile drawer is
the part people struggle with. Giving learners a separate route group with its own
pages was rejected for the opposite reason — two implementations of every page
would drift, and the five destinations are the same five for everybody.

**Not done here.** The facilitation and administration surfaces are unchanged, and
there is still no onboarding tour for a first sign‑in; the empty states do that
work for now.
