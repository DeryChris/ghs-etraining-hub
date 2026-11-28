# UI/UX — GHS-UWRHD-TL

> **Historical note.** The design notes below predate the 2026 institutional overhaul. Their earlier palette, typography, navigation and map descriptions are not current; use `src/app/globals.css`, `src/lib/site.ts` and the implemented app pages/components as the source of truth for the updated design.

Dark‑first, clinical, calm. The platform is read under fluorescent ward lighting and on a phone at
night; the palette must never shout, and data density must never overwhelm a small screen.

## 1. Design tokens (Tailwind v4 `@theme` in `src/app/globals.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `slate-950` (`#020617`) | app background |
| `--color-surface` | `slate-900` / `slate-900/60` | cards, panels |
| `--color-surface-2` | `slate-800` | hover, table headers |
| `--color-ink` | `slate-50` | primary text |
| `--color-ink-muted` | `slate-400` | secondary text (≥ 4.5:1 on `surface`) |
| `--color-hairline` | `slate-800` | 1px borders |
| `--color-primary` | `teal-400` / `teal-500` | actions, active nav, links |
| `--color-primary-ink` | `teal-950` | text on primary buttons |
| `--color-accent` | `emerald-400` | success and emphasis |
| `--color-warn` | `amber-400` | attention, due soon |
| `--color-danger` | `rose-400` | critical, errors |
| `--color-ghs-red` / `--color-ghs-gold` / `--color-ghs-green` | `#cf2027` / `#fcd116` / `#006b3f` | **brand only** (official emblem details) — never for state |
| `--radius-card` | `14px` | cards |
| `--radius-control` | `10px` | buttons, inputs |
| `--shadow-panel` | `0 1px 0 rgba(255,255,255,.04), 0 8px 24px rgba(2,6,23,.45)` | elevation |

Motion: `--duration-fast 120ms`, `--duration-base 200ms`, `--ease-out-quint cubic-bezier(.22,1,.36,1)`.

**Never** hardcode a hex value in a component; if a token is missing, add it once in `globals.css`
and use the utility it generates.

## 2. Layout

* **Two shells, one gate** (ADR‑0027). `(dash)/layout.tsx` resolves the session once and then draws one
  of two frames, so a page never knows which is around it:
  * **Staff — the rail.** Facilitators and administrators get the fixed 264 px sidebar (collapsible to
    72 px icons, persisted in a cookie, `<main>` shifts with a CSS grid template so there is no layout
    thrash), the sticky 60 px header with global search, the notification bell and the avatar menu.
    Sections are *Learn*, *Community*, *My record* (Insights), *Author* and *Administration*. A
    section with nothing in it for a role does not render, and a badge (unread messages, unread
    notifications, versions awaiting review) shows only when it is above zero.
  * **Staff on the roster — the top bar.** A member of staff with the roster role gets the public
    site's shape: brand, five links (Dashboard · Library · Trainings · Messages · Notifications),
    search, theme, bell, account. No rail, no sections, nothing administrative. On a phone the same
    five links are a fixed bottom bar within thumb reach, which is how most of this audience will
    meet the product.
* The learner's dashboard is the whole record: the greeting, the material they were reading, the
  reading totals, the list of opens, the announcements and the programme fields. There is no separate "My activity" tab (ADR‑0027); `/analytics` redirects here so
  old links keep working.
* Tables collapse to stacked definition lists at `< 720 px` (never horizontal scroll for clinical data).
* Content column max width 1200 px for staff, 1280 px for the learner shell; long‑form reading width 72 ch.
* Grid: 12‑column desktop, 4‑column tablet, 1‑column mobile, 24 px gutters.

### Public pages: art and photography

The landing page carries no background grid. A 44 px boxed grid reads as graph paper and squares
off every section it touches, so the hero instead uses layered vector art
(`src/components/marketing/landing-art.tsx`): woven kente bands on a gradient mask, contour rings
drawn from the choropleth map, the black star, and a soft dot field. Colour transitions are
gradients — never `filter: blur()` — and each layer is `aria-hidden`, `pointer-events-none`, and
masked so it stops before the text column. `hero-glow` is a `::before` at `z-index: -1` inside an
`isolation: isolate`, which is what keeps the wash behind the copy on the other public pages.

Photography lives in `public/images/stock/` and is referenced by path, so `next/image` optimises it
and the build stays hermetic (no remote fetch at render time). Three images: a hero team in a
hospital corridor, two nurses reading a protocol at a desk, and a clinician portrait used by the
sign-in and about pages. They are illustrative — swap them for GHS photography when it is cleared
for publication; keep the descriptive `alt` text, which names the scene and never claims an
identity.

## 3. Component inventory (`src/components/`)

