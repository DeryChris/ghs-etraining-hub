# ADR‑0011 — The library is informational: retire CPD awards, keep issued certificates

**Status:** accepted · **Date:** 2026‑11 · **Partially superseded by:** ADR‑0026

> This record preserves the original decision, including the temporary choice to retain previously
> issued certificates and `/verify`. ADR‑0026 supersedes that retention choice: the certificate table
> and public verification surface are removed. No certificates are issued or verified by the current
> product.

## Context

The platform was built as a CPD product: a credit table, a cycle target ring on the dashboard, "My CPD" as
a destination, and a certificate issued inside the same transaction that marked a material complete. That
framing was wrong for what the service is used for.

Personnel attend a training, are told a protocol changed, and need the current document afterwards. They do
not enrol, they are not scored, and nobody administers a points cycle. Worse, the award machinery created
an obligation the service cannot honour: it made a *reading* event look like an assessment, and it promised a
credential for opening a PDF.

Two things must not break when the framing goes. Certificates already in people's hands carry a serial
(`GHS-CPD-<year>-<Crockford base32>`) printed on paper and filed in personnel records. Deleting the table,
changing the prefix, or dropping `/verify` would strand them.

## Decision

**The service is an informational library. It does not award points, levels or certificates.**

Removed:

* The `My CPD` destination — `/analytics` is now **My activity**: what you opened, downloaded and marked as
  finished, with per-person windows on opens and downloads. It states plainly that no award is made.
* The cycle-target ring (`cpd-ring.tsx`), `src/lib/cpd.ts`, `CPD_CYCLE_TARGET_POINTS`, `pointsFromCreditsX10`
  and the credit chip on material cards. `cpd_credits_x10` stays in the schema as a **historical field**: it
  is the number printed on certificates already issued, so it is read, never written by new flows.
* Certificate issuance. `issueCertificate` is no longer called from the completion path, and the
  `CERTIFICATE_ISSUED` audit row is no longer written. Completion records the version read and nothing else.

Kept, deliberately unchanged:

* `certificates` rows, untouched, including `cpd_credits_x10` and `expires_at`.
* `/verify?code=` — the public check, with the masked holder name, validity and expiry.
* `/certificates/[code]` — the printable award for the holder and staff.
* `src/lib/server/certificates.ts` and the `certificate-code` helper and its tests.
* The certificate serial format. Absence of new issuance is not a reason to renumber old awards.

**The former award surfaces now describe an archive.** The analytics page carries a short "Certificates
already issued" note that links each holder to their own award, and every other page that mentions
certificates says they were issued before the award was retired. Where the copy promised points, it now says
what the library actually does.

**Insight replaced the transcript as the reason to record anything.** Because completions no longer produce a
credential, the value of the record is operational: `/insights` now shows traffic (opens per programme, plus
downloads from the audit trail), upload rate per programme, and the trainings that ran. Those numbers are
what a directorate can act on; see ADR‑0012 for the session and traffic model behind them.

## Consequences

* A holder can still verify and print any certificate issued before this change, and `/verify` keeps working
  with no session — the guarantee that mattered.
* No new certificate can be produced, so `issueCertificate` is dead code for the live path. It is retained
  because the award page and the verification query share its types, and deleting it would invite someone to
  re-point the completion flow at it.
* Point values remain visible on the award and verify pages, labelled *"Points recorded at issue"*, so a
  printed certificate and its online record do not disagree.
* Marketing, terms, privacy and FAQ copy no longer promise CPD; the FAQ explains what a certificate issued
  earlier still means.
* If a points cycle is ever needed again it must arrive as a new ADR, with a data model for cycles rather
  than a column on a material.
