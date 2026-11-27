import "server-only";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import {
  programmeFields,
  materialVersions,
  materials,
  reviewAssignments,
  programmeAreas,
  trainingSessions,
  users,
} from "@/db/schema";
import type { MaterialState, ReviewDecision } from "@/lib/material-workflow";
import type { MaterialType, PriorityLevel } from "@/lib/labels";
import { reviewsInScope, reviewScopeFor } from "@/lib/server/review-scope";
import { scopeFor } from "@/lib/server/scope";
import type { Viewer } from "@/lib/viewer";

export interface AuthoringMaterialRow {
  id: string;
  title: string;
  state: MaterialState;
  type: MaterialType;
  priority: PriorityLevel;
  fieldId: string;
  fieldName: string;
  areaName: string;
  authorName: string;
  updatedAt: Date;
  currentVersionNumber: number | null;
  versionCount: number;
}

export async function listAuthoringMaterials(viewer: Viewer): Promise<AuthoringMaterialRow[]> {
  const defaultVersion = db
    .select({ n: materialVersions.version })
    .from(materialVersions)
    .where(eq(materialVersions.id, materials.currentVersionId));

  const versionTotal = db
    .select({ n: sql<number>`count(*)::int` })
    .from(materialVersions)
    .where(eq(materialVersions.materialId, materials.id));

  return db
    .select({
      id: materials.id,
      title: materials.title,
      state: materials.state,
      type: materials.type,
      priority: materials.priority,
      fieldId: programmeFields.id,
      fieldName: programmeFields.name,
      areaName: programmeAreas.name,
      authorName: users.fullName,
      updatedAt: materials.updatedAt,
      currentVersionNumber: sql<number | null>`(${defaultVersion})`,
      versionCount: sql<number>`coalesce((${versionTotal}), 0)::int`,
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .innerJoin(users, eq(users.id, materials.authorId))
    .where(and(scopeFor(viewer)))
    .orderBy(asc(materials.title));
}

export interface AuthoringVersion {
  id: string;
  version: number;
  state: MaterialState;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  changeNote: string | null;
  scanStatus: "PENDING" | "CLEAN" | "INFECTED";
  createdAt: Date;
  publishedAt: Date | null;
  uploadedById: string;
  uploadedByName: string;
  reviews: { reviewerId: string; reviewerName: string; decision: ReviewDecision; comment: string | null; createdAt: Date }[];
}

export interface AuthoringMaterialDetail {
  id: string;
  title: string;
  summary: string | null;
  state: MaterialState;
  type: MaterialType;
  priority: PriorityLevel;
  estimatedMinutes: number | null;
  programmeAreaId: string;
  areaName: string;
  areaCode: string;
  fieldId: string;
  fieldName: string;
  authorId: string;
  authorName: string;
  currentVersionId: string | null;
  versions: AuthoringVersion[];
}

export async function getAuthoringMaterial(materialId: string, viewer: Viewer): Promise<AuthoringMaterialDetail | null> {
  const [row] = await db
    .select({
      material: materials,
      areaName: programmeAreas.name,
      areaCode: programmeAreas.code,
      fieldId: programmeFields.id,
      fieldName: programmeFields.name,
      authorId: users.id,
      authorName: users.fullName,
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .innerJoin(users, eq(users.id, materials.authorId))
    .where(and(eq(materials.id, materialId), scopeFor(viewer)))
    .limit(1);
  if (!row) return null;

  const versionRows = await db
    .select({
      version: materialVersions,
      uploadedByName: users.fullName,
    })
    .from(materialVersions)
    .innerJoin(users, eq(users.id, materialVersions.uploadedById))
    .where(eq(materialVersions.materialId, materialId))
    .orderBy(sql`${materialVersions.version} desc`);

  const versionIds = versionRows.map((entry) => entry.version.id);
  const reviewRows = versionIds.length
    ? await db
        .select({
          materialVersionId: reviewAssignments.materialVersionId,
          reviewerId: reviewAssignments.reviewerId,
          reviewerName: users.fullName,
          decision: reviewAssignments.decision,
          comment: reviewAssignments.comment,
          createdAt: reviewAssignments.createdAt,
        })
        .from(reviewAssignments)
        .innerJoin(users, eq(users.id, reviewAssignments.reviewerId))
        .where(inArray(reviewAssignments.materialVersionId, versionIds))
    : [];

  const versions: AuthoringVersion[] = versionRows.map(({ version, uploadedByName }) => ({
    id: version.id,
    version: version.version,
    state: version.state,
    mimeType: version.mimeType,
    sizeBytes: version.sizeBytes,
    storageKey: version.storageKey,
    changeNote: version.changeNote,
    scanStatus: version.scanStatus,
    createdAt: version.createdAt,
    publishedAt: version.publishedAt,
    uploadedById: version.uploadedById,
    uploadedByName,
    reviews: reviewRows
      .filter((review) => review.materialVersionId === version.id && review.decision !== null)
      .map((review) => ({
        reviewerId: review.reviewerId,
        reviewerName: review.reviewerName,
        decision: review.decision === "APPROVED" ? "APPROVED" : "REJECTED",
        comment: review.comment,
        createdAt: review.createdAt,
      })),
  }));

  return {
    id: row.material.id,
    title: row.material.title,
    summary: row.material.summary,
    state: row.material.state,
    type: row.material.type,
    priority: row.material.priority,
    estimatedMinutes: row.material.estimatedMinutes,
    programmeAreaId: row.material.programmeAreaId,
    areaName: row.areaName,
    areaCode: row.areaCode,
    fieldId: row.fieldId,
    fieldName: row.fieldName,
    authorId: row.authorId,
    authorName: row.authorName,
    currentVersionId: row.material.currentVersionId,
    versions,
  };
}

export interface AuthoringArea {
  id: string;
  code: string;
  name: string;
  fieldId: string;
  fieldCode: string;
  fieldName: string;
}

/** Programme areas a staff member may author into — the ones they are assigned to. */
export async function listAuthoringAreas(viewer: Viewer): Promise<AuthoringArea[]> {
  return db
    .select({
      id: programmeAreas.id,
      code: programmeAreas.code,
      name: programmeAreas.name,
      fieldId: programmeFields.id,
      fieldCode: programmeFields.code,
      fieldName: programmeFields.name,
    })
    .from(programmeAreas)
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(eq(programmeAreas.isArchived, false), eq(programmeFields.isArchived, false), scopeFor(viewer)))
    .orderBy(asc(programmeFields.name), asc(programmeAreas.name));
}

/**
 * The programme field a material is filed under — the scope key for every
 * authoring action. Authority is per area since ADR-0014, so this is both the
 * key and the answer.
 */
export async function areaIdForMaterial(materialId: string): Promise<string | null> {
  const [row] = await db
    .select({ areaId: materials.programmeAreaId })
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);
  return row?.areaId ?? null;
}

export interface ReviewQueueRow {
  materialId: string;
  materialTitle: string;
  versionId: string;
  version: number;
  fieldName: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: Date;
  changeNote: string | null;
  approvals: number;
  rejected: boolean;
}

/**
 * Versions waiting for a decision, limited to the programmeFields the viewer is
 * assigned to. Versions they uploaded are included but flagged by the UI —
 * the two-person rule is enforced again when they press a button.
 */
/**
 * How many versions are waiting for a decision — the sidebar badge. It uses the
 * same predicate as the queue itself, so the number always matches the page.
 */
/**
 * What is waiting for this person: material versions in review, plus the
 * trainings in Trainings that are waiting for a decision.
 *
 * The badge on the Review tab counts both, because both are the same job — a
 * unit head opening the tab expects one queue, not a materials list that quietly
 * omits half the work. Scope is read live (see review-scope.ts), so an
 * appointment that happens today picks up everything filed before it.
 */
export async function countReviewQueue(viewer: Viewer): Promise<number> {
  const scope = await reviewScopeFor(viewer);
  if (!scope.all && scope.empty) return 0;

  const [versions, trainings] = await Promise.all([
    db
      .select({ n: count() })
      .from(materialVersions)
      .innerJoin(materials, eq(materials.id, materialVersions.materialId))
      .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
      .where(
        and(
          eq(materialVersions.state, "IN_REVIEW"),
          reviewsInScope(scope, { field: programmeAreas.fieldId, area: materials.programmeAreaId }),
        ),
      ),
    db
      .select({ n: count() })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.reviewState, "PENDING"),
          eq(trainingSessions.isArchived, false),
          reviewsInScope(scope, {
            field: trainingSessions.programmeFieldId,
            area: trainingSessions.programmeAreaId,
          }),
        ),
      ),
  ]);
  return (versions[0]?.n ?? 0) + (trainings[0]?.n ?? 0);
}

