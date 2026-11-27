import "server-only";
import { and, count, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { auditLogs, programmeFields, materialVersions, materialViews, materials, programmeAreas, trainingSessions, users } from "@/db/schema";
import { ACCRA_TIME_ZONE, dateKeyInTimeZone } from "@/lib/dates";
import { monthBuckets, trafficWindow, type Bucket, type TrafficPeriod } from "@/lib/traffic-periods";
import { scopeFor } from "@/lib/server/scope";
import { trainingVisibilityFilter } from "@/lib/server/training-queries";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/*
 * The numbers behind /insights and the strip on the dashboard.
 *
 * One module, one scope rule: an administrator sees the whole service, a
 * facilitator sees the programmes they are assigned to, and nobody sees another
 * person's activity here (that lives in the directory and on their own page).
 * Counts are aggregated in SQL — the point of this page is to avoid loading rows.
 */

const WINDOW_DAYS = 30;

export interface ProgrammeInsight {
  id: string;
  name: string;
  code: string;
  published: number;
  inReview: number;
  programmeAreas: number;
}

export interface Insights {
  /** "all" for an administrator, "assigned" for a facilitator. */
  scope: "all" | "assigned";
  people: { learners: number; facilitators: number; admins: number; total: number } | null;
  library: { programmes: number; programmeAreas: number; published: number; inReview: number; draft: number; archived: number };
  /** Every programme in scope, busiest first, capped for the page. */
  programmes: ProgrammeInsight[];
  /** Programmes in scope with nothing published — the coverage gap. */
  gaps: { id: string; name: string }[];
  windowDays: number;
}

export async function getInsights(viewer: Viewer): Promise<Insights> {
  if (!isStaffRole(viewer.role)) {
    throw new Error("Insights are a staff surface; a member of staff reads their own record on /dashboard.");
  }

  const scope = scopeFor(viewer);
  const scopedCategories = and(scope, eq(programmeFields.isArchived, false));

  const programmeRows = await db
    .select({
      id: programmeFields.id,
      name: programmeFields.name,
      code: programmeFields.code,
      published: sql<number>`count(distinct ${materials.id}) filter (where ${materials.isPublished} and ${materials.state} = 'PUBLISHED')::int`,
      inReview: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'IN_REVIEW')::int`,
      programmeAreas: sql<number>`count(distinct ${programmeAreas.id})::int`,
    })
    .from(programmeFields)
    .leftJoin(programmeAreas, and(eq(programmeAreas.fieldId, programmeFields.id), eq(programmeAreas.isArchived, false)))
    .leftJoin(materials, eq(materials.programmeAreaId, programmeAreas.id))
    .where(scopedCategories)
    .groupBy(programmeFields.id, programmeFields.name, programmeFields.code)
    .orderBy(desc(sql`count(distinct ${materials.id}) filter (where ${materials.state} = 'PUBLISHED')`), programmeFields.name);

  const [libraryRow] = await db
    .select({
      programmes: sql<number>`count(distinct ${programmeFields.id})::int`,
      programmeAreas: sql<number>`count(distinct ${programmeAreas.id})::int`,
      published: sql<number>`count(distinct ${materials.id}) filter (where ${materials.isPublished} and ${materials.state} = 'PUBLISHED')::int`,
      inReview: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'IN_REVIEW')::int`,
      draft: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'DRAFT')::int`,
      archived: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'ARCHIVED')::int`,
    })
    .from(programmeFields)
    .leftJoin(programmeAreas, and(eq(programmeAreas.fieldId, programmeFields.id), eq(programmeAreas.isArchived, false)))
    .leftJoin(materials, eq(materials.programmeAreaId, programmeAreas.id))
    .where(scopedCategories);

  // Staff headcount is directory data, so only an administrator sees it.
  const people =
    viewer.role === "SYSTEM_ADMIN"
      ? await (async () => {
          const rows = await db
            .select({ role: users.role, n: count() })
            .from(users)
            .where(eq(users.isActive, true))
            .groupBy(users.role);
          const byRole = new Map(rows.map((row) => [row.role, row.n]));
          const learners = byRole.get("LEARNER") ?? 0;
          const facilitators = byRole.get("FACILITATOR") ?? 0;
          const admins = byRole.get("SYSTEM_ADMIN") ?? 0;
          return { learners, facilitators, admins, total: learners + facilitators + admins };
        })()
      : null;

  const programmes: ProgrammeInsight[] = programmeRows.slice(0, 12);

  return {
    scope: viewer.role === "SYSTEM_ADMIN" ? "all" : "assigned",
    people,
    library: {
      programmes: libraryRow?.programmes ?? 0,
      programmeAreas: libraryRow?.programmeAreas ?? 0,
      published: libraryRow?.published ?? 0,
      inReview: libraryRow?.inReview ?? 0,
      draft: libraryRow?.draft ?? 0,
      archived: libraryRow?.archived ?? 0,
    },
    programmes,
    gaps: programmeRows.filter((row) => row.published === 0).map(({ id, name }) => ({ id, name })),
    windowDays: WINDOW_DAYS,
  };
}

