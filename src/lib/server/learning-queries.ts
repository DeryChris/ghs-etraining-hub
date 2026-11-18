import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { programmeFields, certificates, materialProgress, materialVersions, materials, programmeAreas, users } from "@/db/schema";
import { PRIORITY_RANK, type MaterialType, type PriorityLevel, type ProgressStatus } from "@/lib/labels";
import { log } from "@/lib/server/logger";
import { audienceFor, fieldFor, liveField, liveArea, publishedMaterial } from "@/lib/server/visibility";
import type { Viewer } from "@/lib/viewer";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/* ── Fields & areas ────────────────────────────────────────────────────── */

export interface FieldCard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  areaCount: number;
  materialCount: number;
}

export async function listFields(viewer: Viewer | null): Promise<FieldCard[]> {
  const areaTotal = db
    .select({ n: count() })
    .from(programmeAreas)
    .where(and(eq(programmeAreas.fieldId, programmeFields.id), liveArea, audienceFor(viewer)));

  const materialTotal = db
    .select({ n: count() })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .where(and(eq(programmeAreas.fieldId, programmeFields.id), liveArea, publishedMaterial, audienceFor(viewer)));

  return db
    .select({
      id: programmeFields.id,
      code: programmeFields.code,
      name: programmeFields.name,
      description: programmeFields.description,
      areaCount: sql<number>`coalesce((${areaTotal}), 0)::int`,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
    })
    .from(programmeFields)
    .where(and(liveField, fieldFor(viewer)))
    .orderBy(asc(programmeFields.name));
}

/**
 * The public field list, cached for five minutes. Signed-in pages use the
 * uncached listFields() so a facilitator's publish is visible immediately.
 */
export const listPublicFields = unstable_cache(
  async (): Promise<FieldCard[]> => {
    try {
      return await listFields(null);
    } catch (error) {
      // The public programme list must not take the whole marketing page down.
      log.error({ event: "public_fields.unavailable", error });
      return [];
    }
  },
  ["public-fields"],
  { revalidate: 300, tags: ["taxonomy"] },
);

export async function getField(id: string, viewer: Viewer | null) {
  const [row] = await db
    .select()
    .from(programmeFields)
    .where(and(eq(programmeFields.id, id), liveField, fieldFor(viewer)))
    .limit(1);
  return row ?? null;
}

/** A field by its stable code (`PF-PH`), which is what the catalogue URLs use. */
export async function getFieldByCode(code: string, viewer: Viewer | null) {
  const [row] = await db
    .select()
    .from(programmeFields)
    .where(and(eq(programmeFields.code, code.toUpperCase()), liveField, fieldFor(viewer)))
    .limit(1);
  return row ?? null;
}

export interface AreaCard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  materialCount: number;
  completedCount: number;
}

export async function listAreasInField(fieldId: string, viewer: Viewer): Promise<AreaCard[]> {
  const materialTotal = db
    .select({ n: count() })
    .from(materials)
    .where(and(eq(materials.programmeAreaId, programmeAreas.id), publishedMaterial));

  const completedTotal = db
    .select({ n: count() })
    .from(materialProgress)
    .innerJoin(materials, eq(materials.id, materialProgress.materialId))
    .where(
      and(
        eq(materials.programmeAreaId, programmeAreas.id),
        eq(materialProgress.userId, viewer.id),
        eq(materialProgress.status, "COMPLETED"),
        publishedMaterial,
      ),
    );

  return db
    .select({
      id: programmeAreas.id,
      code: programmeAreas.code,
      name: programmeAreas.name,
      description: programmeAreas.description,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
      completedCount: sql<number>`coalesce((${completedTotal}), 0)::int`,
    })
    .from(programmeAreas)
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        eq(programmeAreas.fieldId, fieldId),
        liveArea,
        liveField,
        fieldFor(viewer),
        audienceFor(viewer),
      ),
    )
    .orderBy(asc(programmeAreas.name));
}

export async function getAreaByCode(code: string, viewer: Viewer | null) {
  const [row] = await db
    .select({ area: programmeAreas, field: programmeFields })
    .from(programmeAreas)
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        eq(programmeAreas.code, code.toUpperCase()),
        liveArea,
        liveField,
        fieldFor(viewer),
        audienceFor(viewer),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ── Materials ─────────────────────────────────────────────────────────── */

export interface MaterialListItem {
  id: string;
  title: string;
  summary: string | null;
  type: MaterialType;
  priority: PriorityLevel;
  requiresAcknowledgement: boolean;
  estimatedMinutes: number | null;
  cpdCreditsX10: number;
  authorName: string;
  status: ProgressStatus;
  watchedPercent: number;
  acknowledgedAt: Date | null;
}

export async function listMaterialsInArea(programmeAreaId: string, viewer: Viewer): Promise<MaterialListItem[]> {
  return db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      requiresAcknowledgement: materials.requiresAcknowledgement,
      estimatedMinutes: materials.estimatedMinutes,
      cpdCreditsX10: materials.cpdCreditsX10,
      authorName: users.fullName,
      status: sql<ProgressStatus>`coalesce(${materialProgress.status}, 'NOT_STARTED')`,
      watchedPercent: sql<number>`coalesce(${materialProgress.watchedPercent}, 0)`,
      acknowledgedAt: materialProgress.acknowledgedAt,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, viewer.id)))
    .where(
      and(
        eq(materials.programmeAreaId, programmeAreaId),
        publishedMaterial,
        liveArea,
        liveField,
        fieldFor(viewer),
        audienceFor(viewer),
      ),
    )
    .orderBy(asc(materials.title));
}

