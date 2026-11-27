import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import {
  programmeFields,
  materialVersions,
  materialViews,
  materials,
  programmeAreas,
  trainingSessions,
  users,
} from "@/db/schema";
import type { MaterialType, PriorityLevel } from "@/lib/labels";
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
  trainingCount: number;
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

  const trainingTotal = db
    .select({ n: count() })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.programmeFieldId, programmeFields.id),
        eq(trainingSessions.reviewState, "PUBLISHED"),
        eq(trainingSessions.isArchived, false),
      ),
    );

  return db
    .select({
      id: programmeFields.id,
      code: programmeFields.code,
      name: programmeFields.name,
      description: programmeFields.description,
      areaCount: sql<number>`coalesce((${areaTotal}), 0)::int`,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
      trainingCount: sql<number>`coalesce((${trainingTotal}), 0)::int`,
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

/** A field by its stable code (`PF-PH`), which is what the library URLs use. */
export async function getFieldByCode(code: string, viewer: Viewer | null) {
  /*
   * Case-insensitive on purpose. The library builds its links from the stored
   * code, but this used to upper-case the incoming one before comparing — so a
   * field whose code happened to contain lower case (an import, a code with a
   * hex suffix) was listed in the library and 404'd when opened.
   */
  const [row] = await db
    .select()
    .from(programmeFields)
    .where(and(sql`lower(${programmeFields.code}) = lower(${code})`, liveField, fieldFor(viewer)))
    .limit(1);
  return row ?? null;
}

export interface AreaCard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  materialCount: number;
  /** How many trainings are filed under this area — the area page's own count. */
  trainingCount: number;
}

export async function listAreasInField(fieldId: string, viewer: Viewer): Promise<AreaCard[]> {
  const materialTotal = db
    .select({ n: count() })
    .from(materials)
    .where(and(eq(materials.programmeAreaId, programmeAreas.id), publishedMaterial));

  const trainingTotal = db
    .select({ n: count() })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.programmeAreaId, programmeAreas.id), eq(trainingSessions.reviewState, "PUBLISHED")));

  return db
    .select({
      id: programmeAreas.id,
      code: programmeAreas.code,
      name: programmeAreas.name,
      description: programmeAreas.description,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
      trainingCount: sql<number>`coalesce((${trainingTotal}), 0)::int`,
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
        sql`lower(${programmeAreas.code}) = lower(${code})`,
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
  estimatedMinutes: number | null;
  authorName: string;
}

export async function listMaterialsInArea(programmeAreaId: string, viewer: Viewer): Promise<MaterialListItem[]> {
  return db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      estimatedMinutes: materials.estimatedMinutes,
      authorName: users.fullName,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
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
      estimatedMinutes: materials.estimatedMinutes,
      authorName: users.fullName,
      areaCode: programmeAreas.code,
      areaName: programmeAreas.name,
      fieldName: programmeFields.name,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
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
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .innerJoin(users, eq(users.id, materials.authorId))
    .leftJoin(materialVersions, eq(materialVersions.id, materials.currentVersionId))
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

/* ── Personal activity ─────────────────────────────────────────────────── */

/** A material this person opened, most recent first. Activity, nothing more. */
export interface RecentOpen {
  id: string;
  title: string;
  type: MaterialType;
  areaName: string;
  areaCode: string;
  lastViewedAt: Date;
}

/**
 * What this person has opened, newest first.
 *
 * This is the activity record the library keeps for statistics: which material,
 * when it was last opened, how many times. It says where somebody has been, and
 * nothing more.
 */
export async function listRecentOpens(userId: string, limit = 20): Promise<RecentOpen[]> {
  const rows = await db
    .select({
      id: materials.id,
      title: materials.title,
      type: materials.type,
      areaName: programmeAreas.name,
      areaCode: programmeAreas.code,
      lastViewedAt: sql<Date>`max(${materialViews.lastViewedAt})`,
    })
    .from(materialViews)
    .innerJoin(materials, eq(materials.id, materialViews.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .where(eq(materialViews.userId, userId))
    .groupBy(materials.id, materials.title, materials.type, programmeAreas.name, programmeAreas.code)
    .orderBy(desc(sql`max(${materialViews.lastViewedAt})`))
    .limit(limit);
  return rows.map((row) => ({ ...row, lastViewedAt: new Date(row.lastViewedAt) }));
}
