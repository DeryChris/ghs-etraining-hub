import "server-only";
import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { auditLogs, programmeFields, materialVersions, materialViews, materials, programmeAreas, trainingSessions, users } from "@/db/schema";
import { scopeFor, scopeForTraining } from "@/lib/server/scope";
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
      published: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'PUBLISHED')::int`,
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

export interface Bucket {
  /** Sort key, e.g. 2026-11 or 2026-W46. */
  key: string;
  /** Axis label, e.g. "Nov" or "12 Oct". */
  label: string;
}

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Africa/Accra" });
const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Accra" });

function monthBuckets(count: number): Bucket[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return { key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`, label: MONTH_LABEL.format(date) };
  });
}

function weekBuckets(count: number): Bucket[] {
  const now = new Date();
  // Monday of the current week, then back `count - 1` weeks.
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (monday.getUTCDay() + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - day);

  return Array.from({ length: count }, (_, index) => {
    const start = new Date(monday);
    start.setUTCDate(monday.getUTCDate() - (count - 1 - index) * 7);
    const iso = start.toISOString().slice(0, 10);
    return { key: iso, label: DAY_LABEL.format(start) };
  });
}

export interface TrafficSeries {
  buckets: Bucket[];
  views: number[];
  downloads: number[];
  totals: { views: number; downloads: number };
}

/** Views (from material_views) and downloads (from the audit trail), weekly. */
export async function getTrafficSeries(viewer: Viewer, weeks = 12): Promise<TrafficSeries> {
  const buckets = weekBuckets(weeks);
  const since = buckets[0]?.key ?? new Date().toISOString().slice(0, 10);

  const viewRows = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${materialViews.viewedOn}), 'YYYY-MM-DD')`,
      n: sql<number>`coalesce(sum(${materialViews.viewCount}), 0)::int`,
    })
    .from(materialViews)
    .innerJoin(materials, eq(materials.id, materialViews.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(scopeFor(viewer), gte(materialViews.viewedOn, since)))
    .groupBy(sql`date_trunc('week', ${materialViews.viewedOn})`);

  const downloadRows = await db
    .select({
      week: sql<string>`to_char(date_trunc('week', ${auditLogs.createdAt}), 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .innerJoin(materials, eq(materials.id, sql`${auditLogs.entityId}::uuid`))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(eq(auditLogs.action, "MATERIAL_FILE_ISSUED"), scopeFor(viewer), gte(auditLogs.createdAt, new Date(`${since}T00:00:00Z`))))
    .groupBy(sql`date_trunc('week', ${auditLogs.createdAt})`);

  const viewsByWeek = new Map(viewRows.map((row) => [row.week, row.n]));
  const downloadsByWeek = new Map(downloadRows.map((row) => [row.week, row.n]));

  const views = buckets.map((bucket) => viewsByWeek.get(bucket.key) ?? 0);
  const downloads = buckets.map((bucket) => downloadsByWeek.get(bucket.key) ?? 0);

  return {
    buckets,
    views,
    downloads,
    totals: {
      views: views.reduce((sum, n) => sum + n, 0),
      downloads: downloads.reduce((sum, n) => sum + n, 0),
    },
  };
}

export interface UploadSeries {
  buckets: Bucket[];
  series: { label: string; values: number[] }[];
  total: number;
}

