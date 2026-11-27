import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { materials, materialVersions, programmeAreas, programmeFields } from "@/db/schema";
import { log } from "@/lib/server/logger";
import {
  getFieldByCode,
  getAreaByCode,
  listAreasInField,
  listFields,
  type AreaCard,
  type FieldCard,
} from "@/lib/server/learning-queries";
import { audienceFor, fieldFor, liveArea, liveField, publishedMaterial } from "@/lib/server/visibility";
import type { MaterialType, PriorityLevel } from "@/lib/labels";

/**
 * Public browse queries for the signed-out programme pages.
 *
 * Every helper is cached and soft-fails: a marketing page must render its empty
 * or error state rather than a stack trace when the database is unreachable.
 * The convention for the three-state result:
 *
 *   T        — the record or list loaded (a list may be empty).
 *   null     — the database answered: there is no such record.
 *   undefined — the database did not answer; the page shows its error state.
 */

/** T = loaded; null = the database answered "no such record"; undefined = unavailable. */
export type BrowseRecord<T> = T | null | undefined;
/** Lists are never null: an empty list is a real answer. */
export type BrowseList<T> = T[] | undefined;

function unavailable(event: string, error: unknown): undefined {
  log.error({ event, error });
  return undefined;
}

/* ── Programme Areas (the parent taxonomy node) ──────────────────────────── */

const cachedAreaByCode = unstable_cache(
  async (code: string) => getFieldByCode(code, null),
  ["public-area-by-code"],
  { revalidate: 300, tags: ["taxonomy"] },
);

type AreaRow = Awaited<ReturnType<typeof getFieldByCode>>;

export async function getPublicAreaByCode(code: string): Promise<BrowseRecord<AreaRow>> {
  try {
    return await cachedAreaByCode(code);
  } catch (error) {
    return unavailable("public_area.unavailable", error);
  }
}

const cachedAreaList = unstable_cache(
  async () => listFields(null),
  ["public-area-list"],
  { revalidate: 300, tags: ["taxonomy"] },
);

export async function listPublicAreas(): Promise<BrowseList<FieldCard>> {
  try {
    return await cachedAreaList();
  } catch (error) {
    return unavailable("public_areas.unavailable", error);
  }
}

/* ── Programme Fields (the child taxonomy node) ──────────────────────────── */

const cachedFieldsInArea = unstable_cache(
  async (fieldId: string) => listAreasInField(fieldId, null),
  ["public-fields-in-area"],
  { revalidate: 300, tags: ["taxonomy"] },
);

export async function listPublicFieldsInArea(fieldId: string): Promise<BrowseList<AreaCard>> {
  try {
    return await cachedFieldsInArea(fieldId);
  } catch (error) {
    return unavailable("public_fields.unavailable", error);
  }
}

const cachedFieldByCode = unstable_cache(
  async (code: string) => getAreaByCode(code, null),
  ["public-field-by-code"],
  { revalidate: 300, tags: ["taxonomy"] },
);

type FieldRow = Awaited<ReturnType<typeof getAreaByCode>>;

/** A Programme Field with its parent Programme Area, or null when the code is wrong. */
export async function getPublicFieldByCode(code: string): Promise<BrowseRecord<FieldRow>> {
  try {
    return await cachedFieldByCode(code);
  } catch (error) {
    return unavailable("public_field.unavailable", error);
  }
}

/* ── Training materials under one Programme Field ────────────────────────── */

export interface PublicMaterialCard {
  id: string;
  title: string;
  summary: string | null;
  type: MaterialType;
  priority: PriorityLevel;
  estimatedMinutes: number | null;
  /** The approved version number, when a version record exists. */
  version: number | null;
  /** When the current version was published — the "Date Uploaded / Updated". */
  updatedAt: Date | null;
}

/**
 * Published, visible training materials for one Programme Field, newest first.
 * Unpublished, withdrawn and archived versions are excluded by the same
 * predicates the signed-in library uses, so a public card can never present an
 * unapproved document as approved.
 */
async function queryPublicMaterials(programmeAreaId: string): Promise<PublicMaterialCard[]> {
  const rows = await db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      estimatedMinutes: materials.estimatedMinutes,
      version: materialVersions.version,
      updatedAt: materialVersions.publishedAt,
    })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        eq(materials.programmeAreaId, programmeAreaId),
        publishedMaterial,
        liveArea,
        liveField,
        fieldFor(null),
        audienceFor(null),
      ),
    )
    .leftJoin(materialVersions, eq(materialVersions.id, materials.currentVersionId))
    .orderBy(desc(materials.updatedAt), asc(materials.title));
  return rows;
}

const cachedMaterials = unstable_cache(
  async (programmeAreaId: string) => queryPublicMaterials(programmeAreaId),
  ["public-materials-in-field"],
  { revalidate: 300, tags: ["taxonomy"] },
);

export async function listPublicMaterialsInField(programmeAreaId: string): Promise<BrowseList<PublicMaterialCard>> {
  try {
    return await cachedMaterials(programmeAreaId);
  } catch (error) {
    return unavailable("public_materials.unavailable", error);
  }
}
