# UI/UX — GHS-TL

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
| `--color-accent` | `emerald-400` | success, completion |
| `--color-warn` | `amber-400` | attention, due soon |
| `--color-danger` | `rose-400` | critical, errors |
| `--color-ghs-red` / `--color-ghs-gold` / `--color-ghs-green` | `#cf2027` / `#fcd116` / `#006b3f` | **brand only** (crest stripe, certificates) — never for state |
| `--radius-card` | `14px` | cards |
| `--radius-control` | `10px` | buttons, inputs |
| `--shadow-panel` | `0 1px 0 rgba(255,255,255,.04), 0 8px 24px rgba(2,6,23,.45)` | elevation |

Motion: `--duration-fast 120ms`, `--duration-base 200ms`, `--ease-out-quint cubic-bezier(.22,1,.36,1)`.

**Never** hardcode a hex value in a component; if a token is missing, add it once in `globals.css`
and use the utility it generates.

## 2. Layout

* Shell: fixed 264 px sidebar (collapsible to 72 px icons, persisted in a cookie, `<main>` shifts
  with a CSS grid template so there is no layout thrash), sticky 60 px header with global search,
  notification bell and avatar menu.
* Navigation is **role‑aware and sectioned**, and its source is `src/lib/nav.ts` (ADR‑0010): *Learn*
  (Dashboard · Programmes · Library · Pre/Post Test), *Community* (Messages · Notifications), *My record*
  (My activity · Insights), *Author* (Sessions · My materials · Review queue · Send notice — assembled per
  role) and
  *Administration* (Users · Settings, administrators only). A section with nothing in it for a role does
  not render, and an item's badge (unread messages, unread notifications, versions awaiting review) shows
  only when it is above zero.
* Mobile: sidebar becomes a focus‑trapped drawer, priority nav visible in the header; tables
  collapse to stacked definition lists at `< 720 px` (never horizontal scroll for clinical data).
* Content column max width 1200 px; long‑form reading width 72 ch.
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

`layout/`: `app-shell`, `sidebar`, `header`, `notification-center`, `search-command`.
`materials/`: `material-card`, `pdf-viewer` (lazy), `video-player` (lazy, no autoplay, poster +
duration + size before play), `acknowledge-button`, `discussion-thread`, `lab-environment` (Monaco
behind a "Start lab" gesture so 400 KB of editor never loads by default).
`analytics/`: `coverage-bar`, `score-distribution`, `completion-trend` — all client components
loaded with `next/dynamic` and rendered only when `dataSaver === false`.

Every primitive: `forwardRef`, no domain logic, no data fetching, keyboard operable, and a
`data-` hook for tests (`data-testid`).

## 4. Page recipes

* **Dashboard (learner)** — three mandatory cards first (priority chips + due dates), then
  "Continue where you left off", then announcements, then a compact CPD summary. Nothing below the
  fold is a chart if `dataSaver` is on.
* **Space page** — sticky sub‑header with progress, materials as cards grouped by type, discussion
  at the bottom, "Download all for offline" action with total size shown.
* **Material viewer** — title, version + "superseded" banner, metadata row (author directorate,
  version, published date, size, est. minutes, CPD credits), the artefact, then acknowledgement and
  assessment CTAs. No unrelated sidebars.
* **Data tables (admin)** — server‑side pagination with a page‑size selector (25/50/100), saved
  filters in the URL (shareable, back‑button safe), row actions in a kebab menu, count in the
  caption ("Showing 1–25 of 4,182 GHS staff"). `/users` is the reference implementation: 25 per page,
  filters in the URL, row actions inline (role select, deactivate/reactivate, reset link) with the
  result of each action announced next to the row it changed.
* **Insights** — headline numbers first (`/insights`), then charts: an area chart of opens vs
  downloads by week, stacked bars of versions uploaded per month by programme, a monthly count of
  sessions run, ranked bars for opens and for sessions per programme, and a donut of published material
  by type. Charts are server-rendered SVG using the `--chart-1..8` / `--chart-grid` tokens in
  `globals.css`; each one repeats its figures in a `<details>` table and in `<title>` tooltips. The
  dashboard shows four headline numbers and a link, and nothing on the dashboard is a chart. Numbers are
  always labelled with the window they cover ("Opens · 4 weeks"), because an unlabelled total is a claim
  nobody can check.
* **Sessions** — one training per row: title, programme (module optional), date, region → district →
  sub-district → facility, facilitator and attendee count. Facilities exclude CHPS compounds. The
  cascade narrows as you choose; every optional key is cross-checked against its parent on the server.

## 5. Copy style

* Sentence case, plain Ghanaian professional English, second person ("Download this SOP for
  offline use" not "The document can be downloaded").
* Be specific with numbers: "Due in 4 days", "12 of 15 staff completed", "8.4 MB".
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
* `/help` is the Complaint Hub: report an issue, or check a complaint by Staff ID. It is public on
  purpose — somebody locked out of their account cannot sign in to ask for help. `/help/report`
  and `/help/status` never require a session and never ask for a password.
* Only the Upper West Region is presented as live. The landing page map draws all sixteen regions
  from real 2019 boundaries (`src/lib/ghana-map.ts`), fills Upper West, and labels the rest "coming
  soon"; the geography admin makes every other region read-only with the same wording. Nothing is
  hidden and nothing is shown as broken.

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
