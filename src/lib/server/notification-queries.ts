import "server-only";
import { and, count, desc, eq, exists, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { notificationReadCursors, notificationRecipients, notifications } from "@/db/schema";

/*
 * Correlated subqueries are built with the query builder (eq/and/exists), never with
 * raw column references inside sql``. Raw references render unqualified in some
 * contexts, so `id` would silently bind to the subquery's own table.
 */
function addressedToUser(userId: string) {
  return db
    .select({ one: sql`1` })
    .from(notificationRecipients)
    .where(
      and(eq(notificationRecipients.notificationId, notifications.id), eq(notificationRecipients.userId, userId)),
    );
}

function readByUser(userId: string) {
  return db
    .select({ one: sql`1` })
    .from(notificationReadCursors)
    .where(and(eq(notificationReadCursors.notificationId, notifications.id), eq(notificationReadCursors.userId, userId)));
}

/** Notices visible to a user: unexpired, and either broadcast to ALL or addressed to them. */
export function visibleNotifications(userId: string) {
  return and(
    or(isNull(notifications.expiresAt), gt(notifications.expiresAt, sql`now()`)),
    or(eq(notifications.audience, "ALL"), exists(addressedToUser(userId))),
  );
}

export async function listNotifications(userId: string, limit = 50) {
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      type: notifications.type,
      priority: notifications.priority,
      linkUrl: notifications.linkUrl,
      publishedAt: notifications.publishedAt,
      isRead: sql<boolean>`exists (${readByUser(userId)})`,
    })
    .from(notifications)
    .where(visibleNotifications(userId))
    .orderBy(desc(notifications.publishedAt))
    .limit(limit);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(visibleNotifications(userId), sql`not exists (${readByUser(userId)})`));
  return row?.n ?? 0;
}
