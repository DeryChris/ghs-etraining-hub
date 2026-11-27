# ADR‑0029 — One inbox, and work that comes back

Date: 2026-11-17
Status: accepted

## Context

Two things were separate that the people using them were not separating.

**Messages and complaints.** `/messages` held conversations with colleagues;
`/complaints` held what staff had reported through the public Complaint Hub, in a
second inbox with its own cards, its own filters and its own place in the
sidebar. A facilitator answering a complaint and then a colleague changed
screens, and the bell counted the two in different places. Both are "somebody
wrote to me and I owe them a reply".

**Returned trainings.** A unit head could return a facilitator's training for
correction, and the database recorded it (`training_sessions.review_state =
'REJECTED'`, with the reviewer's note) — but nothing told the author to go and
look. The training sat in the list like any other, so a correction could wait
weeks, and the only way to find out was to open it and read the banner.

## Decision

**One inbox.** `/messages` is "Messages & complaints": one list, every thread
carrying a chip that says which it is, and three buttons above it — All,
Messages, Complaints. Selecting a complaint opens it in the same right-hand pane
a conversation opens in, with the same reply box. `/complaints` redirects here so
old links keep working; there is no second complaints screen.

**Returned is a state with an owner.** `REJECTED` is displayed as *Returned for
correction* everywhere it is shown. It appears as a card at the top of the
author's dashboard — title, the reviewer's note, and one link to the training —
and as a filter (`/trainings?review=REJECTED`). Saving the corrected training
returns it to `PENDING` for the same unit head, who is notified.

## Consequences

* Unread counts stay about conversations; open complaints are counted on the page
  (`N complaints still open`) rather than in the badge, because a complaint is a
  queue with a deadline, not an unread message.
* The audit trail records the same events as before (`TRAINING_REJECTED`,
  `TRAINING_RETURNED` notification); only the words on screen changed.
* `listReturnedTrainings` is scoped to the author: a returned training is nobody
  else's task.