/* ── Chart series ───────────────────────────────────────────────────────────
 * The numbers the insights page draws. Each series comes from one aggregate
 * query; bucketing happens in SQL (`date_trunc`) so the browser receives a few
 * hundred numbers rather than a row per event.
 */

function accraDateKey(date = new Date()): string {
  return dateKeyInTimeZone(date, ACCRA_TIME_ZONE);
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface TrafficSeries {
  buckets: Bucket[];
  views: number[];
  downloads: number[];
  totals: { views: number; downloads: number };
  /** Totals for the equal-length reporting window immediately before `buckets`. */
  previousTotals: { views: number; downloads: number };
}

/**
 * Material opens from the daily material_views ledger and completed file issues
 * from the audit trail. The selected window is compared with the immediately
 * preceding window of equal length; labels and timestamp grouping use Accra time.
 * Passing a number remains supported for the Insights page's weekly series.
 */
export async function getTrafficSeries(viewer: Viewer, periodOrWeeks: TrafficPeriod | number = "12w"): Promise<TrafficSeries> {
  const window = trafficWindow(periodOrWeeks);
  const { unit, buckets, currentStart, currentEnd, previousStart } = window;
  const currentStartAt = dateFromKey(currentStart);
  const previousStartAt = dateFromKey(previousStart);
  const tomorrow = dateFromKey(currentEnd);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const beforeTomorrow = dateFromKey(dateKey(tomorrow));

  const viewBucket =
    unit === "day"
      ? sql<string>`to_char(${materialViews.viewedOn}, 'YYYY-MM-DD')`
      : unit === "week"
        ? sql<string>`to_char(date_trunc('week', ${materialViews.viewedOn}::timestamp), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('month', ${materialViews.viewedOn}::timestamp), 'YYYY-MM')`;
  const downloadBucket =
    unit === "day"
      ? sql<string>`to_char(${auditLogs.createdAt} at time zone 'Africa/Accra', 'YYYY-MM-DD')`
      : unit === "week"
        ? sql<string>`to_char(date_trunc('week', ${auditLogs.createdAt} at time zone 'Africa/Accra'), 'YYYY-MM-DD')`
        : sql<string>`to_char(date_trunc('month', ${auditLogs.createdAt} at time zone 'Africa/Accra'), 'YYYY-MM')`;

  const [viewRows, downloadRows] = await Promise.all([
    db
      .select({
        bucket: viewBucket,
        n: sql<number>`count(*) filter (where ${materialViews.viewedOn} >= ${currentStart}::date and ${materialViews.viewedOn} <= ${currentEnd}::date)::int`,
        previous: sql<number>`count(*) filter (where ${materialViews.viewedOn} >= ${previousStart}::date and ${materialViews.viewedOn} < ${currentStart}::date)::int`,
      })
      .from(materialViews)
      .innerJoin(materials, eq(materials.id, materialViews.materialId))
      .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .where(and(scopeFor(viewer), gte(materialViews.viewedOn, previousStart), lte(materialViews.viewedOn, currentEnd)))
      .groupBy(viewBucket),
    db
      .select({
        bucket: downloadBucket,
        n: sql<number>`count(*) filter (where ${auditLogs.createdAt} >= ${currentStartAt} and ${auditLogs.createdAt} < ${beforeTomorrow})::int`,
        previous: sql<number>`count(*) filter (where ${auditLogs.createdAt} >= ${previousStartAt} and ${auditLogs.createdAt} < ${currentStartAt})::int`,
      })
      .from(auditLogs)
      .innerJoin(materials, eq(materials.id, sql`${auditLogs.entityId}::uuid`))
      .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .where(
        and(
          eq(auditLogs.action, "MATERIAL_FILE_ISSUED"),
          scopeFor(viewer),
          gte(auditLogs.createdAt, previousStartAt),
          lt(auditLogs.createdAt, beforeTomorrow),
        ),
      )
      .groupBy(downloadBucket),
  ]);

  const viewsByBucket = new Map(viewRows.map((row) => [row.bucket, row.n]));
  const downloadsByBucket = new Map(downloadRows.map((row) => [row.bucket, row.n]));
  const views = buckets.map((bucket) => viewsByBucket.get(bucket.key) ?? 0);
  const downloads = buckets.map((bucket) => downloadsByBucket.get(bucket.key) ?? 0);

  return {
    buckets,
    views,
    downloads,
    totals: {
      views: views.reduce((sum, value) => sum + value, 0),
      downloads: downloads.reduce((sum, value) => sum + value, 0),
    },
    previousTotals: {
      views: viewRows.reduce((sum, row) => sum + row.previous, 0),
      downloads: downloadRows.reduce((sum, row) => sum + row.previous, 0),
    },
  };
}

export interface UploadSeries {
  buckets: Bucket[];
  series: { label: string; values: number[] }[];
  total: number;
}

/** New Training Material versions per month, grouped by child Programme Field. */
export async function getUploadSeries(viewer: Viewer, months = 12, topProgrammes = 4): Promise<UploadSeries> {
  const buckets = monthBuckets(months);
  const since = new Date(`${buckets[0]?.key ?? accraDateKey().slice(0, 7)}-01T00:00:00.000Z`);
  const tomorrow = dateFromKey(accraDateKey());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const monthBucket = sql<string>`to_char(date_trunc('month', ${materialVersions.createdAt} at time zone 'Africa/Accra'), 'YYYY-MM')`;

  const rows = await db
    .select({
      month: monthBucket,
      categoryId: programmeAreas.id,
      fieldName: programmeAreas.name,
      parentName: programmeFields.name,
      n: sql<number>`count(*)::int`,
    })
    .from(materialVersions)
    .innerJoin(materials, eq(materials.id, materialVersions.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        scopeFor(viewer),
        eq(programmeAreas.isArchived, false),
        eq(programmeFields.isArchived, false),
        gte(materialVersions.createdAt, since),
        lt(materialVersions.createdAt, new Date(`${dateKey(tomorrow)}T00:00:00.000Z`)),
      ),
    )
    .groupBy(monthBucket, programmeAreas.id, programmeAreas.name, programmeFields.name);

  const totals = new Map<string, { label: string; n: number }>();
  const valuesByMonth = new Map<string, number>();
  for (const row of rows) {
    const current = totals.get(row.categoryId) ?? { label: `${row.parentName} → ${row.fieldName}`, n: 0 };
    current.n += row.n;
    totals.set(row.categoryId, current);
    valuesByMonth.set(`${row.month}:${row.categoryId}`, row.n);
  }
  const leaders = [...totals.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, topProgrammes);
  const leaderIds = new Set(leaders.map(([id]) => id));
  const otherByMonth = new Map<string, number>();
  for (const row of rows) {
    if (!leaderIds.has(row.categoryId)) otherByMonth.set(row.month, (otherByMonth.get(row.month) ?? 0) + row.n);
  }

  const series = [
    ...leaders.map(([id, value]) => ({
      label: value.label,
      values: buckets.map((bucket) => valuesByMonth.get(`${bucket.key}:${id}`) ?? 0),
    })),
    ...(totals.size > leaders.length
      ? [{ label: "Other Programme Fields", values: buckets.map((bucket) => otherByMonth.get(bucket.key) ?? 0) }]
      : []),
  ];

  return {
    buckets,
    series: series.length ? series : [{ label: "Uploads", values: buckets.map(() => 0) }],
    total: [...totals.values()].reduce((sum, value) => sum + value.n, 0),
  };
}

export interface TrainingSeries {
  buckets: Bucket[];
  counts: number[];
  byProgramme: { label: string; parentLabel: string; value: number }[];
  total: number;
}

/** Unarchived Training register counts visible to the current staff member. */
export interface TrainingCounts {
  total: number;
  last90Days: number;
  attendees: number;
}

/** Match `/trainings`: admins and unit heads see all review states; facilitators see published records and their own. */
function trainingVisibilityForInsights(viewer: Viewer) {
  if (!isStaffRole(viewer.role)) return sql`false`;
  return trainingVisibilityFilter({
    userId: viewer.id,
    seeAll: viewer.role === "SYSTEM_ADMIN" || viewer.unitHead === true,
  });
}

export async function getTrainingCounts(viewer: Viewer): Promise<TrainingCounts> {
  const throughDate = accraDateKey();
  const since = dateFromKey(throughDate);
  since.setUTCDate(since.getUTCDate() - 89);
  const sinceDate = dateKey(since);

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last90Days: sql<number>`count(*) filter (where ${trainingSessions.organisedOn} >= ${sinceDate} and ${trainingSessions.organisedOn} <= ${throughDate})::int`,
      attendees: sql<number>`coalesce(sum(${trainingSessions.attendeeCount}) filter (where ${trainingSessions.status} = 'COMPLETED'), 0)::int`,
    })
    .from(trainingSessions)
    .where(and(trainingVisibilityForInsights(viewer), eq(trainingSessions.isArchived, false)));

  return { total: row?.total ?? 0, last90Days: row?.last90Days ?? 0, attendees: row?.attendees ?? 0 };
}

