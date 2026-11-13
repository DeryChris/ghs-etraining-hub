# UI/UX — GHS‑ELN

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
* Mobile: sidebar becomes a focus‑trapped drawer, priority nav visible in the header; tables
  collapse to stacked definition lists at `< 720 px` (never horizontal scroll for clinical data).
* Content column max width 1200 px; long‑form reading width 72 ch.
* Grid: 12‑column desktop, 4‑column tablet, 1‑column mobile, 24 px gutters.

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
  caption ("Showing 1–25 of 4,182 GHS staff").

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
