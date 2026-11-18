import "server-only";
import { asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import {
  districts,
  facilities,
  programmeAreas,
  programmeFields,
  regions,
  subDistricts,
  trainingSessions,
} from "@/db/schema";
import type { DistrictKind, FacilityOwnership, FacilityType } from "@/lib/labels";

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

export interface ProgrammeAreaRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  trainingCount: number;
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
  const [fields, areas, usage] = await Promise.all([
    db
      .select()
      .from(programmeFields)
      .orderBy(asc(programmeFields.sortOrder), asc(programmeFields.name)),
    db
      .select()
      .from(programmeAreas)
      .orderBy(asc(programmeAreas.sortOrder), asc(programmeAreas.name)),
    db
      .select({ areaId: trainingSessions.programmeAreaId, n: sql<number>`count(*)::int` })
      .from(trainingSessions)
      .where(sql`${trainingSessions.programmeAreaId} is not null`)
      .groupBy(trainingSessions.programmeAreaId),
  ]);

  const perArea = new Map(usage.map((row) => [row.areaId, row.n]));

  return fields.map((field) => {
    const fieldAreas = areas
      .filter((area) => area.fieldId === field.id)
      .map((area) => ({
        id: area.id,
        code: area.code,
        name: area.name,
        description: area.description,
        sortOrder: area.sortOrder,
        isArchived: area.isArchived,
        trainingCount: perArea.get(area.id) ?? 0,
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
      trainingCount: fieldAreas.reduce((total, area) => total + area.trainingCount, 0),
    };
  });
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
export async function listProgrammeFieldOptions(): Promise<ProgrammeFieldOption[]> {
  const [fields, areas] = await Promise.all([
    db
      .select({ id: programmeFields.id, code: programmeFields.code, name: programmeFields.name })
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
  const [regionRows, districtRows, subDistrictRows, facilityRows] = await Promise.all([
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
          .map((subDistrict) => ({ id: subDistrict.id, name: subDistrict.name })),
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
  const [fields, areas, regionCount, districtCount, subDistrictCount, facilityCount] = await Promise.all([
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
