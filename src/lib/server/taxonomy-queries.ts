import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
 * Reference data for the administration surfaces and pickers. The stored
 * programme taxonomy is `programme_fields` → `programme_areas`, which maps to
 * the user-facing hierarchy Programme Areas → Programme Fields. Geography is
 * region → district → sub-district → facility.
 *
 * The programme taxonomy and the reference geography are small enough to read
 * together; pickers need the full chain to filter a select without another
 * round trip, so a page costs one query per table instead of one per box.
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
    grade: string | null;
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

const loadProgrammeTaxonomy = async (): Promise<ProgrammeFieldRow[]> => {
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
          grade: area.audienceGrade,
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
};

export const listProgrammeTaxonomy = unstable_cache(
  loadProgrammeTaxonomy,
  ["programme-taxonomy"],
  { revalidate: 30, tags: ["taxonomy"] },
);

/** The people a programme field can be assigned to: active facilitators and admins. */
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
 * Same reasoning as the filters on Trainings: fields and areas are
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
async function loadGeography(): Promise<GeographyRegion[]> {
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

export const listGeography = unstable_cache(loadGeography, ["geography-tree"], {
  revalidate: 30,
  tags: ["geography"],
});

/**
 * The same tree, cut down to one district.
 *
 * A district officer's page is their district and nothing above or beside it:
 * one region, one district, its sub-districts and its facilities. Filtering the
 * cached national tree costs nothing extra, and keeping one loader means the
 * shape the page renders cannot drift between the two callers. A session with no
 * district gets an empty tree, which the page says out loud.
 */
export async function listGeographyForDistrict(districtId: string | null): Promise<GeographyRegion[]> {
  if (!districtId) return [];
  const all = await listGeography();
  return all
    .map((region) => ({ ...region, districts: region.districts.filter((district) => district.id === districtId) }))
    .filter((region) => region.districts.length > 0);
}

/**
 * One row of counters for the two administration pages.
 *
 * One statement, not six. Each count used to be its own round trip to Paris, and
 * on a two-connection pool six of them arriving together means three waves of
 * waiting for numbers that Postgres can produce in a single pass.
 */
async function loadReferenceTotals(): Promise<TaxonomyTotals> {
  const rows = await db.execute<Record<keyof TaxonomyTotals, number>>(sql`
    select
      (select count(*)::int from programme_fields) as "fields",
      (select count(*)::int from programme_areas) as "areas",
      (select count(*)::int from regions) as "regions",
      (select count(*)::int from districts) as "districts",
      (select count(*)::int from sub_districts) as "subDistricts",
      (select count(*)::int from facilities) as "facilities"
  `);
  const row = rows[0];
  return {
    fields: row?.fields ?? 0,
    areas: row?.areas ?? 0,
    regions: row?.regions ?? 0,
    districts: row?.districts ?? 0,
    subDistricts: row?.subDistricts ?? 0,
    facilities: row?.facilities ?? 0,
  };
}

/**
 * Counters and the geography tree are reference data — edited by an
 * administrator now and then, read by every visit to two tabs. Thirty seconds of
 * cache (cleared by `revalidateTag` on every geography or taxonomy write) keeps
 * them off the pool entirely for people moving between tabs.
 */
export const getReferenceTotals = unstable_cache(loadReferenceTotals, ["reference-totals"], {
  revalidate: 30,
  tags: ["geography", "taxonomy"],
});
