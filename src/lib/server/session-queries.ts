import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { alias } from "drizzle-orm/pg-core";
import { categories, districts, facilities, regions, spaces, subDistricts, trainingSessions, users } from "@/db/schema";
import type { FacilityType } from "@/lib/labels";
import { scopeFor } from "@/lib/server/scope";
import type { Viewer } from "@/lib/viewer";

/*
 * Training sessions: the trainings that actually happened. Facilitation scope is
 * the same predicate as authoring — a facilitator records sessions for the
 * programmes they are assigned to, an administrator for any of them.
 */

export interface SessionRow {
  id: string;
  title: string;
  organisedOn: string;
  categoryId: string | null;
  categoryName: string | null;
  spaceTitle: string | null;
  regionName: string | null;
  districtName: string | null;
  subDistrictName: string | null;
  facilityName: string | null;
  facilitatorName: string | null;
  attendeeCount: number | null;
  createdByName: string;
}

const facilitator = alias(users, "session_facilitator");
const creator = alias(users, "session_creator");

export async function listSessions(viewer: Viewer, limit = 40): Promise<SessionRow[]> {
  return db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      organisedOn: trainingSessions.organisedOn,
      categoryId: trainingSessions.categoryId,
      categoryName: categories.name,
      spaceTitle: spaces.title,
      regionName: regions.name,
      districtName: districts.name,
      subDistrictName: subDistricts.name,
      facilityName: facilities.name,
      facilitatorName: sql<string | null>`coalesce(${trainingSessions.facilitatorName}, ${facilitator.fullName})`,
      attendeeCount: trainingSessions.attendeeCount,
      createdByName: creator.fullName,
    })
    .from(trainingSessions)
    // LEFT: a training filed through the register (field → area) has no category,
    // and it still belongs in the record of what ran.
    .leftJoin(categories, eq(categories.id, trainingSessions.categoryId))
    .leftJoin(spaces, eq(spaces.id, trainingSessions.spaceId))
    .leftJoin(regions, eq(regions.id, trainingSessions.regionId))
    .leftJoin(districts, eq(districts.id, trainingSessions.districtId))
    .leftJoin(subDistricts, eq(subDistricts.id, trainingSessions.subDistrictId))
    .leftJoin(facilities, eq(facilities.id, trainingSessions.facilityId))
    .leftJoin(facilitator, eq(facilitator.id, trainingSessions.facilitatorId))
    .innerJoin(creator, eq(creator.id, trainingSessions.createdById))
    .where(and(scopeFor(viewer), eq(trainingSessions.isArchived, false)))
    .orderBy(desc(trainingSessions.organisedOn), asc(categories.name))
    .limit(limit);
}

export interface SessionSummary {
  total: number;
  last90Days: number;
  attendees: number;
  programmes: number;
}

export async function getSessionSummary(viewer: Viewer): Promise<SessionSummary> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last90Days: sql<number>`count(*) filter (where ${trainingSessions.organisedOn} >= ${since})::int`,
      attendees: sql<number>`coalesce(sum(${trainingSessions.attendeeCount}), 0)::int`,
      programmes: sql<number>`count(distinct ${trainingSessions.categoryId})::int`,
    })
    .from(trainingSessions)
    .leftJoin(categories, eq(categories.id, trainingSessions.categoryId))
    .where(and(scopeFor(viewer), eq(trainingSessions.isArchived, false)));
  return row ?? { total: 0, last90Days: 0, attendees: 0, programmes: 0 };
}

export interface FacilityOption {
  id: string;
  name: string;
  districtName: string;
  type: FacilityType;
}

export interface DistrictOption {
  id: string;
  name: string;
  regionName: string;
  facilities: FacilityOption[];
}

/** Districts and their facilities, for the session form. Pilot region only. */
export async function listSessionGeography(): Promise<DistrictOption[]> {
  const rows = await db
    .select({
      districtId: districts.id,
      districtName: districts.name,
      regionName: regions.name,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityType: facilities.type,
    })
    .from(districts)
    .innerJoin(regions, eq(regions.id, districts.regionId))
    .leftJoin(facilities, and(eq(facilities.districtId, districts.id), eq(facilities.isActive, true)))
    .orderBy(asc(districts.name), asc(facilities.name));

  const byDistrict = new Map<string, DistrictOption>();
  for (const row of rows) {
    const existing = byDistrict.get(row.districtId) ?? {
      id: row.districtId,
      name: row.districtName,
      regionName: row.regionName,
      facilities: [],
    };
    if (row.facilityId && row.facilityName && row.facilityType) {
      existing.facilities.push({
        id: row.facilityId,
        name: row.facilityName,
        districtName: row.districtName,
        type: row.facilityType,
      });
    }
    byDistrict.set(row.districtId, existing);
  }
  return [...byDistrict.values()];
}

/** Programmes (categories) and their modules (spaces), for the session form. */
export async function listSessionProgrammes(viewer: Viewer) {
  return db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      spaceId: spaces.id,
      spaceTitle: spaces.title,
    })
    .from(categories)
    .leftJoin(spaces, and(eq(spaces.categoryId, categories.id), eq(spaces.isArchived, false)))
    .where(and(scopeFor(viewer), eq(categories.isArchived, false)))
    .orderBy(asc(categories.name), asc(spaces.title));
}

/** Kept for the insights page: sessions in the last `months` months, by month. */
export async function sessionCountsByMonth(viewer: Viewer, months: number): Promise<Map<string, number>> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));
  const [rows] = await Promise.all([
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${trainingSessions.organisedOn}), 'YYYY-MM')`,
        n: sql<number>`count(*)::int`,
      })
      .from(trainingSessions)
      .innerJoin(categories, eq(categories.id, trainingSessions.categoryId))
      .where(
        and(
          scopeFor(viewer),
          eq(trainingSessions.isArchived, false),
          gte(trainingSessions.organisedOn, start.toISOString().slice(0, 10)),
        ),
      )
      .groupBy(sql`date_trunc('month', ${trainingSessions.organisedOn})`),
  ]);
  return new Map(rows.map((row) => [row.month, row.n]));
}
