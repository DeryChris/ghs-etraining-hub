import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import {
  areaFacilitators,
  districts,
  facilities,
  materials,
  programmeAreas,
  programmeFields,
  regions,
  subDistricts,
  trainingSessions,
  users,
} from "@/db/schema";
import type {
  DistrictKind,
  FacilityOwnership,
  FacilityType,
} from "@/lib/labels";

/*
 * Reference data for the two administration surfaces and for every picker that
 * depends on them: the programme taxonomy (field → area) and the geography
 * (region → district → sub-district → facility).
 *
 * Both are read whole. They are small — ten fields, sixteen regions — and the
 * pickers need the entire chain anyway to filter a select without a round trip,
 * so a page costs one query per table instead of one per box.
 */

/* ── Programme taxonomy ─────────────────────────────────────────────────── */

export interface AreaFacilitator {
  id: string;
  fullName: string;
  staffId: string;
}

export interface ProgrammeAreaRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: {
    region: string | null;
    directorate: string | null;
    cadre: string | null;
  };
  sortOrder: number;
  isArchived: boolean;
  trainingCount: number;
  materialCount: number;
  facilitators: AreaFacilitator[];
}

export interface ProgrammeFieldRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  areas: ProgrammeAreaRow[];
  areaCount: number;
  trainingCount: number;
}

export async function listProgrammeTaxonomy(): Promise<ProgrammeFieldRow[]> {
  const [fields, areas, usage, assignments, materialCounts] = await Promise.all(
    [
      db
        .select()
        .from(programmeFields)
        .orderBy(asc(programmeFields.sortOrder), asc(programmeFields.name)),
      db
        .select()
        .from(programmeAreas)
        .orderBy(asc(programmeAreas.sortOrder), asc(programmeAreas.name)),
      db
        .select({
          areaId: trainingSessions.programmeAreaId,
          n: sql<number>`count(*)::int`,
        })
        .from(trainingSessions)
        .where(sql`${trainingSessions.programmeAreaId} is not null`)
        .groupBy(trainingSessions.programmeAreaId),
      db
        .select({
          id: areaFacilitators.id,
          areaId: areaFacilitators.areaId,
          fullName: users.fullName,
          staffId: users.ghsStaffId,
        })
        .from(areaFacilitators)
        .innerJoin(users, eq(users.id, areaFacilitators.userId))
        .orderBy(asc(users.fullName)),
      db
        .select({
          areaId: materials.programmeAreaId,
          n: sql<number>`count(*)::int`,
        })
        .from(materials)
        .groupBy(materials.programmeAreaId),
    ],
  );

  const perArea = new Map(usage.map((row) => [row.areaId, row.n]));
  const perAreaMaterials = new Map(
    materialCounts.map((row) => [row.areaId, row.n]),
  );
  const facilitatorsByArea = new Map<string, AreaFacilitator[]>();
  for (const assignment of assignments) {
    const list = facilitatorsByArea.get(assignment.areaId) ?? [];
    list.push({
      id: assignment.id,
      fullName: assignment.fullName,
      staffId: assignment.staffId,
    });
    facilitatorsByArea.set(assignment.areaId, list);
  }

  return fields.map((field) => {
    const fieldAreas = areas
      .filter((area) => area.fieldId === field.id)
      .map((area) => ({
        id: area.id,
        code: area.code,
        name: area.name,
        description: area.description,
        audience: {
          region: area.audienceRegion,
          directorate: area.audienceDirectorate,
          cadre: area.audienceCadre,
        },
        sortOrder: area.sortOrder,
        isArchived: area.isArchived,
        trainingCount: perArea.get(area.id) ?? 0,
        materialCount: perAreaMaterials.get(area.id) ?? 0,
        facilitators: facilitatorsByArea.get(area.id) ?? [],
      }));
    return {
      id: field.id,
      code: field.code,
      name: field.name,
      description: field.description,
      sortOrder: field.sortOrder,
      isArchived: field.isArchived,
      areas: fieldAreas,
      areaCount: fieldAreas.length,
      trainingCount: fieldAreas.reduce(
        (total, area) => total + area.trainingCount,
        0,
      ),
    };
  });
}

/** The people a programme area can be assigned to: active facilitators and admins. */
export async function listAssignableFacilitators(): Promise<
  { id: string; fullName: string; staffId: string }[]
> {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      staffId: users.ghsStaffId,
    })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        inArray(users.role, ["FACILITATOR", "SYSTEM_ADMIN"]),
      ),
    )
    .orderBy(asc(users.fullName));
}

export interface ProgrammeAreaOption {
  id: string;
  code: string;
  name: string;
}

