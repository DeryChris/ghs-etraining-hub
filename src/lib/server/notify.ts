import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { notificationRecipients, notifications, users } from "@/db/schema";
import type { AudienceFilter } from "@/lib/notification-audience";
import { log } from "@/lib/server/logger";

/**
 * Writing notices for other people.
 *
 * Everything the service tells somebody goes through this module, so there is one
 * answer to "who hears about this?" instead of one per feature. Three rules hold
 * everywhere:
 *
 *  1. **Nobody is told about their own action.** The actor id is passed in and
 *     filtered out, so publishing your own material does not notify you.
 *  2. **A notice points at something.** `linkUrl` is required by these helpers: a
 *     notification without a destination is noise.
 *  3. **Failing to notify must never fail the action.** Every helper swallows its
 *     own errors into a log line — a training that was approved stays approved
 *     even if the bell cannot be rung.
 */

export type NoticeType =
  | "TRAINING_PUBLISHED"
  | "TRAINING_RETURNED"
  | "MATERIAL_PUBLISHED"
  | "DIRECT_MESSAGE"
  | "COMPLAINT_UPDATE"
  | "ACCOUNT"
  | "REVIEW_REQUEST";

interface NoticeInput {
  title: string;
  body: string;
  type: NoticeType;
  linkUrl: string;
  /** The person who caused it, so they are not notified about themselves. */
  actorId?: string | null;
  /** Narrow a broadcast to a cohort; omit for everybody. */
  audienceFilter?: AudienceFilter | null;
  /** Direct recipients instead of a broadcast. */
  userIds?: string[];
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

async function deliver(input: NoticeInput): Promise<void> {
  try {
    const audience = input.userIds?.length ? "DIRECT" : "ALL";

    const [row] = await db
      .insert(notifications)
      .values({
        title: input.title,
        body: input.body,
        type: input.type,
        priority: input.priority ?? "MEDIUM",
        linkUrl: input.linkUrl,
        audience,
        audienceFilter: input.audienceFilter ?? null,
      })
      .returning({ id: notifications.id });
    if (!row) return;

    if (input.userIds?.length) {
      // Only active accounts, and never the actor: a deactivated row cannot sign
      // in, so a notice addressed to it would be dead weight in the count.
      const recipients = await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, input.userIds), eq(users.isActive, true)));
      const rows = recipients
        .filter((person) => person.id !== input.actorId)
        .map((person) => ({ notificationId: row.id, userId: person.id }));
      if (rows.length === 0) {
        // Nothing was addressed. Leave no orphan notice behind to inflate counts.
        await db.delete(notifications).where(eq(notifications.id, row.id));
        return;
      }
      await db.insert(notificationRecipients).values(rows).onConflictDoNothing();
    }

    log.info({ event: "notification.delivered", type: input.type, audience, recipients: input.userIds?.length ?? null });
  } catch (error) {
    // Notification is best-effort by design; the action that triggered it stands.
    log.warn({ event: "notification.failed", type: input.type, error: String(error) });
  }
}

/** A facilitator's training has been approved: everybody can see it now. */
export async function notifyTrainingPublished(input: {
  trainingId: string;
  title: string;
  fieldName: string | null;
  actorId: string;
}): Promise<void> {
  await deliver({
    title: "New training added",
    body: `${input.title}${input.fieldName ? ` — ${input.fieldName}` : ""} is now live. Details, attendance and resources are on the training page.`,
    type: "TRAINING_PUBLISHED",
    linkUrl: `/trainings/${input.trainingId}`,
    actorId: input.actorId,
    priority: "MEDIUM",
  });
}

/** The unit head returned a training for correction: only its author needs to know. */
export async function notifyTrainingReturned(input: {
  trainingId: string;
  title: string;
  authorId: string;
  note: string;
  actorId: string;
}): Promise<void> {
  if (input.authorId === input.actorId) return;
  await deliver({
    title: "A training of yours was returned for correction",
    body: `${input.title}: ${input.note}`,
    type: "TRAINING_RETURNED",
    linkUrl: `/trainings/${input.trainingId}`,
    actorId: input.actorId,
    userIds: [input.authorId],
    priority: "HIGH",
  });
}

/** A material went live: tell the cohort it was targeted at, nobody else. */
export async function notifyMaterialPublished(input: {
  materialId: string;
  title: string;
  areaName: string;
  actorId: string;
  audienceFilter?: AudienceFilter | null;
}): Promise<void> {
  await deliver({
    title: "New material in the library",
    body: `${input.title} — filed under ${input.areaName}. Open it from the library.`,
    type: "MATERIAL_PUBLISHED",
    linkUrl: `/materials/${input.materialId}`,
    actorId: input.actorId,
    audienceFilter: input.audienceFilter ?? null,
    priority: "MEDIUM",
  });
}

/** Somebody wrote to somebody. */
export async function notifyDirectMessage(input: {
  recipientId: string;
  senderName: string;
  messageId: string;
  actorId: string;
}): Promise<void> {
  await deliver({
    title: `Message from ${input.senderName}`,
    body: "Open Messages to read it and reply.",
    type: "DIRECT_MESSAGE",
    linkUrl: `/messages?with=${input.actorId}`,
    actorId: input.actorId,
    userIds: [input.recipientId],
    priority: "HIGH",
  });
}

/** The Complaint Hub answered the person who lodged it. */
export async function notifyComplaintUpdate(input: {
  userId: string;
  complaintId: string;
  reference: string;
  actorId: string;
}): Promise<void> {
  await deliver({
    title: `Update on complaint ${input.reference}`,
    body: "The Complaint Hub has replied to your complaint.",
    type: "COMPLAINT_UPDATE",
    linkUrl: `/help/status?ref=${encodeURIComponent(input.reference)}`,
    actorId: input.actorId,
    userIds: [input.userId],
    priority: "HIGH",
  });
}

/**
 * Something arrived that somebody has to decide.
 *
 * Sent to whoever holds the field *now*, which is what makes an appointment
 * retroactive in the other direction too: the queue is read live, and this is the
 * tap on the shoulder that says it changed.
 */
export async function notifyReviewRequest(input: {
  reviewerIds: string[];
  title: string;
  body: string;
  linkUrl: string;
  actorId: string;
  actorName: string;
}): Promise<void> {
  if (input.reviewerIds.length === 0) return;
  await deliver({
    title: input.title,
    body: `${input.body} — filed by ${input.actorName}.`,
    type: "REVIEW_REQUEST",
    linkUrl: input.linkUrl,
    actorId: input.actorId,
    userIds: input.reviewerIds,
    priority: "HIGH",
  });
}

/** Something changed about the account itself. */
export async function notifyAccount(input: {
  userId: string;
  title: string;
  body: string;
  actorId?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}): Promise<void> {
  await deliver({
    title: input.title,
    body: input.body,
    type: "ACCOUNT",
    linkUrl: "/settings",
    actorId: input.actorId ?? null,
    userIds: [input.userId],
    priority: input.priority ?? "MEDIUM",
  });
}

/** Kept for callers that only need the count of people a broadcast would reach. */
export async function countActiveStaff(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.isActive, true));
  return row?.n ?? 0;
}
