import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import {
  districts,
  facilities,
  programmeAreas,
  programmeFields,
  regions,
  subDistricts,
  trainingResources,
  trainingSessions,
  users,
} from "@/db/schema";
import { trainingComments } from "@/db/schema";
import type { TrainingStatus } from "@/lib/labels";
import { yearRange } from "@/lib/training-dates";

/*
 * The Trainings registry.
 *
 * Everything the page needs in one place: the filtered list, the counters above
 * it, the values its filters offer, and one training for its detail page. The
 * joins are all LEFT joins on purpose — a training keeps its place in the list
 * when the programme area, the district or the facility it referenced is later
 * removed, and reads "not recorded" instead of disappearing.
 */

export const TRAININGS_PAGE_SIZE = 12;

export interface TrainingFilters {
  q?: string;
  year?: number;
  programmeFieldId?: string;
  programmeAreaId?: string;
  regionId?: string;
  districtId?: string;
  status?: TrainingStatus;
  /** Review queue: `PENDING` is what a unit head acts on. */
  review?: TrainingReviewState;
  /**
   * Who is asking. Anything not yet approved is a draft between its author and
   * the unit head, so it must not leak into a learner's register — but the
   * author still needs to see their own row to fix and resubmit it.
   */
  viewer?: { userId: string; seeAll: boolean };
  page?: number;
}

export type TrainingReviewState = "PENDING" | "PUBLISHED" | "REJECTED";

export interface TrainingListRow {
  id: string;
  title: string;
  year: number;
  status: TrainingStatus;
  reviewState: TrainingReviewState;
  fieldName: string | null;
  areaName: string | null;
  targetGroup: string | null;
  startsOn: string;
  endsOn: string | null;
  durationText: string | null;
  regionName: string | null;
  districtName: string | null;
  subDistrictName: string | null;
  facilityName: string | null;
  venue: string | null;
  attendeeCount: number | null;
  createdByName: string | null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function whereFor(filters: TrainingFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [eq(trainingSessions.isArchived, false)];

  const term = filters.q?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    clauses.push(
      or(
        ilike(trainingSessions.title, pattern),
        ilike(trainingSessions.targetGroup, pattern),
        ilike(trainingSessions.venue, pattern),
      ),
    );
  }

  if (filters.year) clauses.push(eq(trainingSessions.year, filters.year));
  if (filters.programmeFieldId) clauses.push(eq(trainingSessions.programmeFieldId, filters.programmeFieldId));
  if (filters.programmeAreaId) clauses.push(eq(trainingSessions.programmeAreaId, filters.programmeAreaId));
  if (filters.regionId) clauses.push(eq(trainingSessions.regionId, filters.regionId));
  if (filters.districtId) clauses.push(eq(trainingSessions.districtId, filters.districtId));
  if (filters.status) clauses.push(eq(trainingSessions.status, filters.status));
  if (filters.review) clauses.push(eq(trainingSessions.reviewState, filters.review));

  if (filters.viewer && !filters.viewer.seeAll) {
    clauses.push(
      or(eq(trainingSessions.reviewState, "PUBLISHED"), eq(trainingSessions.createdById, filters.viewer.userId)),
    );
  }

  return and(...clauses);
}

