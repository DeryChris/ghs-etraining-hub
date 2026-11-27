import { and, eq, exists, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { notificationReadCursors, notificationRecipients, notifications } from "@/db/schema";
import type { Viewer } from "@/lib/viewer";

/**
 * Which notices a person can see, as SQL.
 *
 * Kept apart from the queries that use it so it can be rendered and inspected
 * without a database. The audience comparison interpolates three values straight
 * into SQL, and drizzle *drops* an `undefined` parameter rather than binding NULL —
 * so a viewer object without those keys renders `= )`, a syntax error instead of a
 * mild mismatch. The session-derived viewer always carries null, but a viewer built
 * by hand (a harness, a future serialized session) may not.
 */

/*
 * Correlated subqueries are built with the query builder (eq/and/exists), never with
 * raw column references inside sql``. Raw references render unqualified in some
 * contexts, so `id` would silently bind to the subquery's own table.
 */
export function addressedToUser(userId: string) {
  return db
    .select({ one: sql`1` })
    .from(notificationRecipients)
    .where(
      and(eq(notificationRecipients.notificationId, notifications.id), eq(notificationRecipients.userId, userId)),
    );
}

export function readByUser(userId: string) {
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
export function audienceMatches(viewer: Viewer) {
  const filter = notifications.audienceFilter;
  /*
   * `?? null` is load-bearing, not noise. Drizzle drops an `undefined` parameter
   * instead of binding NULL, which leaves the comparison as `= )` — Postgres calls
   * that a syntax error and the whole query fails, rather than the intended "no
   * match". Passing null binds NULL: `x = NULL` is not true, so a viewer with no
   * value for a dimension correctly does not match a filter on it.
   */
  return or(
    isNull(filter),
    and(
      sql`(${filter}->>'region' is null or ${filter}->>'region' = ${viewer.region ?? null})`,
      sql`(${filter}->>'directorate' is null or ${filter}->>'directorate' = ${viewer.directorate ?? null})`,
      sql`(${filter}->>'cadre' is null or ${filter}->>'cadre' = ${viewer.cadre ?? null})`,
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

