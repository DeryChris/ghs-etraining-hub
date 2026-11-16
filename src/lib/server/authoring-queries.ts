import "server-only";
import { and, asc, eq, exists, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { categories, categoryFacilitators, materialVersions, materials, reviewAssignments, spaces, users } from "@/db/schema";
import type { MaterialState, ReviewDecision } from "@/lib/material-workflow";
import type { MaterialType, PriorityLevel } from "@/lib/labels";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/*
 * Authoring surfaces show drafts, so unlike the learner queries these must not
 * filter on state — but they must be scoped. SYSTEM_ADMIN sees every category;
 * a facilitator sees only the categories they are assigned to in
 * category_facilitators (docs/rbac.md §2).
 */
function scopeFor(viewer: Viewer) {
  if (!isStaffRole(viewer.role)) return sql`false`;
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  return exists(
    db
      .select({ one: sql`1` })
      .from(categoryFacilitators)
      .where(and(eq(categoryFacilitators.categoryId, categories.id), eq(categoryFacilitators.userId, viewer.id))),
  );
}

export interface AuthoringMaterialRow {
  id: string;
  title: string;
  state: MaterialState;
  type: MaterialType;
  priority: PriorityLevel;
  categoryId: string;
  categoryName: string;
  spaceTitle: string;
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
      categoryId: categories.id,
      categoryName: categories.name,
      spaceTitle: spaces.title,
      authorName: users.fullName,
      updatedAt: materials.updatedAt,
      currentVersionNumber: sql<number | null>`(${defaultVersion})`,
      versionCount: sql<number>`coalesce((${versionTotal}), 0)::int`,
    })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
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
  requiresAcknowledgement: boolean;
  estimatedMinutes: number | null;
  cpdCreditsX10: number;
  recertificationMonths: number | null;
  spaceId: string;
  spaceTitle: string;
  spaceSlug: string;
  categoryId: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  currentVersionId: string | null;
  versions: AuthoringVersion[];
}

export async function getAuthoringMaterial(materialId: string, viewer: Viewer): Promise<AuthoringMaterialDetail | null> {
  const [row] = await db
    .select({
      material: materials,
      spaceTitle: spaces.title,
      spaceSlug: spaces.slug,
      categoryId: categories.id,
      categoryName: categories.name,
      authorId: users.id,
      authorName: users.fullName,
    })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
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
    requiresAcknowledgement: row.material.requiresAcknowledgement,
    estimatedMinutes: row.material.estimatedMinutes,
    cpdCreditsX10: row.material.cpdCreditsX10,
    recertificationMonths: row.material.recertificationMonths,
    spaceId: row.material.spaceId,
    spaceTitle: row.spaceTitle,
    spaceSlug: row.spaceSlug,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    authorId: row.authorId,
    authorName: row.authorName,
    currentVersionId: row.material.currentVersionId,
    versions,
  };
}

export interface AuthoringSpace {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
}

/** Spaces a staff member may author into. */
export async function listAuthoringSpaces(viewer: Viewer): Promise<AuthoringSpace[]> {
  return db
    .select({
      id: spaces.id,
      title: spaces.title,
      categoryId: categories.id,
      categoryName: categories.name,
    })
    .from(spaces)
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .where(and(eq(spaces.isArchived, false), eq(categories.isArchived, false), scopeFor(viewer)))
    .orderBy(asc(categories.name), asc(spaces.title));
}

/** Category of the space a material lives in — the scope key for every authoring action. */
export async function categoryIdForMaterial(materialId: string): Promise<string | null> {
  const [row] = await db
    .select({ categoryId: spaces.categoryId })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .where(eq(materials.id, materialId))
    .limit(1);
  return row?.categoryId ?? null;
}

export async function categoryIdForSpace(spaceId: string): Promise<string | null> {
  const [row] = await db.select({ categoryId: spaces.categoryId }).from(spaces).where(eq(spaces.id, spaceId)).limit(1);
  return row?.categoryId ?? null;
}

export interface ReviewQueueRow {
  materialId: string;
  materialTitle: string;
  versionId: string;
  version: number;
  categoryName: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: Date;
  changeNote: string | null;
  approvals: number;
  rejected: boolean;
}

/**
 * Versions waiting for a decision, limited to the categories the viewer is
 * assigned to. Versions they uploaded are included but flagged by the UI —
 * the two-person rule is enforced again when they press a button.
 */
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
      categoryName: categories.name,
      uploadedById: materialVersions.uploadedById,
      uploadedByName: users.fullName,
      uploadedAt: materialVersions.createdAt,
      changeNote: materialVersions.changeNote,
      approvals: sql<number>`coalesce(${approvalTotals.approvals}, 0)::int`,
      rejected: sql<boolean>`coalesce(${approvalTotals.rejected}, false)`,
    })
    .from(materialVersions)
    .innerJoin(materials, eq(materials.id, materialVersions.materialId))
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .innerJoin(users, eq(users.id, materialVersions.uploadedById))
    .leftJoin(approvalTotals, eq(approvalTotals.materialVersionId, materialVersions.id))
    .where(and(eq(materialVersions.state, "IN_REVIEW"), scopeFor(viewer)))
    .orderBy(asc(materialVersions.createdAt));
}