export interface PendingTrainingRow {
  id: string;
  title: string;
  fieldName: string | null;
  areaName: string | null;
  organisedOn: string;
  authorName: string;
  submittedAt: Date;
}

/**
 * Trainings waiting for this person's decision.
 *
 * No `reviewer_id`, no assignment table, no date window: the rule is "waiting,
 * and in a field or area I hold". A training filed two years before the unit
 * head was appointed appears here on their first visit, which is the behaviour
 * the trainings list used to lose.
 */
export async function listPendingTrainings(viewer: Viewer): Promise<PendingTrainingRow[]> {
  const scope = await reviewScopeFor(viewer);
  if (!scope.all && scope.empty) return [];

  return db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      fieldName: programmeFields.name,
      areaName: programmeAreas.name,
      organisedOn: trainingSessions.organisedOn,
      authorName: users.fullName,
      submittedAt: trainingSessions.updatedAt,
    })
    .from(trainingSessions)
    .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .leftJoin(programmeAreas, eq(programmeAreas.id, trainingSessions.programmeAreaId))
    .innerJoin(users, eq(users.id, trainingSessions.createdById))
    .where(
      and(
        eq(trainingSessions.reviewState, "PENDING"),
        eq(trainingSessions.isArchived, false),
        reviewsInScope(scope, {
          field: trainingSessions.programmeFieldId,
          area: trainingSessions.programmeAreaId,
        }),
      ),
    )
    .orderBy(asc(trainingSessions.updatedAt));
}

