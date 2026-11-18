import "server-only";
import { and, eq, exists, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, programmeAreas } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/**
 * Row scope for any query that reads across programmes.
 *
 * A SYSTEM_ADMIN is unscoped. A facilitator is limited to the programme areas
 * they are assigned to in `area_facilitators` — read from the database, never
 * from the request (docs/rbac.md §2). A learner gets `false`, because these
 * queries back staff surfaces; anything a learner may read goes through the
 * catalogue predicates in `visibility.ts` instead.
 *
 * Assignments used to be per directorate; ADR-0014 moved them to the area, which
 * is the unit content is filed under. The migration expanded every existing
 * grant to all the areas of the field that directorate became, so nobody lost
 * reach.
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