export async function listTrainings(filters: TrainingFilters): Promise<{
  items: TrainingListRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const where = whereFor(filters);
  const page = Math.max(1, filters.page ?? 1);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: trainingSessions.id,
        title: trainingSessions.title,
        year: trainingSessions.year,
        status: trainingSessions.status,
        reviewState: trainingSessions.reviewState,
        fieldName: programmeFields.name,
        areaName: programmeAreas.name,
        targetGroup: trainingSessions.targetGroup,
        startsOn: trainingSessions.organisedOn,
        endsOn: trainingSessions.endsOn,
        durationText: trainingSessions.durationText,
        regionName: regions.name,
        districtName: districts.name,
        subDistrictName: subDistricts.name,
        facilityName: facilities.name,
        venue: trainingSessions.venue,
        attendeeCount: trainingSessions.attendeeCount,
        createdByName: users.fullName,
      })
      .from(trainingSessions)
      .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
      .leftJoin(programmeAreas, eq(programmeAreas.id, trainingSessions.programmeAreaId))
      .leftJoin(regions, eq(regions.id, trainingSessions.regionId))
      .leftJoin(districts, eq(districts.id, trainingSessions.districtId))
      .leftJoin(subDistricts, eq(subDistricts.id, trainingSessions.subDistrictId))
      .leftJoin(facilities, eq(facilities.id, trainingSessions.facilityId))
      .leftJoin(users, eq(users.id, trainingSessions.createdById))
      .where(where)
      .orderBy(desc(trainingSessions.organisedOn), asc(trainingSessions.title))
      .limit(TRAININGS_PAGE_SIZE)
      .offset((page - 1) * TRAININGS_PAGE_SIZE),
    db.select({ n: count() }).from(trainingSessions).where(where),
  ]);

  const total = totals[0]?.n ?? 0;

  return {
    items: rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TRAININGS_PAGE_SIZE)),
  };
}

export interface TrainingSummary {
  total: number;
  planned: number;
  completed: number;
  thisYear: number;
  attendees: number;
}

export async function getTrainingSummary(): Promise<TrainingSummary> {
  const year = new Date().getFullYear();
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      planned: sql<number>`count(*) filter (where ${trainingSessions.status} = 'PLANNED')::int`,
      completed: sql<number>`count(*) filter (where ${trainingSessions.status} = 'COMPLETED')::int`,
      thisYear: sql<number>`count(*) filter (where ${trainingSessions.year} = ${year})::int`,
      attendees: sql<number>`coalesce(sum(${trainingSessions.attendeeCount}), 0)::int`,
    })
    .from(trainingSessions)
    .where(eq(trainingSessions.isArchived, false));

  return row ?? { total: 0, planned: 0, completed: 0, thisYear: 0, attendees: 0 };
}

export interface TrainingFilterOptions {
  years: number[];
  regions: { id: string; name: string }[];
  districts: { id: string; name: string; regionId: string }[];
}

/**
 * Values the filter bar offers. Years come from the data — a registry with two
 * years of plans should not offer a decade of empty ones — but the current and
 * next year always appear, so next year's planning window is reachable before
 * anything is filed in it.
 */
async function loadTrainingFilterOptions(): Promise<TrainingFilterOptions> {
  const [usedYears, regionRows, districtRows] = await Promise.all([
    db
      .selectDistinct({ year: trainingSessions.year })
      .from(trainingSessions)
      .where(eq(trainingSessions.isArchived, false)),
    db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(asc(regions.name)),
    db
      .select({ id: districts.id, name: districts.name, regionId: districts.regionId })
      .from(districts)
      .orderBy(asc(districts.name)),
  ]);

  const years = new Set(yearRange(new Date().getFullYear() + 1));
  for (const row of usedYears) years.add(row.year);

  return {
    years: [...years].sort((a, b) => b - a),
    regions: regionRows,
    districts: districtRows,
  };
}

/**
 * Filter options are reference data: the regions, the districts, the years
 * anything has been filed in. They change when an administrator edits geography,
 * not between two clicks of the same session — and they are three of the dozen
 * queries the register fires on every visit. Thirty seconds of cache means
 * hopping back to Trainings costs the browser nothing at all.
 */
export const getTrainingFilterOptions = unstable_cache(loadTrainingFilterOptions, ["training-filter-options"], {
  revalidate: 30,
  tags: ["taxonomy", "trainings"],
});

export interface TrainingResourceRow {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByName: string | null;
  createdAt: Date;
  /** Where the bytes are. The page turns this into a short-lived link. */
  storageKey: string;
}

