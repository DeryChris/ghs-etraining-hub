## ADR‑0034 — A notice can name a district

**Status:** accepted · **Date:** 2026‑11

**Context.** ADR‑0033 left one piece of the district brief switched off: a District
HR officer could not send a notice, because `audience_filter` held only region,
directorate and grade. A broadcast from that role would have reached the whole
region — the exact over-reach the role exists to prevent — so
`notification.broadcast` stayed off rather than shipping the screen.

**Decision.** `audience_filter` gains a `district` key, and it holds the district's
**row id**, not its name. Names repeat and get mistyped, and the rest of the app
already draws this boundary on `users.district_id`; a notice is no place to
invent a second definition. Matching is one comparison against the viewer's
`districtId`, in both implementations that matter — the JS `matchesAudience`
used by screens and tests, and the SQL `audienceMatches` used by the feed — and a
viewer with no district record does not match a district notice.

`isAudienceFilter` validates the value as a uuid, so a name that slipped into the
column is refused rather than silently matching nobody. The staff-facing history
resolves the id to a name for display, and says "one district" if it cannot.

**The broadcast action writes the district itself.** For a district-scoped actor
the officer's own district is merged into the filter after the form has been
read, overwriting any `district` the request carried; the notice is their
district's whatever the payload says. An officer with no district is refused with
the standard message rather than sending unaddressed. `scope = ALL` is allowed for
this role only because the filter is no longer empty — "everyone in Ga West" is
not "everyone" — while a facilitator posting `ALL` is still refused.

**Consequence.** `notification.broadcast` turns on for `DISTRICT_HR` in the same
change. The compose screen shows a district officer one choice ("Everyone in
<their district>") and no programme-field option, because they hold no programme
grant; an administrator is unchanged. Districts are now a dimension of both the
complaint desk and the notice feed, scoped by the same column.