export interface LibraryItem extends MaterialListItem {
  areaCode: string;
  areaName: string;
  fieldName: string;
}

export const LIBRARY_PAGE_SIZE = 24;

export interface LibraryPage {
  items: LibraryItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

function libraryFilters(input: { query: string; type: MaterialType | null; viewer: Viewer }) {
  const term = input.query.trim().slice(0, 120);
  const pattern = `%${escapeLike(term)}%`;
  return and(
    publishedMaterial,
    liveArea,
    liveField,
    fieldFor(input.viewer),
    audienceFor(input.viewer),
    input.type ? eq(materials.type, input.type) : undefined,
    term ? or(ilike(materials.title, pattern), ilike(materials.summary, pattern)) : undefined,
  );
}

/**
 * One page of results (24 cards) plus the total, so the UI shows "1–24 of 87"
 * and a next link rather than 120 cards in one document. Pagination is part of
 * the bandwidth contract (AGENTS.md §2.6).
 */
export async function searchLibrary(input: {
  query: string;
  type: MaterialType | null;
  viewer: Viewer;
  page?: number;
}): Promise<LibraryPage> {
  const where = libraryFilters(input);

  const [countRow] = await db
    .select({ n: count() })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(where);

  const total = countRow?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(input.page ?? 1)), pageCount);

  const rows = await db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      requiresAcknowledgement: materials.requiresAcknowledgement,
      estimatedMinutes: materials.estimatedMinutes,
      cpdCreditsX10: materials.cpdCreditsX10,
      authorName: users.fullName,
      status: sql<ProgressStatus>`coalesce(${materialProgress.status}, 'NOT_STARTED')`,
      watchedPercent: sql<number>`coalesce(${materialProgress.watchedPercent}, 0)`,
      acknowledgedAt: materialProgress.acknowledgedAt,
      areaCode: programmeAreas.code,
      areaName: programmeAreas.name,
      fieldName: programmeFields.name,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, input.viewer.id)))
    .where(where)
    .orderBy(asc(materials.title))
    .limit(LIBRARY_PAGE_SIZE)
    .offset((page - 1) * LIBRARY_PAGE_SIZE);

  return { items: rows, total, page, pageCount, pageSize: LIBRARY_PAGE_SIZE };
}