export interface ProgrammeFieldOption {
  id: string;
  code: string;
  name: string;
  areas: ProgrammeAreaOption[];
}

/** Non-archived fields with their non-archived areas, for the training form. */
async function loadProgrammeFieldOptions(): Promise<ProgrammeFieldOption[]> {
  const [fields, areas] = await Promise.all([
    db
      .select({
        id: programmeFields.id,
        code: programmeFields.code,
        name: programmeFields.name,
      })
      .from(programmeFields)
      .where(eq(programmeFields.isArchived, false))
      .orderBy(asc(programmeFields.sortOrder), asc(programmeFields.name)),
    db
      .select({
        id: programmeAreas.id,
        code: programmeAreas.code,
        name: programmeAreas.name,
        fieldId: programmeAreas.fieldId,
      })
      .from(programmeAreas)
      .where(eq(programmeAreas.isArchived, false))
      .orderBy(asc(programmeAreas.sortOrder), asc(programmeAreas.name)),
  ]);

  return fields.map((field) => ({
    ...field,
    areas: areas
      .filter((area) => area.fieldId === field.id)
      .map((area) => ({ id: area.id, code: area.code, name: area.name })),
  }));
}

/**
 * Same reasoning as the register's filter options: fields and areas are
 * reference data nobody edits between two clicks, and the cache keeps them off
 * the pool for half a minute.
 */
export const listProgrammeFieldOptions = unstable_cache(loadProgrammeFieldOptions, ["programme-field-options"], {
  revalidate: 30,
  tags: ["taxonomy"],
});

/* ── Geography ──────────────────────────────────────────────────────────── */

export interface GeographyFacility {
  id: string;
  name: string;
  type: FacilityType;
  ownership: FacilityOwnership;
  isActive: boolean;
  subDistrictId: string | null;
}

export interface GeographySubDistrict {
  id: string;
  name: string;
}

export interface GeographyDistrict {
  id: string;
  name: string;
  kind: DistrictKind;
  capital: string | null;
  subDistricts: GeographySubDistrict[];
  facilities: GeographyFacility[];
}

export interface GeographyRegion {
  id: string;
  code: string;
  name: string;
  districts: GeographyDistrict[];
}

/**
 * The whole reference geography, ordered for display. Regions with no districts
 * are included: the administration page exists to fill those in, and a learner
 * never sees this tree.
 */
export async function listGeography(): Promise<GeographyRegion[]> {
  const [regionRows, districtRows, subDistrictRows, facilityRows] =
    await Promise.all([
      db.select().from(regions).orderBy(asc(regions.name)),
      db.select().from(districts).orderBy(asc(districts.name)),
      db.select().from(subDistricts).orderBy(asc(subDistricts.name)),
      db.select().from(facilities).orderBy(asc(facilities.name)),
    ]);

  return regionRows.map((region) => ({
    id: region.id,
    code: region.code,
    name: region.name,
    districts: districtRows
      .filter((district) => district.regionId === region.id)
      .map((district) => ({
        id: district.id,
        name: district.name,
        kind: district.kind,
        capital: district.capital,
        subDistricts: subDistrictRows
          .filter((subDistrict) => subDistrict.districtId === district.id)
          .map((subDistrict) => ({
            id: subDistrict.id,
            name: subDistrict.name,
          })),
        facilities: facilityRows
          .filter((facility) => facility.districtId === district.id)
          .map((facility) => ({
            id: facility.id,
            name: facility.name,
            type: facility.type,
            ownership: facility.ownership,
            isActive: facility.isActive,
            subDistrictId: facility.subDistrictId,
          })),
      })),
  }));
}

export interface TaxonomyTotals {
  fields: number;
  areas: number;
  regions: number;
  districts: number;
  subDistricts: number;
  facilities: number;
}

/** One row of counters for the two administration pages. */
export async function getReferenceTotals(): Promise<TaxonomyTotals> {
  const [
    fields,
    areas,
    regionCount,
    districtCount,
    subDistrictCount,
    facilityCount,
  ] = await Promise.all([
    db.select({ n: count() }).from(programmeFields),
    db.select({ n: count() }).from(programmeAreas),
    db.select({ n: count() }).from(regions),
    db.select({ n: count() }).from(districts),
    db.select({ n: count() }).from(subDistricts),
    db.select({ n: count() }).from(facilities),
  ]);

  return {
    fields: fields[0]?.n ?? 0,
    areas: areas[0]?.n ?? 0,
    regions: regionCount[0]?.n ?? 0,
    districts: districtCount[0]?.n ?? 0,
    subDistricts: subDistrictCount[0]?.n ?? 0,
    facilities: facilityCount[0]?.n ?? 0,
  };
}