`ui/`: `button` (primary/secondary/ghost/destructive, 36/44 px heights, loading state that
preserves width), `badge`, `card`, `stat`, `input`, `textarea`, `select`, `checkbox`, `dialog`
(focus trap, Esc, restore focus), `tabs`, `table` (sortable, sticky header, empty row),
`skeleton`, `toast`, `tooltip`, `empty-state`, `progress-bar`, `priority-chip`, `state-chip`.

`layout/`: `app-shell`, `learner-shell`, `sidebar`, `header`, `nav-icons`, `notification-center`,
`search-command`.
`materials/`: `material-card`, `pdf-viewer` (lazy), `video-player` (lazy, no autoplay, poster +
duration + size before play), `view-beacon`, `discussion-thread`, `lab-environment` (Monaco
behind a "Start lab" gesture so 400 KB of editor never loads by default).
`charts/`: `area-chart`, `donut-chart`, `rank-bars`, `kpi-card`, `chart-card` — client components,
rendered on the staff surfaces only.

Every primitive: `forwardRef`, no domain logic, no data fetching, keyboard operable, and a
`data-` hook for tests (`data-testid`).

## 4. Page recipes

* **Dashboard (learner)** — the greeting and the one button back to the material they were reading,
  then the reading record, then announcements, then the Programme Areas and Programme Fields. No
  chart appears on this page: charts are staff equipment.
* **Public programme browse** — `/programmes` lists Programme Areas; opening a Programme Area shows
  its Programme Fields; opening a Programme Field shows listings for currently published, publicly
  visible Training Materials. The field page keeps the parent-area breadcrumb and an honest empty
  state when no materials are published. This signed-out hierarchy is separate from the authenticated
  `/catalogue`.
* **Signed-out screens** — the sign-in card is split between getting-started guidance and the form
  on wide screens; mobile puts the form first. Under the Sign in button are *Create an account* and
  the Complaint Hub. `/register` verifies a GHS Staff ID against the available staff directory and
  lets an eligible person claim an unclaimed account, then enter contact details and a password. It
  is not a connection to HRIMS or open registration for arbitrary visitors (ADR‑0030).
* **Search bars collapse** — one search box, always visible; the rest of the filters behind a
  native `<details>` that says how many are set (`components/ui/filter-bar.tsx`). The fields are
  still submitted while it is shut, because they stay in the DOM.
* **Material viewer** — breadcrumb, title, one wrapped line of metadata (author, updated, est.
  minutes, priority), then the file. The frame around the file is a single 44 px strip: what it is on
  the left, and three icon buttons on the right — new tab, download, full screen. Nothing else, because
  every line of chrome above a document on a 375 px screen is a line of the document the reader loses.
  No unrelated sidebars, no signature to collect, no marks (ADR‑0026, ADR‑0028).
* **Full screen is ours, not the browser's.** The expand button puts the panel over the viewport with
  CSS and *then* asks for `requestFullscreen` as a bonus: iOS Safari has no
  `Element.requestFullscreen` for anything but `<video>`, so the browser-only version of this button
  did nothing on exactly the device the product is used on (`components/ui/use-expand.ts`). Escape,
  the system gesture and the browser's own exit all collapse it, and the page behind is scroll-locked.
* **Slides are read, not indexed.** A deck shows one slide, `‹ 3 / 40 ›` and swipe. No grid of slide
  numbers under the canvas, no speaker notes — a deck is read in order, and the digits were the
  loudest thing in the panel on a phone.
* **Data tables (admin)** — server-side pagination with 25 rows per page, filters in the URL
  (shareable, back-button safe), a result count and inline row actions. `/users` is the reference:
  role, status and group filters; role changes, activation, password reset and access assignments
  each return a result announced beside the affected row.
* **Insights** — headline numbers first (`/insights`), then charts: weekly opens and downloads,
  Training Material versions filed per month by Programme Field, Training register records by their
  recorded start date, opens by Programme Field, and published Training Materials by type. Training
  register figures follow register visibility: facilitators see published records and their own
  submissions; administrators and unit heads see all review states. The 12-month record series ends
  on the current UTC date. Charts use the `--chart-1..8` / `--chart-grid` tokens in `globals.css`; each
  chart repeats its figures in a table and `<title>` tooltips. Every time-based number names its window
  (for example, "Opens · 12 weeks").
* **Trainings register** — one Training Session record per tile, with four counts above the list
  (records, planned, held, awaiting review) and review chips that keep the current filters rather than
  clearing them: title, Programme Area and Programme Field, date, region → district → sub-district →
  facility, facilitator and an optional attendee count.
  Members of staff see published records and their own submissions; administrators and unit heads can
  also see other review states. Facilities exclude CHPS compounds. The location cascade narrows as you
  choose; every selected key is cross-checked against its parent on the server. An attendee-count total
  is a sum of values entered on records marked Held, not a unique-person or service-reach measure.