export async function getMaterialDetail(materialId: string, viewer: Viewer) {
  const [row] = await db
    .select({
      material: materials,
      area: programmeAreas,
      field: programmeFields,
      authorName: users.fullName,
      version: materialVersions,
      progress: materialProgress,
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .innerJoin(users, eq(users.id, materials.authorId))
    .leftJoin(materialVersions, eq(materialVersions.id, materials.currentVersionId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, viewer.id)))
    .where(
      and(
        eq(materials.id, materialId),
        publishedMaterial,
        liveArea,
        liveField,
        fieldFor(viewer),
        audienceFor(viewer),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ── Learner dashboard ─────────────────────────────────────────────────── */

export interface MandatoryItem {
  id: string;
  title: string;
  priority: PriorityLevel;
  estimatedMinutes: number | null;
  areaName: string;
  areaCode: string;
  /** Acknowledged earlier, but a newer version was published since. */
  reacknowledgementRequired: boolean;
}

export interface ContinueItem {
  id: string;
  title: string;
  type: MaterialType;
  watchedPercent: number;
  areaName: string;
  areaCode: string;
}

export interface LearnerDashboard {
  creditsX10: number;
  completedCount: number;
  inProgressCount: number;
  mandatoryTotal: number;
  mandatoryOutstanding: MandatoryItem[];
  continueLearning: ContinueItem[];
}

export async function getLearnerDashboard(viewer: Viewer): Promise<LearnerDashboard> {
  const [totalsRows, mandatoryRows, continueRows] = await Promise.all([
    db
      .select({
        creditsX10: sql<number>`coalesce(sum(case when ${materialProgress.status} = 'COMPLETED' then ${materials.cpdCreditsX10} else 0 end), 0)::int`,
        completedCount: sql<number>`(count(*) filter (where ${materialProgress.status} = 'COMPLETED'))::int`,
        inProgressCount: sql<number>`(count(*) filter (where ${materialProgress.status} = 'IN_PROGRESS'))::int`,
      })
      .from(materialProgress)
      .innerJoin(materials, eq(materials.id, materialProgress.materialId))
      .where(eq(materialProgress.userId, viewer.id)),
    db
      .select({
        id: materials.id,
        title: materials.title,
        priority: materials.priority,
        estimatedMinutes: materials.estimatedMinutes,
        currentVersionId: materials.currentVersionId,
        areaName: programmeAreas.name,
        areaCode: programmeAreas.code,
        acknowledgedAt: materialProgress.acknowledgedAt,
        acknowledgedVersionId: materialProgress.materialVersionId,
      })
      .from(materials)
      .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, viewer.id)))
      .where(
        and(
          publishedMaterial,
          liveArea,
          liveField,
          fieldFor(viewer),
          audienceFor(viewer),
          eq(materials.requiresAcknowledgement, true),
        ),
      ),
    db
      .select({
        id: materials.id,
        title: materials.title,
        type: materials.type,
        watchedPercent: materialProgress.watchedPercent,
        areaName: programmeAreas.name,
        areaCode: programmeAreas.code,
      })
      .from(materialProgress)
      .innerJoin(materials, eq(materials.id, materialProgress.materialId))
      .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .where(
        and(
          eq(materialProgress.userId, viewer.id),
          eq(materialProgress.status, "IN_PROGRESS"),
          publishedMaterial,
          liveArea,
          liveField,
          fieldFor(viewer),
          audienceFor(viewer),
        ),
      )
      .orderBy(desc(materialProgress.updatedAt))
      .limit(4),
  ]);

  const totals = totalsRows[0];
  const mandatoryOutstanding = mandatoryRows
    .filter((row) => !(row.acknowledgedAt !== null && row.acknowledgedVersionId === row.currentVersionId))
    .map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      estimatedMinutes: row.estimatedMinutes,
      areaName: row.areaName,
      areaCode: row.areaCode,
      reacknowledgementRequired: row.acknowledgedAt !== null,
    }))
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.title.localeCompare(b.title));

  return {
    creditsX10: totals?.creditsX10 ?? 0,
    completedCount: totals?.completedCount ?? 0,
    inProgressCount: totals?.inProgressCount ?? 0,
    mandatoryTotal: mandatoryRows.length,
    mandatoryOutstanding,
    continueLearning: continueRows,
  };
}

/* ── Personal analytics & transcript ───────────────────────────────────── */

export interface CompletionRecord {
  materialId: string;
  title: string;
  type: MaterialType;
  creditsX10: number;
  completedAt: Date | null;
  areaName: string;
  /** Null when the material earned no CPD points, so nothing was issued. */
  certificateCode: string | null;
}

/*
 * The transcript is a record of what the learner actually completed, so it is not
 * filtered by today's audience rules: revoking a cohort must never erase history.
 */
export async function listCompletions(userId: string, limit = 500): Promise<CompletionRecord[]> {
  return db
    .select({
      materialId: materials.id,
      title: materials.title,
      type: materials.type,
      creditsX10: materials.cpdCreditsX10,
      completedAt: materialProgress.completedAt,
      areaName: programmeAreas.name,
      // The certificate for the version that was actually completed, if one was issued.
      certificateCode: certificates.code,
    })
    .from(materialProgress)
    .innerJoin(materials, eq(materials.id, materialProgress.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .leftJoin(
      certificates,
      and(
        eq(certificates.userId, materialProgress.userId),
        eq(certificates.materialVersionId, materialProgress.materialVersionId),
      ),
    )
    .where(and(eq(materialProgress.userId, userId), eq(materialProgress.status, "COMPLETED")))
    .orderBy(desc(materialProgress.completedAt))
    .limit(limit);
}

/* ── Printable award ────────────────────────────────────────────────────── */

export interface CertificateAward {
  id: string;
  code: string;
  userId: string;
  holderName: string;
  staffId: string;
  title: string;
  areaName: string;
  fieldName: string;
  creditsX10: number;
  issuedAt: Date;
  expiresAt: Date | null;
  /** Decided here so the page stays a pure render. */
  expired: boolean;
}

/**
 * Loads a certificate for the printable award. The caller decides who may print
 * it: the holder, or staff supporting them. The public `/verify` page keeps using
 * the masked name — printing a full name needs a session.
 */
export async function getCertificateAward(code: string): Promise<CertificateAward | null> {
  const [row] = await db
    .select({
      id: certificates.id,
      code: certificates.code,
      userId: certificates.userId,
      holderName: users.fullName,
      staffId: users.ghsStaffId,
      title: materials.title,
      areaName: programmeAreas.name,
      fieldName: programmeFields.name,
      creditsX10: certificates.cpdCreditsX10,
      issuedAt: certificates.issuedAt,
      expiresAt: certificates.expiresAt,
    })
    .from(certificates)
    .innerJoin(users, eq(users.id, certificates.userId))
    .innerJoin(materials, eq(materials.id, certificates.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(eq(certificates.code, code))
    .limit(1);

  if (!row) return null;
  return { ...row, expired: row.expiresAt !== null && row.expiresAt.getTime() < Date.now() };
}