/** Training register records visible to the viewer, grouped by Programme Area → Programme Field. */
export async function getTrainingSeries(viewer: Viewer, months = 12): Promise<TrainingSeries> {
  const buckets = monthBuckets(months);
  const sinceDate = `${buckets[0]?.key ?? accraDateKey().slice(0, 7)}-01`;
  const throughDate = accraDateKey();
  const monthBucket = sql<string>`to_char(date_trunc('month', ${trainingSessions.organisedOn}::timestamp), 'YYYY-MM')`;

  const rows = await db
    .select({
      month: monthBucket,
      fieldId: programmeAreas.id,
      fieldName: programmeAreas.name,
      parentId: programmeFields.id,
      parentName: programmeFields.name,
      n: sql<number>`count(*)::int`,
    })
    .from(trainingSessions)
    .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .leftJoin(
      programmeAreas,
      and(
        eq(programmeAreas.id, trainingSessions.programmeAreaId),
        eq(programmeAreas.fieldId, trainingSessions.programmeFieldId),
      ),
    )
    .where(
      and(
        trainingVisibilityForInsights(viewer),
        eq(trainingSessions.isArchived, false),
        gte(trainingSessions.organisedOn, sinceDate),
        lte(trainingSessions.organisedOn, throughDate),
      ),
    )
    .groupBy(monthBucket, programmeAreas.id, programmeAreas.name, programmeFields.id, programmeFields.name);

  const byProgramme = new Map<string, { label: string; parentLabel: string; value: number }>();
  for (const row of rows) {
    const key = row.fieldId ?? `unassigned:${row.parentId ?? "unknown"}`;
    const current = byProgramme.get(key) ?? {
      label: row.fieldName ?? "Programme Field not recorded",
      parentLabel: row.parentName ?? "Programme Area not recorded",
      value: 0,
    };
    current.value += row.n;
    byProgramme.set(key, current);
  }

  return {
    buckets,
    counts: buckets.map((bucket) => rows.filter((row) => row.month === bucket.key).reduce((sum, row) => sum + row.n, 0)),
    byProgramme: [...byProgramme.values()].sort((a, b) => b.value - a.value),
    total: rows.reduce((sum, row) => sum + row.n, 0),
  };
}

