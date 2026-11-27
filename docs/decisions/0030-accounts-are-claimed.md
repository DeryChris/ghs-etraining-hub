# ADR‑0030 — Accounts are claimed, not created

Date: 2026-11-17
Status: accepted

## Context

The staff sheet is imported by ICT: employee number, name, gender, e-mail (often
blank), phone, grade, region, district, facility. Every row therefore already
describes a real person, and the only thing missing is a password. Sign-in was
already by employee number, but there was no way for somebody who had never been
given a password to get in without an administrator: the reset path needs a
working e-mail address and an administrator to issue the link.

A public "register" form that let anybody type any details would have created a
second, fake row for a person who is already on the sheet — two accounts for one
employee number, and a directory nobody can trust.

## Decision

**Registration is a claim on an existing row.** `/register` asks for the employee
number first and looks it up in the imported directory:

* not on the sheet → refused, with the Complaint Hub as the way to be added;
* deactivated → refused;
* already carries a password → refused, "sign in instead" (otherwise anybody who
  knows a colleague's number could take the account over).

Only then is the rest of the form drawn, and the name, region, district, facility
and grade are **read-only, from HRIMS**. The person supplies an e-mail address,
a phone number, an optional second number and a password of at least ten
characters, and the row is updated in place. Lookups are rate-limited per employee
number, and the server re-reads the row on submit rather than trusting the page.

**The sign-in card is two halves again.** Getting started and what the portal is
for on the left, the form on the right, at `lg` and above; a phone gets the form
first with the brand line above it. Under the Sign in button: *Create an account*,
then the Complaint Hub, which is the order they are reached for.

## Consequences

* One account per employee number, always the one the sheet created.
* A person whose number is wrong or missing needs the Complaint Hub, not a second
  registration — which is the record we wanted anyway.
* The alternative phone number is kept in the audit row for now; there is no
  column for it, and nothing reads one yet.