/** New versions uploaded per month, split by the busiest programmes. */
export async function getUploadSeries(viewer: Viewer, months = 12, topProgrammes = 4): Promise<UploadSeries> {
  const buckets = monthBuckets(months);
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${materialVersions.createdAt}), 'YYYY-MM')`,
      categoryId: programmeFields.id,
      fieldName: programmeFields.name,
      n: sql<number>`count(*)::int`,
    })
    .from(materialVersions)
    .innerJoin(materials, eq(materials.id, materialVersions.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(scopeFor(viewer), gte(materialVersions.createdAt, since)))
    .groupBy(sql`date_trunc('month', ${materialVersions.createdAt})`, programmeFields.id, programmeFields.name);

  const totals = new Map<string, { name: string; n: number }>();
  for (const row of rows) {
    const current = totals.get(row.categoryId) ?? { name: row.fieldName, n: 0 };
    current.n += row.n;
    totals.set(row.categoryId, current);
  }
  const leaders = [...totals.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, topProgrammes);
  const leaderIds = new Set(leaders.map(([id]) => id));

  const series = [
    ...leaders.map(([id, value]) => ({
      label: value.name,
      values: buckets.map((bucket) => rows.find((row) => row.month === bucket.key && row.categoryId === id)?.n ?? 0),
    })),
    ...(totals.size > leaders.length
      ? [
          {
            label: "Other programmes",
            values: buckets.map((bucket) =>
              rows.filter((row) => row.month === bucket.key && !leaderIds.has(row.categoryId)).reduce((sum, row) => sum + row.n, 0),
            ),
          },
        ]
      : []),
  ];

  return { buckets, series: series.length ? series : [{ label: "Uploads", values: buckets.map(() => 0) }], total: [...totals.values()].reduce((sum, value) => sum + value.n, 0) };
}

export interface TrainingSeries {
  buckets: Bucket[];
  counts: number[];
  byProgramme: { label: string; value: number }[];
  total: number;
}

/** Trainings that actually ran, per month and per programme. */
/** Trainings on record, scoped: the dashboard's "Trainings · 90 days" tile. */
export interface TrainingCounts {
  total: number;
  last90Days: number;
  attendees: number;
}

export async function getTrainingCounts(viewer: Viewer): Promise<TrainingCounts> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const sinceDate = since.toISOString().slice(0, 10);

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      last90Days: sql<number>`count(*) filter (where ${trainingSessions.organisedOn} >= ${sinceDate})::int`,
      attendees: sql<number>`coalesce(sum(${trainingSessions.attendeeCount}), 0)::int`,
    })
    .from(trainingSessions)
    .where(and(scopeForTraining(viewer), eq(trainingSessions.isArchived, false)));

  return { total: row?.total ?? 0, last90Days: row?.last90Days ?? 0, attendees: row?.attendees ?? 0 };
}

export async function getTrainingSeries(viewer: Viewer, months = 12): Promise<TrainingSeries> {
  const buckets = monthBuckets(months);
  const since = new Date();
  since.setUTCDate(1);
  since.setUTCMonth(since.getUTCMonth() - (months - 1));
  const sinceDate = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${trainingSessions.organisedOn}), 'YYYY-MM')`,
      fieldName: programmeFields.name,
      n: sql<number>`count(*)::int`,
    })
    .from(trainingSessions)
    .innerJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .where(and(scopeForTraining(viewer), eq(trainingSessions.isArchived, false), gte(trainingSessions.organisedOn, sinceDate)))
    .groupBy(sql`date_trunc('month', ${trainingSessions.organisedOn})`, programmeFields.name);

  const byProgramme = new Map<string, number>();
  for (const row of rows) byProgramme.set(row.fieldName, (byProgramme.get(row.fieldName) ?? 0) + row.n);

  return {
    buckets,
    counts: buckets.map((bucket) => rows.filter((row) => row.month === bucket.key).reduce((sum, row) => sum + row.n, 0)),
    byProgramme: [...byProgramme.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    total: rows.reduce((sum, row) => sum + row.n, 0),
  };
}

/** Views of published material in the last 30 days, per programme. */
export async function getProgrammeTraffic(viewer: Viewer, days = 30): Promise<{ label: string; value: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await db
    .select({ label: programmeFields.name, n: sql<number>`coalesce(sum(${materialViews.viewCount}), 0)::int` })
    .from(materialViews)
    .innerJoin(materials, eq(materials.id, materialViews.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(and(scopeFor(viewer), gte(materialViews.viewedOn, since)))
    .groupBy(programmeFields.name)
    .orderBy(desc(sql`coalesce(sum(${materialViews.viewCount}), 0)`));
  return rows.map((row) => ({ label: row.label, value: row.n }));
}

/** A person's own traffic, for "My activity". Never another person's. */
export async function getMyTraffic(userId: string, days = 30): Promise<{ opens: number; materials: number; downloads: number; days: number }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [viewRow] = await db
    .select({
      opens: sql<number>`coalesce(sum(${materialViews.viewCount}), 0)::int`,
      materials: sql<number>`count(distinct ${materialViews.materialId})::int`,
    })
    .from(materialViews)
    .where(and(eq(materialViews.userId, userId), gte(materialViews.viewedOn, since)));

  const [downloadRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "MATERIAL_FILE_ISSUED"),
        eq(auditLogs.userId, userId),
        gte(auditLogs.createdAt, new Date(`${since}T00:00:00Z`)),
      ),
    );

  return {
    opens: viewRow?.opens ?? 0,
    materials: viewRow?.materials ?? 0,
    downloads: downloadRow?.n ?? 0,
    days,
  };
}

/* ── Published material by type ──────────────────────────────────────────────
 * The donut on both dashboards. Counted through the programme taxonomy, so a
 * scoped facilitator sees their own areas' material and an administrator sees
 * everything — the same shape, honestly narrowed.
 */

export const MATERIAL_TYPE_ORDER = ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const;
export type MaterialTypeKey = (typeof MATERIAL_TYPE_ORDER)[number];

export async function getTypeMix(viewer: Viewer): Promise<{ type: MaterialTypeKey; count: number }[]> {
  const rows = await db
    .select({ type: materials.type, n: sql<number>`count(*)::int` })
    .from(materials)
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
    .where(
      and(
        scopeFor(viewer),
        eq(materials.isPublished, true),
        eq(materials.state, "PUBLISHED"),
        isNotNull(materials.currentVersionId),
      ),
    )
    .groupBy(materials.type);
  const byType = new Map(rows.map((row) => [row.type, row.n]));
  return MATERIAL_TYPE_ORDER.map((type) => ({ type, count: byType.get(type) ?? 0 }));
}

/** Percentage change between the two halves of a series, or null when there is nothing to compare. */
export function periodDelta(values: number[]): number | null {
  if (values.length < 4) return null;
  const half = Math.floor(values.length / 2);
  const previous = values.slice(0, half).reduce((sum, value) => sum + value, 0);
  const current = values.slice(half).reduce((sum, value) => sum + value, 0);
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}
