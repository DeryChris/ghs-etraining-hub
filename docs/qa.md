# QA — verification gates and manual scripts

Automated gates (must be green before any task is marked done) are in `AGENTS.md` §10. This file is
the human/agent script library.

## 1. Command sequence

```bash
npx next typegen
npm exec tsc -- --noEmit
npm run lint
npm run build
curl -s localhost:3000/api/health        # expect {"ok":true,...}
npx drizzle-kit push                     # sandbox only
npm run db:seed                          # idempotent
```

## 2. RBAC sweep (run after every capability change)

For each row of `docs/rbac.md` §1, as each role:

1. Navigate directly to the URL — expect 404 (unknown surface) or 403 (known surface).
2. Submit the underlying Server Action from a crafted request (the UI hiding a button is not
   security) — expect a deny, never a partial write.
3. Confirm **no** audit row was created for the denied attempt except `LOGIN`/rate‑limit events.
4. Confirm the allowed path creates an audit row with the right `action`, `entity`, `entityId`,
   redacted `metadata`, `ip`, `userAgent` and a valid `prevHash → hash` chain.

## 3. Data‑protection checks (Act 843)

* `SELECT` nothing that exposes PII in a list view without `user.read_pii`.
* Audit metadata never contains email, phone, staff PIN, password or token — grep the JSONB after a
  profile update.
* SAR drill: export a single user's data (profile, progress, attempts, certificates, messages) as
  JSON within one request, audited.
* Erasure drill: deactivate‑and‑anonymise leaves completion/audit history intact with the display
  name replaced and PII columns nulled.
* Verification endpoint leaks only name, masked PIN (`GHS-88****`), title, dates and credits.

## 4. Low‑bandwidth drill (Chrome DevTools, Slow 3G, 4× CPU throttle)

| Page | Budget | Check |
| --- | --- | --- |
| `/login` | ≤ 120 KB | first paint < 2 s, no layout shift |
| `/dashboard` | ≤ 200 KB | LCP ≤ 2.5 s, no chart JS when data saver is on |
| material viewer | ≤ 250 KB | viewer JS loads only after "Open SOP" |
| PDF download | — | size shown before download, resume works |
| video | — | poster renders, no autoplay, 480p default |

## 5. Accessibility drill

Keyboard‑only pass per page (tab order, focus visible, Esc closes, focus returns), screen‑reader
pass on the material viewer with NVDA/TalkBack, axe scan with zero critical/serious violations,
contrast check on both `ink`/`ink-muted` over `surface` and `surface-2`, target size check on
mobile, and a 200 % zoom check for horizontal scrolling.

## 6. Content‑lifecycle drill

1. Facilitator uploads a PDF → version 1 `DRAFT`, scan `PENDING`.
2. Submits for review → reviewer ≠ author required.
3. Publish → `currentVersionId` flips, learners see v1, audit `PUBLISH_MATERIAL` recorded.
4. Upload v2 → v1 becomes `SUPERSEDED`, learners still see v1 until v2 is published.
5. Re‑open a learner's progress record → it still points at v1 (`material_version_id`).
6. Old version shows the "This version has been replaced" banner and remains readable.

## 7. Assessment integrity drill

* Intercept the take‑assessment request → the response must contain no `correctIndex`.
* Attempt 4 after 3 failures → blocked with a cooldown message and an audit row.
* Timer expiry → auto‑submit whatever is answered, no client‑side trust.
* Admin override → requires a reason, records `gradedById`, and emits `UPDATE_ASSESSMENT_ATTEMPT`.

## 8. Load & pool drill

k6: 5,000 virtual users, 60 % `/dashboard`, 30 % material viewer, 10 % PDF stream. Assert p95 < 1.5 s,
error rate < 1 %, no `too many connections`, and pool utilisation documented for the run. Then
verify `npx drizzle-kit migrate` runs cleanly against staging and `/api/health` reports `ok`.

## 9. DR drill (quarterly, dated in this file)

1. Restore last night's logical backup into a scratch database.
2. Run the audit hash‑chain verification query and confirm 0 breaks.
3. Confirm certificate codes resolve after restore.
4. Record the date and the restore duration below.

| Drill date | Restored by | Duration | Issues |
| --- | --- | --- | --- |
| — | — | — | — |
