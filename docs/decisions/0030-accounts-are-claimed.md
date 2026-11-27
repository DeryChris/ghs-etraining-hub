# ADR‑0030 — Accounts are claimed, not created

Date: 2026-11-17
Status: accepted

## Context

An operator-managed GHS staff export is imported into the application's user
directory with identity and posting details. Registration reads that local
directory; it does not query HRIMS. Sign-in is by employee number, but a person
whose existing directory row has no password needs a safe way to claim it without
an administrator creating a second record.

A public "register" form that let anybody type any details would have created a
second, fake row for a person who is already on the sheet — two accounts for one
employee number, and a directory nobody can trust.

## Decision

**Registration is a claim on an existing row.** `/register` asks for the employee
number first and looks it up in the local staff directory:

* no matching row → refused, with the Complaint Hub available to request a directory correction;
* inactive row → refused;
* row already carries a password → refused, "sign in instead" (otherwise anybody who
  knows a colleague's number could take the account over).

Only then is the rest of the form drawn. Name, region, district, facility and
grade are read-only values from the existing directory row, not a live HRIMS
response. The person supplies an e-mail address, a phone number, an optional
second number and a password of at least ten characters, and the row is updated
in place. Lookups are rate-limited per employee number, and the server re-reads
the row on submit rather than trusting the page.

**The sign-in card is two halves again.** Getting started and what the portal is
for on the left, the form on the right, at `lg` and above; a phone gets the form
first with the brand line above it. Under the Sign in button: *Create an account*,
then the Complaint Hub, which is the order they are reached for.

## Consequences

* One account per employee number, always the pre-existing directory row.
* A person whose number is wrong or missing needs the Complaint Hub, not a second
  registration — which is the record we wanted anyway.
* The alternative phone number is kept in the audit row for now; there is no
  column for it, and nothing reads one yet.
