import "server-only";
import { and, eq, exists, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, programmeAreas, trainingSessions } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/**
 * Row scope for any query that reads across programmes.
 *
 * A SYSTEM_ADMIN is unscoped. A facilitator is limited to the programme areas
 * they are assigned to in `area_facilitators` — read from the database, never
 * from the request (docs/rbac.md §2). A learner gets `false`, because these
 * queries back staff surfaces; anything a learner may read goes through the
 * library predicates in `visibility.ts` instead.
 *
 * Assignments used to be per directorate; ADR-0014 moved them to the area, which
 * is the unit content is filed under. The migration expanded every existing
 * grant to all the areas of the field that directorate became, so nobody lost
 * reach.
 *
 * IMPORTANT: this predicate refers to `programme_areas.id`, so the query using it
 * must have `programme_areas` in its FROM — joined, not merely mentioned. A query
 * that starts from `training_sessions` and adds this produced
 * `missing FROM-clause entry for table "programme_areas"` at runtime, and because
 * that failure was inside a page's parallel data load, the whole Insights tab
 * showed its retry card. Use `scopeForTraining()` for anything that starts at a
 * training.
 */
export function scopeFor(viewer: Viewer): SQL | undefined {
  if (!isStaffRole(viewer.role)) return sql`false`;
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  return exists(
    db
      .select({ one: sql`1` })
      .from(areaFacilitators)
      .where(
        and(eq(areaFacilitators.areaId, programmeAreas.id), eq(areaFacilitators.userId, viewer.id)),
      ),
  );
}

/**
 * Row scope for queries that start at `training_sessions`.
 *
 * The trainings table carries `programme_area_id`, so scope is expressed against
 * that column and a subquery over the assignments — no correlated reference to a
 * table the query has not joined.
 */
export function scopeForTraining(viewer: Viewer): SQL | undefined {
  if (!isStaffRole(viewer.role)) return sql`false`;
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  return inArray(
    trainingSessions.programmeAreaId,
    db
      .select({ areaId: areaFacilitators.areaId })
      .from(areaFacilitators)
      .where(eq(areaFacilitators.userId, viewer.id)),
  );
}

/** Whether a facilitator may act on this specific area. */
export function scopeForArea(viewer: Viewer, areaId: string): SQL | undefined {
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  if (!isStaffRole(viewer.role)) return sql`false`;
  return exists(
    db
      .select({ one: sql`1` })
      .from(areaFacilitators)
      .where(and(eq(areaFacilitators.areaId, areaId), eq(areaFacilitators.userId, viewer.id))),
  );
}