export async function listReviewQueue(viewer: Viewer): Promise<ReviewQueueRow[]> {
  const approvalTotals = db
    .select({
      materialVersionId: reviewAssignments.materialVersionId,
      approvals: sql<number>`count(*) filter (where ${reviewAssignments.decision} = 'APPROVED')::int`.as("approvals"),
      rejected: sql<boolean>`bool_or(${reviewAssignments.decision} = 'REJECTED')`.as("rejected"),
    })
    .from(reviewAssignments)
    .groupBy(reviewAssignments.materialVersionId)
    .as("review_totals");

  return db
    .select({
      materialId: materials.id,
      materialTitle: materials.title,
      versionId: materialVersions.id,
      version: materialVersions.version,
      fieldName: programmeFields.name,
      uploadedById: materialVersions.uploadedById,
      uploadedByName: users.fullName,
      uploadedAt: materialVersions.createdAt,
      changeNote: materialVersions.changeNote,
      approvals: sql<number>`coalesce(${approvalTotals.approvals}, 0)::int`,
      rejected: sql<boolean>`coalesce(${approvalTotals.rejected}, false)`,
    })
    .from(materialVersions)
    .innerJoin(materials, eq(materials.id, materialVersions.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .innerJoin(users, eq(users.id, materialVersions.uploadedById))
    .leftJoin(approvalTotals, eq(approvalTotals.materialVersionId, materialVersions.id))
    .where(
      and(
        eq(materialVersions.state, "IN_REVIEW"),
        reviewsInScope(await reviewScopeFor(viewer), {
          field: programmeAreas.fieldId,
          area: materials.programmeAreaId,
        }),
      ),
    )
    .orderBy(asc(materialVersions.createdAt));
}
