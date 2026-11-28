import "server-only";
import { eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { areaFacilitators, fieldFacilitators, trainingSessions } from "@/db/schema";
import type { Session } from "@/lib/server/session";

/**
 * What a facilitator may work on.
 *
 * A facilitator holds two kinds of grant, named after the tables they live in
 * rather than the words on screen (ADR-0031 swapped the vocabulary):
 *
 *   * `field_facilitators` grants a parent `programme_fields` row — on screen, a
 *     whole **Programme Area**, and every Programme Field under it, including the
 *     ones added later;
 *   * `area_facilitators` grants one child `programme_areas` row — on screen, a
 *     single **Programme Field**.
 *
 * Authority is read from the database on every request, never from the session
 * cookie and never from the form: grants can be withdrawn between two clicks, and
 * the id in a posted form is the caller's to choose. `review-scope.ts` reads the
 * same two tables for the decision queue; both are deliberately uncached, and a
 * facilitator is scoped by the grants whether or not they are also a unit head.
 */

export interface ProgrammeGrants {
  /** Parent rows — the Programme Areas held outright. */
  fieldIds: string[];
  /** Child rows — individual Programme Fields. */
  areaIds: string[];
}

export async function programmeGrantsFor(userId: string): Promise<ProgrammeGrants> {
  const [fields, areas] = await Promise.all([
    db.select({ id: fieldFacilitators.fieldId }).from(fieldFacilitators).where(eq(fieldFacilitators.userId, userId)),
    db.select({ id: areaFacilitators.areaId }).from(areaFacilitators).where(eq(areaFacilitators.userId, userId)),
  ]);
  return { fieldIds: fields.map((row) => row.id), areaIds: areas.map((row) => row.id) };
}

/**
 * The predicate over `training_sessions` for a set of grants.
 *
 * `undefined` means "no restriction" and is returned only when the caller passed
 * no grants at all — an administrator, or a learner reading published rows. A
 * facilitator with no grants gets `false`, which is the honest answer: nothing is
 * assigned to them, so nothing is theirs to see or change.
 */
export function programmeGrantsFilter(grants: ProgrammeGrants | null | undefined): SQL | undefined {
  if (grants === undefined) return undefined;
  if (!grants) return sql`false`;
  const clauses: SQL[] = [];
  if (grants.fieldIds.length) clauses.push(inArray(trainingSessions.programmeFieldId, grants.fieldIds));
  if (grants.areaIds.length) clauses.push(inArray(trainingSessions.programmeAreaId, grants.areaIds));
  if (!clauses.length) return sql`false`;
  return clauses.length === 1 ? clauses[0] : sql`(${clauses[0]} or ${clauses[1]})`;
}

/** Does this training sit inside these grants? */
export function grantsCoverTraining(
  grants: ProgrammeGrants,
  training: { programmeFieldId: string | null; programmeAreaId: string | null },
): boolean {
  if (training.programmeFieldId && grants.fieldIds.includes(training.programmeFieldId)) return true;
  if (training.programmeAreaId && grants.areaIds.includes(training.programmeAreaId)) return true;
  return false;
}

/**
 * May this session change this training — attach a file, comment, archive it?
 *
 * A facilitator needs a grant covering the training. An administrator always may.
 * Everybody else never: these are staff actions, and `training.manage` is checked
 * before this runs.
 */
export async function canWorkOnTraining(session: Pick<Session, "sub" | "role">, trainingId: string): Promise<boolean> {
  if (session.role === "SYSTEM_ADMIN") return true;
  if (session.role !== "FACILITATOR") return false;

  const [row] = await db
    .select({
      programmeFieldId: trainingSessions.programmeFieldId,
      programmeAreaId: trainingSessions.programmeAreaId,
    })
    .from(trainingSessions)
    .where(eq(trainingSessions.id, trainingId))
    .limit(1);
  if (!row) return false;

  return grantsCoverTraining(await programmeGrantsFor(session.sub), row);
}

/**
 * Narrows the shared "Programme Area → Programme Field" option list to what a
 * facilitator may pick. A parent they hold keeps every child, including children
 * created after the grant was made; anything else is dropped entirely, so the
 * form never offers a choice the action would then refuse.
 */
export function trimOptionsToGrants<T extends { id: string; areas: { id: string }[] }>(
  options: T[],
  grants: ProgrammeGrants,
): T[] {
  if (!grants.fieldIds.length && !grants.areaIds.length) return [];
  return options
    .map((field) => {
      if (grants.fieldIds.includes(field.id)) return field;
      const areas = field.areas.filter((area) => grants.areaIds.includes(area.id));
      return areas.length ? { ...field, areas } : null;
    })
    .filter((field): field is T => field !== null);
}