## 5. Copy style

* Sentence case, plain Ghanaian professional English, second person ("Download this SOP for
  offline use" not "The document can be downloaded").
* Be specific with numbers when the value is source-backed: "3 files attached", "12 Training Session records", "8.4 MB". Label recorded counts as counts; never imply reach, unique attendees or learner outcomes.
* Errors say what happened and what to do next: "We could not open this SOP. The file may have been
  replaced. Contact your facilitator, or try again in a few minutes." Never "Error 500", never
  "Oops".
* Empty states name the next action and, where relevant, who can take it.
* No exclamation marks, no dark patterns, no fake urgency, no emoji in UI chrome.
* Timezone always `Africa/Accra`, dates as `12 Feb 2026, 14:05 GMT`, durations as `1 h 20 m`,
  sizes as `8.4 MB` (via `src/lib/format.ts`).

### Feedback on every action

Nothing waits for the page to settle before admitting it was pressed. A menu item carries a
spinner the moment it is clicked (`useLinkStatus` in the sidebar), a submit button swaps its label
for the present participle ("Signing out…", "Lodging your complaint…") and disables itself, and
every slow tab has a `loading.tsx` whose skeleton matches the layout it replaces. Sign-out is the
loudest case: the menu button changes under the finger, because a dead-looking sign-out is the
complaint we heard most.

### Public pages: the Getting-started panel and the Complaint Hub

* Sign-in uses a split card. The left, GHS-green panel answers the three questions a first-time
  visitor has — *do I have an account, which email, who do I ask* — as a numbered four-step guide,
  with a gold-bordered "Used an older portal before?" notice. The right column is the form, then
  "Create an account" (gold, the accepted exception to the brand-colour rule), then a
  "Trouble signing in?" divider and the red Complaint Hub button.
* `/help` is the Help Centre and includes the Complaint Hub. `/help/report` and `/help/status` are
  public so a person locked out of their account can ask for help. Status lookup uses the Staff ID
  recorded with the complaint and requires no sign-in or password; it returns the matching complaint
  status and saved responses, with temporary-password text redacted.
* The marketing region panel identifies the Upper West Region and uses its isolated boundary from
  the 2019 source data (`src/lib/ghana-map.ts`). It does not display a multi-region rollout map or
  availability cards. The geography admin retains existing reference data read-only; this is not
  deployment messaging.

### Dashboards: the overview and the detail

The member-of-staff reading dashboard shows personal recent activity, notices and Programme Area
browse; it has no charts. The facilitator and administrator dashboard shows service or assigned-scope
figures, material activity, and returned Training Session records where follow-up is needed. The
separate `/insights` page shows material opens and downloads by week, uploaded versions by month,
Training register records grouped by their recorded start date, opens by Programme Field, material
mix and library reference counts. Attendee-count totals are sums entered on records marked Held, not
unique-person or service-reach measures.

Chart colour comes from the eight `--chart-*` tokens, so a series keeps its colour between the
dashboard, insights and any table that lists the same thing. Colour carries identity, never
judgement: the arrow says whether a number went up, the label says what the number is. Every chart
ships its figures twice — in the "The numbers" disclosure and in a hidden table — because a picture
of a number is not a number.

## 6. Accessibility contract

* Landmarks: `<nav aria-label="Primary">`, `<main>`, one `<h1>` per page, heading levels never skipped.
* All interactive elements are reachable and operable by keyboard; visible focus ring on every one.
* Hit areas ≥ 44 × 44 px on touch; related controls grouped in a `<fieldset>` with a `<legend>`.
* `aria-live="polite"` for async results, `aria-busy` during loads, `role="dialog"` + label for
  modals, `aria-expanded`/`aria-controls` for disclosure.
* Status conveyed by icon + text, never colour alone: priority chips carry a label and an icon.
* Contrast ≥ 4.5:1 body, ≥ 3:1 large text and UI borders; test both themes.
* `prefers-reduced-motion` disables all transitions longer than 100 ms.
* Screen readers: label every input (no placeholder‑only labels), announce required fields and
  validation errors with `aria-describedby`.

## 7. Motion rules

* Enter: fade + 4 px translate‑up, 200 ms, `--ease-out-quint`.
* Layout morphs (list → detail) 240 ms max.
* No motion on the first paint above the fold, no parallax, no spinners that appear for < 200 ms
  (use a skeleton instead).
* Charts animate once, 400 ms, from 0 to value, and are replaced by a static table when
  `dataSaver` is on.
