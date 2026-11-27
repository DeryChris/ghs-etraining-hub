import "server-only";

import { and, eq, inArray, or, sql, type Column, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, fieldFacilitators, materials, programmeAreas, trainingSessions, users } from "@/db/schema";
import { log } from "@/lib/server/logger";
import type { Viewer } from "@/lib/viewer";

/*
 * "What is waiting for this person to decide?"
 *
 * The answer is derived, every time it is asked, from the assignments that exist
 * right now — never from a list of reviewers captured when something was
 * submitted. That distinction is the whole point of this module. A queue built
 * from a snapshot at submit time goes stale the moment a unit head is appointed:
 * every item filed before their first day stays invisible to them, and the queue
 * silently stops matching the role. A unit head assigned to a Programme Area
 * can decide on records under all of its Programme Fields, however old — and
 * the moment the appointment exists, they see the queue.
 *
 * A grant may be at either level: the whole parent Programme Area (the legacy
 * `field_facilitators` table) or one child Programme Field (the legacy
 * `area_facilitators` table). Both are read here, and nothing is cached between
 * calls.
 */

export interface ReviewScope {
  /** Administrators decide everything. */
  all: boolean;
  fieldIds: string[];
  areaIds: string[];
  /** A unit head with no assignment yet cannot decide anything — say so plainly. */
  empty: boolean;
}

const NOBODY: ReviewScope = { all: false, fieldIds: [], areaIds: [], empty: true };

export async function reviewScopeFor(viewer: Viewer): Promise<ReviewScope> {
  if (viewer.role === "SYSTEM_ADMIN") return { all: true, fieldIds: [], areaIds: [], empty: false };
  if (viewer.role !== "FACILITATOR" || viewer.unitHead !== true) return NOBODY;

  try {
    const [fields, areas, row] = await Promise.all([
      db.select({ id: fieldFacilitators.fieldId }).from(fieldFacilitators).where(eq(fieldFacilitators.userId, viewer.id)),
      db.select({ id: areaFacilitators.areaId }).from(areaFacilitators).where(eq(areaFacilitators.userId, viewer.id)),
      db.select({ isUnitHead: users.isUnitHead }).from(users).where(eq(users.id, viewer.id)).limit(1),
    ]);
    // The role comes from the session above, but the duty lives on the row: read
    // it again so somebody whose duty was removed mid-session stops seeing the
    // queue instead of carrying a stale claim.
    if (!row[0]?.isUnitHead) return NOBODY;

    const fieldIds = fields.map((entry) => entry.id);
    const areaIds = areas.map((entry) => entry.id);
    return { all: false, fieldIds, areaIds, empty: fieldIds.length === 0 && areaIds.length === 0 };
  } catch (error) {
    log.warn({ event: "review_scope.unavailable", viewer: viewer.id, error: String(error) });
    return NOBODY;
  }
}

/**
 * The SQL predicate for "this row falls in the viewer's scope".
 *
 * The caller supplies the parent and child taxonomy columns of the row under
 * test. In this schema, `field` means the parent Programme Area id and `area`
 * means the child Programme Field id; a material reaches its parent through the
 * Programme Field join.
 */
export function reviewsInScope(
  scope: ReviewScope,
  columns: { field: Column; area: Column },
): SQL | undefined {
  if (scope.all) return undefined;
  if (scope.empty) return sql`false`;
  const parts: SQL[] = [];
  if (scope.fieldIds.length > 0) parts.push(inArray(columns.field, scope.fieldIds));
  if (scope.areaIds.length > 0) parts.push(inArray(columns.area, scope.areaIds));
  return parts.length === 0 ? sql`false` : or(...parts);
}

/** Active unit heads granted a parent Programme Area or one of its Programme Fields. */
export async function unitHeadsForField(fieldId: string | null): Promise<string[]> {
  if (!fieldId) return [];
  try {
    const byField = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .innerJoin(fieldFacilitators, eq(fieldFacilitators.userId, users.id))
      .where(and(eq(fieldFacilitators.fieldId, fieldId), eq(users.isUnitHead, true), eq(users.isActive, true)));

    const byArea = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .innerJoin(areaFacilitators, eq(areaFacilitators.userId, users.id))
      .innerJoin(programmeAreas, eq(programmeAreas.id, areaFacilitators.areaId))
      .where(and(eq(programmeAreas.fieldId, fieldId), eq(users.isUnitHead, true), eq(users.isActive, true)));

    return [...new Set([...byField, ...byArea].map((row) => row.id))];
  } catch (error) {
    log.warn({ event: "review_scope.heads_unavailable", fieldId, error: String(error) });
    return [];
  }
}

/** How much is waiting in one person's scope, by kind. */
export async function countWaitingFor(viewer: Viewer): Promise<{ trainings: number; materials: number }> {
  const scope = await reviewScopeFor(viewer);
  if (scope.empty && !scope.all) return { trainings: 0, materials: 0 };

  const trainingWhere = reviewsInScope(scope, {
    field: trainingSessions.programmeFieldId,
    area: trainingSessions.programmeAreaId,
  });
  const materialWhere = reviewsInScope(scope, {
    field: programmeAreas.fieldId,
    area: materials.programmeAreaId,
  });

  try {
    const [trainingRow, materialRow] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(trainingSessions)
        .where(and(eq(trainingSessions.reviewState, "PENDING"), eq(trainingSessions.isArchived, false), trainingWhere)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(materials)
        .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
        .where(and(eq(materials.state, "IN_REVIEW"), materialWhere)),
    ]);
    return { trainings: trainingRow[0]?.n ?? 0, materials: materialRow[0]?.n ?? 0 };
  } catch (error) {
    log.warn({ event: "review_scope.count_failed", viewer: viewer.id, error: String(error) });
    return { trainings: 0, materials: 0 };
  }
}