export interface ProgrammeTrafficRow {
  id: string;
  /** Child Programme Field. */
  label: string;
  /** Parent Programme Area. */
  parentLabel: string;
  value: number;
}

/** Material opens in the last 30 calendar days, grouped by Programme Area → Programme Field. */
export async function getProgrammeTraffic(viewer: Viewer, days = 30): Promise<ProgrammeTrafficRow[]> {
  const today = dateFromKey(accraDateKey());
  today.setUTCDate(today.getUTCDate() - Math.max(0, days - 1));
  const since = dateKey(today);
  const rows = await db
    .select({
      id: programmeAreas.id,
      label: programmeAreas.name,
      parentLabel: programmeFields.name,
      n: sql<number>`count(*)::int`,
    })
    .from(materialViews)
    .innerJoin(materials, eq(materials.id, materialViews.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(scopeFor(viewer), gte(materialViews.viewedOn, since), lte(materialViews.viewedOn, accraDateKey())))
    .groupBy(programmeAreas.id, programmeAreas.name, programmeFields.name)
    .orderBy(desc(sql`count(*)`));
  return rows.map((row) => ({ id: row.id, label: row.label, parentLabel: row.parentLabel, value: row.n }));
}

/** A person's own traffic, for "My activity". Never another person's. */
export async function getMyTraffic(userId: string, days = 30): Promise<{ opens: number; materials: number; downloads: number; days: number }> {
  const periodDays = Math.max(1, Math.floor(days));
  const today = dateFromKey(accraDateKey());
  const sinceDate = new Date(today);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - (periodDays - 1));
  const since = dateKey(sinceDate);
  const beforeTomorrow = new Date(today);
  beforeTomorrow.setUTCDate(beforeTomorrow.getUTCDate() + 1);

  const [viewRow] = await db
    .select({
      opens: sql<number>`count(*)::int`,
      materials: sql<number>`count(distinct ${materialViews.materialId})::int`,
    })
    .from(materialViews)
    .where(and(eq(materialViews.userId, userId), gte(materialViews.viewedOn, since), lte(materialViews.viewedOn, dateKey(today))));

  const [downloadRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "MATERIAL_FILE_ISSUED"),
        eq(auditLogs.userId, userId),
        gte(auditLogs.createdAt, new Date(`${since}T00:00:00.000Z`)),
        lt(auditLogs.createdAt, beforeTomorrow),
      ),
    );

  return {
    opens: viewRow?.opens ?? 0,
    materials: viewRow?.materials ?? 0,
    downloads: downloadRow?.n ?? 0,
    days: periodDays,
  };
}

/* ── Published material by type ──────────────────────────────────────────────
 * The donut and the published-material KPI use the same publication, taxonomy
 * and viewer-scope predicates. Materials remain classified by their declared
 * type even if a current file is missing; otherwise that extra version check
 * would make the visible categories fail to reconcile with the headline total.
 */

export const MATERIAL_TYPE_ORDER = ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const;
export type MaterialTypeKey = (typeof MATERIAL_TYPE_ORDER)[number];

export async function getTypeMix(viewer: Viewer): Promise<{ type: MaterialTypeKey; count: number }[]> {
  const rows = await db
    .select({ type: materials.type, n: sql<number>`count(distinct ${materials.id})::int` })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        scopeFor(viewer),
        eq(programmeAreas.isArchived, false),
        eq(programmeFields.isArchived, false),
        eq(materials.isPublished, true),
        eq(materials.state, "PUBLISHED"),
      ),
    )
    .groupBy(materials.type);
  const byType = new Map(rows.map((row) => [row.type, row.n]));
  return MATERIAL_TYPE_ORDER.map((type) => ({ type, count: byType.get(type) ?? 0 }));
}
