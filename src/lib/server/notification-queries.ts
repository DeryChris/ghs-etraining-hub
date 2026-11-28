import "server-only";
import { and, count, desc, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { districts, notifications } from "@/db/schema";
import { readByUser, visibleNotifications } from "@/lib/server/notification-filter";
import { describeAudience, isAudienceFilter, type AudienceFilter } from "@/lib/notification-audience";
import type { Viewer } from "@/lib/viewer";

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

  /*
   * A district is stored as an id, so the history resolves it to a name before it
   * is printed. The reference table is tiny and this runs once per page.
   */
  const districtRows = await db.select({ id: districts.id, name: districts.name }).from(districts);
  const names = new Map(districtRows.map((row) => [row.id, row.name]));

  return rows.map(({ audienceFilter, ...row }) => ({
    ...row,
    audienceLabel: describeAudience(
      isAudienceFilter(audienceFilter) ? (audienceFilter as AudienceFilter) : null,
      names,
    ),
  }));
}

type AudienceLabel = string;
