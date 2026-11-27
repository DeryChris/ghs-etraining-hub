# QA — verification gates and manual scripts

Automated gates (must be green before any task is marked done) are in `AGENTS.md` §10. This file is
the human/agent script library.

## 1. Command sequence

```bash
npm exec tsc -- --noEmit
npm run lint
npm test
npm run db:check                         # migration/snapshot consistency
npm run build                            # hermetic: no Google Fonts / CDN fetch
npm run test:e2e:public                  # browse-route test needs a migrated DB with the reference taxonomy; Playwright browsers installed
curl -s localhost:3000/api/health        # expect {"ok":true,...}
npm run db:migrate                       # not drizzle-kit push
npm run db:seed                          # reference data; fresh DB gets passwordless admin, no sample content
npm run db:verify-chain                  # audit chain intact
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
* SAR drill: export a single user's data (profile, opens, messages) as JSON within one request,
  audited.
* Erasure drill: deactivate‑and‑anonymise leaves the open and audit history intact
  with the display name replaced and PII columns nulled.
* Public Programme browse and counters must not expose staff names, Staff IDs or directory records. Do not claim every public route is PII-free: `/register` intentionally displays the matched directory preview after a Staff ID lookup, and `/help/status` returns complaints and saved responses for a supplied Staff ID (legacy temporary-password text is redacted). Those flows are public and rate-limited, not proof of identity; test their exact scope and obtain privacy/security approval before using real personal data.
* Access reset must never persist the generated password in `complaints.response`; it is returned only in the administrator action state. The migration `0023_redact_legacy_complaint_passwords` removes previously saved values, and the public status query redacts legacy text as a defense-in-depth check.

## 3a. Two shells drill

1. Sign in as a member of staff (roster role) → `/dashboard` is the reading home: top bar with
   Dashboard · Library · Trainings · Messages · Notifications, no sidebar, no charts. At 375 px wide
   the same five links are a fixed bottom bar, each with an unread badge where it applies.
2. Sign in as a facilitator or administrator → the rail is back, with Author/Administration as their
   role allows. Nothing on the learner's bar is reachable from the rail by accident.
3. `/analytics` → 308 to `/dashboard`. Old notification links that point at it still land.
4. A learner's dashboard shows the material they were reading, the reading totals, the list of opens
   and the announcements — and no "My activity" tab anywhere in the menu or the account card. Nothing
   asks for a signature: `curl -s localhost:3111/dashboard | grep -i "signature"` prints nothing.

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

1. Facilitator uploads a PDF from `/authoring/<id>` → version 1 `DRAFT`, scan `PENDING`; the bytes go
   straight to storage via the signed slot (watch the network tab: no request body reaches Next.js).
2. Submits for review → `/review` lists it for colleagues; the uploader sees "You uploaded this
   version" instead of Approve/Send back.
3. Publish with no approval → refused by `publishBlockers()` with a named blocker. After a colleague
   approves, publish → `currentVersionId` points to v1 and audit `MATERIAL_PUBLISHED` is recorded.
   A `SYSTEM_ADMIN` override without a reason of at least 10 characters is still refused.
4. Upload v2 and submit it for review → v1 remains the current published version while v2 is pending.
   After v2 is approved and published, the pointer changes to v2 and v1 becomes `SUPERSEDED`.
5. Check the signed-in Staff activity view: opens and downloads may be attributed to the material and
   version opened. No learner progress, attendance or completion record is created from that activity.
6. The old version is clearly marked as superseded and remains available to authorised users.

### 6a. Notice targeting drill

1. As a facilitator, send a notice to an assigned Programme Field with a narrowed grade audience.
2. Sign in as a Staff user in a different grade → the notice is absent from `/notifications` and
   from the sidebar count; as a Staff user in that grade → it is present.
3. Staff user with a blank grade → absent (a narrowed notice never leaks to "unknown").
4. Mark all as read → only visible notices get read cursors; re-open as the other cohort and the
   notice is still unread.
5. `NOTIFICATION_BROADCAST` appears in the audit log with the audience filter.

### 6b. Nothing is marked drill

1. Grep the rendered pages for the words the product retired — "certificate", "award", "completion",
   "finished", "score", "pass mark", "transcript". Nothing should match (ADR‑0026):
   `curl -s localhost:3111/privacy | grep -Ei "certificate|award|completion"` prints nothing.
2. Open a material → there is no "mark complete" control and no acknowledgement panel; opening and
   downloading are the only actions, and both are recorded against the version opened.
3. Sign in as a learner → `/assessments` is not in the menu and answers 404, and no page offers a
   score, an attempt count or a result.

## 6c. Nothing asks for a signature

1. Grep the rendered pages for the retired vocabulary: "acknowledge", "acknowledgement", "signature",
   "waiting for you to sign". Nothing should match (ADR‑0028), except the cryptographic sense of
   "signature" in the storage-token comments, which no page renders.
2. Dashboard, library index, an area page and a material page: no "Acknowledgement required" badge, no
   "Acknowledged" chip, no signature section.
3. `select * from material_progress` and `select * from enrollments` → `relation does not exist` on a
   database migrated past 0021, and `select requires_acknowledgement from materials` fails too.
4. The staff dashboard's KPI row has no "Protocols to sign" card; its reading card says what was opened.

## 6d. Reader drill (phone first)

1. Open a material with a file on a real phone (or 375 px emulation). The strip above the file holds
   three icon buttons — new tab, download, full screen — and no paragraph of instructions.
2. Tap **Full screen** on iOS Safari, where `Element.requestFullscreen` does not exist for this
   element: the panel must cover the viewport anyway. Escape (desktop) and the back gesture must
   return to the page, and the page must be scrollable again afterwards.
3. Open a deck: one slide, `‹ 3 / 40 ›`, and a swipe that moves one slide. No numbered grid of
   slides, no speaker notes.
4. Rotate to landscape with the panel open: the slide still fits, whole but not cropped.

## 7. Assessment tables are gone

* `select * from assessments` → `relation does not exist` on a database migrated past 0020.
* `insert into "materials" (... "type") values (..., 'ASSESSMENT_LINK')` still works: a training may
  attach the paper; the library stores the paper and nothing else.

## 8. Load & pool drill

k6: 5,000 virtual users, 60 % `/dashboard`, 30 % material viewer, 10 % PDF stream. Assert p95 < 1.5 s,
error rate < 1 %, no `too many connections`, and pool utilisation documented for the run. Then
verify `npx drizzle-kit migrate` runs cleanly against staging and `/api/health` reports `ok`.

## 9. DR drill (quarterly, dated in this file)

1. Restore last night's logical backup into a scratch database.
2. Run the audit hash‑chain verification query and confirm 0 breaks.
3. Confirm a material opens and downloads after restore (the bytes live in `file_blobs`, or in the bucket when Supabase is on).
4. Record the date and the restore duration below.

| Drill date | Restored by | Duration | Issues |
| --- | --- | --- | --- |
| — | — | — | — |