export interface TrainingDetail extends TrainingListRow {
  reviewNote: string | null;
  reviewedAt: Date | null;
  reviewedByName: string | null;
  resources: TrainingResourceRow[];
  programmeFieldId: string | null;
  programmeAreaId: string | null;
  regionId: string | null;
  districtId: string | null;
  subDistrictId: string | null;
  facilityId: string | null;
  notes: string | null;
  /** Optional cover picture: the storage key, or null. */
  imageStorageKey: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTraining(id: string): Promise<TrainingDetail | null> {
  const [row] = await db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      year: trainingSessions.year,
      status: trainingSessions.status,
      reviewState: trainingSessions.reviewState,
      fieldName: programmeFields.name,
      areaName: programmeAreas.name,
      programmeFieldId: trainingSessions.programmeFieldId,
      programmeAreaId: trainingSessions.programmeAreaId,
      targetGroup: trainingSessions.targetGroup,
      startsOn: trainingSessions.organisedOn,
      endsOn: trainingSessions.endsOn,
      durationText: trainingSessions.durationText,
      regionName: regions.name,
      districtName: districts.name,
      subDistrictName: subDistricts.name,
      facilityName: facilities.name,
      regionId: trainingSessions.regionId,
      districtId: trainingSessions.districtId,
      subDistrictId: trainingSessions.subDistrictId,
      facilityId: trainingSessions.facilityId,
      venue: trainingSessions.venue,
      attendeeCount: trainingSessions.attendeeCount,
      notes: trainingSessions.notes,
      imageStorageKey: trainingSessions.imageStorageKey,
      createdById: trainingSessions.createdById,
      createdByName: users.fullName,
      createdAt: trainingSessions.createdAt,
      updatedAt: trainingSessions.updatedAt,
      reviewNote: trainingSessions.reviewNote,
      reviewedAt: trainingSessions.reviewedAt,
      reviewedById: trainingSessions.reviewedById,
    })
    .from(trainingSessions)
    .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .leftJoin(programmeAreas, eq(programmeAreas.id, trainingSessions.programmeAreaId))
    .leftJoin(regions, eq(regions.id, trainingSessions.regionId))
    .leftJoin(districts, eq(districts.id, trainingSessions.districtId))
    .leftJoin(subDistricts, eq(subDistricts.id, trainingSessions.subDistrictId))
    .leftJoin(facilities, eq(facilities.id, trainingSessions.facilityId))
    .leftJoin(users, eq(users.id, trainingSessions.createdById))
    .where(and(eq(trainingSessions.id, id), eq(trainingSessions.isArchived, false)))
    .limit(1);

  if (!row) return null;

  // Two small reads rather than two more joins on the main query: the detail
  // page needs the reviewer's name and the attachments, and neither is worth
  // widening the list query that every row pays for.
  const [reviewer, resources] = await Promise.all([
    row.reviewedById
      ? db
          .select({ name: users.fullName })
          .from(users)
          .where(eq(users.id, row.reviewedById))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: trainingResources.id,
        title: trainingResources.title,
        mimeType: trainingResources.mimeType,
        sizeBytes: trainingResources.sizeBytes,
        uploadedByName: users.fullName,
        createdAt: trainingResources.createdAt,
        storageKey: trainingResources.storageKey,
      })
      .from(trainingResources)
      .leftJoin(users, eq(users.id, trainingResources.uploadedById))
      .where(eq(trainingResources.trainingId, id))
      .orderBy(asc(trainingResources.createdAt)),
  ]);

  // `reviewedById` is not part of TrainingDetail: the page needs the name.
  const { reviewedById, ...rest } = row;
  void reviewedById;
  return {
    ...rest,
    reviewedByName: reviewer[0]?.name ?? null,
    resources,
  };
}

export interface TrainingCommentRow {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: Date;
}

/**
 * The conversation under one training, oldest first — a page reads like a
 * conversation, so the newest message is at the bottom where the reply box is.
 */
export async function listTrainingComments(trainingId: string, limit = 200): Promise<TrainingCommentRow[]> {
  return db
    .select({
      id: trainingComments.id,
      body: trainingComments.body,
      authorId: trainingComments.authorId,
      authorName: users.fullName,
      authorRole: users.role,
      createdAt: trainingComments.createdAt,
    })
    .from(trainingComments)
    .innerJoin(users, eq(users.id, trainingComments.authorId))
    .where(eq(trainingComments.trainingId, trainingId))
    .orderBy(asc(trainingComments.createdAt))
    .limit(limit);
}

