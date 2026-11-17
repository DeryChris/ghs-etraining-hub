# ADR‑0009 — Rename to GHS Training Library, official emblem, one name source

**Status:** accepted · **Date:** 2026‑11

## Context

The product shipped as **GHS‑ELN** ("Ghana Health Service eLearning Network"), described everywhere as a
"CPD and clinical learning portal". Both were wrong:

1. The name is not the one the service uses, and it was hard-coded in roughly forty places — page
   metadata, shell chrome, error copy, the proxy's 500 body, the seeder, ops scripts and the docs — so any
   rename was a search-and-replace waiting to drift.
2. The purpose had shifted. The platform is not a course portal; it is the **catalogue of record for GHS
   training programmes**: material from a session is filed under the programme that ran it, versioned,
   reviewed by a second person, and never silently deleted. The copy still promised e-learning.
3. The brand asset in the repo was an invented mark (a flag tile drawn for the project). GHS supplied the
   official emblem in two tone variants.

## Decision

**The name has three forms with one source.** `src/lib/site.ts` exports `code` (`GHS-TL`), `name`
(`GHS Training Library`) and `fullName` (`Ghana Health Service Training Library`), plus the purpose line
and the metadata description. The rule is written next to them: `code` for the wordmark, browser-title
suffix and tight chrome; `name` for headings and body copy; `fullName` for a page's first mention, legal
pages and share cards. Nothing else may hard-code the name. `PRIMARY_NAV` moved there too.

**The emblem is used as supplied.** The two hand-over files are raster artwork wrapped in an SVG
(`<image href="data:image/png;base64,…">`, ~1 MB each), so they are extracted once, trimmed, resized to the
largest size the UI renders and palette-optimised to ~20 KB. `BrandMark` renders both variants stacked in
one aspect-ratio box and CSS chooses by `[data-theme]` or the system preference, which keeps the switch
pre-paint (ADR‑0007's theme boot script cannot be beaten by JavaScript). The originals live in
`docs/brand/` with provenance and regeneration commands; the invented mark and the flag-tile favicon are
deleted.

**The copy was rewritten, not translated.** The landing page, about page, programmes, verify and the three
legal pages now describe the catalogue: filed by programme, versioned, reviewed before publication, older
versions still readable, every upload/edit/download/withdrawal attributed. Two claims the build could not
back (an audit-log viewer, discussion moderation) were removed rather than reworded.

**Deployment configuration is not a secret store.** `vercel.json` no longer maps environment variables to
`@secret` references. A freshly created Vercel project has no shared secrets, and a missing reference fails
the build outright, which is the most likely cause of the first failed deploy. Variables are set in the
project settings; `.env.example` and the README list them.

## Consequences

(+) A rename is now one edit, and the three forms cannot drift apart. (+) The official emblem replaces an
invented one, at a fraction of the bytes. (+) A fresh Vercel project builds on the first attempt.
(−) The extracted PNGs are tied to the size the UI renders; a much larger mark would need re-extraction
(documented in `docs/brand/README.md`). (−) Audit entries, database identifiers and the `ghs-materials`
storage bucket keep their old slug names; renaming those would break issued records and deployed
configuration for no user-visible gain.
