import "server-only";
import { and, count, desc, eq, exists, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { notificationReadCursors, notificationRecipients, notifications } from "@/db/schema";
import { describeAudience, isAudienceFilter, type AudienceFilter } from "@/lib/notification-audience";
import type { Viewer } from "@/lib/viewer";

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

/**
 * `audience_filter` narrows a broadcast to a cohort. Each dimension is optional:
 * absent → any; present → the viewer's own value must equal it, and a viewer with
 * no value for that dimension does not match (no leakage by omission).
 */
function audienceMatches(viewer: Viewer) {
  const filter = notifications.audienceFilter;
  return or(
    isNull(filter),
    and(
      sql`(${filter}->>'region' is null or ${filter}->>'region' = ${viewer.region})`,
      sql`(${filter}->>'directorate' is null or ${filter}->>'directorate' = ${viewer.directorate})`,
      sql`(${filter}->>'cadre' is null or ${filter}->>'cadre' = ${viewer.cadre})`,
    ),
  );
}

/** Notices visible to a viewer: unexpired, addressed to them, or broadcast to their cohort. */
export function visibleNotifications(viewer: Viewer) {
  return and(
    or(isNull(notifications.expiresAt), gt(notifications.expiresAt, sql`now()`)),
    or(exists(addressedToUser(viewer.id)), and(eq(notifications.audience, "ALL"), audienceMatches(viewer))),
  );
}

export async function listNotifications(viewer: Viewer, limit = 50) {
  return db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      type: notifications.type,
      priority: notifications.priority,
      linkUrl: notifications.linkUrl,
      publishedAt: notifications.publishedAt,
      isRead: sql<boolean>`exists (${readByUser(viewer.id)})`,
    })
    .from(notifications)
    .where(visibleNotifications(viewer))
    .orderBy(desc(notifications.publishedAt))
    .limit(limit);
}

export async function countUnreadNotifications(viewer: Viewer): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(visibleNotifications(viewer), sql`not exists (${readByUser(viewer.id)})`));
  return row?.n ?? 0;
}

export interface SentNoticeRow {
  id: string;
  title: string;
  type: string;
  priority: string;
  audience: string;
  publishedAt: Date;
  expiresAt: Date | null;
}

/** Staff-facing history: the notices most recently published, with their audience. */
export async function listSentNotices(limit = 10): Promise<(SentNoticeRow & { audienceLabel: AudienceLabel })[]> {
  const rows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      type: notifications.type,
      priority: notifications.priority,
      audience: notifications.audience,
      audienceFilter: notifications.audienceFilter,
      publishedAt: notifications.publishedAt,
      expiresAt: notifications.expiresAt,
    })
    .from(notifications)
    .orderBy(desc(notifications.publishedAt))
    .limit(limit);

  return rows.map(({ audienceFilter, ...row }) => ({
    ...row,
    audienceLabel: describeAudience(isAudienceFilter(audienceFilter) ? (audienceFilter as AudienceFilter) : null),
  }));
}

type AudienceLabel = string;