/**
 * Every published training filed under one programme area, newest first.
 *
 * This is what the catalogue's area page shows: the trainings held for that area,
 * so a member of staff can find the one they attended and the material that went
 * with it. Unreviewed rows are excluded — a facilitator's draft is not the
 * catalogue.
 */
export interface AreaTrainingRow {
  id: string;
  title: string;
  year: number;
  status: TrainingStatus;
  startsOn: string;
  endsOn: string | null;
  venue: string | null;
  facilityName: string | null;
  regionName: string | null;
  attendeeCount: number | null;
  targetGroup: string | null;
}

export async function listTrainingsInArea(programmeAreaId: string, limit = 50): Promise<AreaTrainingRow[]> {
  return db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      year: trainingSessions.year,
      status: trainingSessions.status,
      startsOn: trainingSessions.organisedOn,
      endsOn: trainingSessions.endsOn,
      venue: trainingSessions.venue,
      facilityName: facilities.name,
      regionName: regions.name,
      attendeeCount: trainingSessions.attendeeCount,
      targetGroup: trainingSessions.targetGroup,
    })
    .from(trainingSessions)
    .leftJoin(regions, eq(regions.id, trainingSessions.regionId))
    .leftJoin(facilities, eq(facilities.id, trainingSessions.facilityId))
    .where(
      and(
        eq(trainingSessions.programmeAreaId, programmeAreaId),
        eq(trainingSessions.reviewState, "PUBLISHED"),
        eq(trainingSessions.isArchived, false),
      ),
    )
    .orderBy(desc(trainingSessions.organisedOn))
    .limit(limit);
}

/**
 * Trainings per programme field, for the small breakdown under the counters.
 * Grouped in SQL so a field with no trainings can still be shown as zero.
 */
export async function trainingsByField(): Promise<{ fieldName: string; n: number }[]> {
  return db
    .select({ fieldName: programmeFields.name, n: sql<number>`count(${trainingSessions.id})::int` })
    .from(programmeFields)
    .leftJoin(
      trainingSessions,
      and(eq(trainingSessions.programmeFieldId, programmeFields.id), eq(trainingSessions.isArchived, false)),
    )
    .groupBy(programmeFields.name, programmeFields.sortOrder)
    .orderBy(asc(programmeFields.sortOrder), asc(programmeFields.name));
}

/** Trainings that start after today, soonest first — the "upcoming" strip. */
export async function upcomingTrainings(limit = 4): Promise<TrainingListRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      year: trainingSessions.year,
      status: trainingSessions.status,
      reviewState: trainingSessions.reviewState,
      fieldName: programmeFields.name,
      areaName: programmeAreas.name,
      targetGroup: trainingSessions.targetGroup,
      startsOn: trainingSessions.organisedOn,
      endsOn: trainingSessions.endsOn,
      durationText: trainingSessions.durationText,
      regionName: regions.name,
      districtName: districts.name,
      subDistrictName: subDistricts.name,
      facilityName: facilities.name,
      venue: trainingSessions.venue,
      attendeeCount: trainingSessions.attendeeCount,
      createdByName: users.fullName,
    })
    .from(trainingSessions)
    .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .leftJoin(programmeAreas, eq(programmeAreas.id, trainingSessions.programmeAreaId))
    .leftJoin(regions, eq(regions.id, trainingSessions.regionId))
    .leftJoin(districts, eq(districts.id, trainingSessions.districtId))
    .leftJoin(subDistricts, eq(subDistricts.id, trainingSessions.subDistrictId))
    .leftJoin(facilities, eq(facilities.id, trainingSessions.facilityId))
    .leftJoin(users, eq(users.id, trainingSessions.createdById))
    .where(
      and(
        eq(trainingSessions.isArchived, false),
        eq(trainingSessions.status, "PLANNED"),
        gte(trainingSessions.organisedOn, today),
      ),
    )
    .orderBy(asc(trainingSessions.organisedOn))
    .limit(limit);
}
