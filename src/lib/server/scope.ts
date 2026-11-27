import "server-only";
import { and, eq, exists, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, fieldFacilitators, programmeAreas } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/**
 * Row scope for any query that reads across programmes.
 *
 * A SYSTEM_ADMIN is unscoped. A facilitator is limited to the Programme Areas
 * and Programme Fields they hold: `field_facilitators` grants the parent
 * database `programme_fields` row (user-facing Programme Area), while
 * `area_facilitators` grants one child `programme_areas` row (Programme Field).
 * Both are read from the database, never from the request (docs/rbac.md §2).
 * A learner gets `false`, because these queries back staff surfaces; learner
 * reads use the visibility predicates in `visibility.ts` instead.
 *
 * The database names preserve the older reversed vocabulary. ADR-0014 moved
 * legacy directorate grants to the taxonomy, and the migration expanded those
 * grants to the Programme Fields under each corresponding Programme Area.
 *
 * IMPORTANT: this predicate refers to `programme_areas.id`, so queries using it
 * must join `programme_areas`. These grants define material-authoring scope, not
 * Trainings register access. Training queries use the visibility rules in
 * `training-queries.ts` instead.
 */
export function scopeFor(viewer: Viewer): SQL | undefined {
  if (!isStaffRole(viewer.role)) return sql`false`;
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  return or(
    exists(
      db
        .select({ one: sql`1` })
        .from(areaFacilitators)
        .where(and(eq(areaFacilitators.areaId, programmeAreas.id), eq(areaFacilitators.userId, viewer.id))),
    ),
    exists(
      db
        .select({ one: sql`1` })
        .from(fieldFacilitators)
        .where(and(eq(fieldFacilitators.fieldId, programmeAreas.fieldId), eq(fieldFacilitators.userId, viewer.id))),
    ),
  );
}

/** Whether a facilitator may act on this specific Programme Field. */
export function scopeForArea(viewer: Viewer, areaId: string): SQL | undefined {
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  if (!isStaffRole(viewer.role)) return sql`false`;
  return or(
    exists(
      db
        .select({ one: sql`1` })
        .from(areaFacilitators)
        .where(and(eq(areaFacilitators.areaId, areaId), eq(areaFacilitators.userId, viewer.id))),
    ),
    exists(
      db
        .select({ one: sql`1` })
        .from(fieldFacilitators)
        .innerJoin(programmeAreas, eq(programmeAreas.fieldId, fieldFacilitators.fieldId))
        .where(and(eq(programmeAreas.id, areaId), eq(fieldFacilitators.userId, viewer.id))),
    ),
  );
}
