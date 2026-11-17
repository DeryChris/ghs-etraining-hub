import "server-only";
import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { categories, certificates, materialProgress, materials, spaces, users } from "@/db/schema";
import { scopeFor } from "@/lib/server/scope";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/*
 * The numbers behind /insights and the strip on the dashboard.
 *
 * One module, one scope rule: an administrator sees the whole service, a
 * facilitator sees the programmes they are assigned to, and nobody sees another
 * person's learning record here (that lives in the transcript and the directory).
 * Counts are aggregated in SQL — the point of this page is to avoid loading rows.
 */

const WINDOW_DAYS = 30;

export interface ProgrammeInsight {
  id: string;
  name: string;
  code: string;
  published: number;
  inReview: number;
  spaces: number;
}

export interface Insights {
  /** "all" for an administrator, "assigned" for a facilitator. */
  scope: "all" | "assigned";
  people: { learners: number; facilitators: number; admins: number; total: number } | null;
  catalogue: { programmes: number; spaces: number; published: number; inReview: number; draft: number; archived: number };
  learning: { completionsInWindow: number; certificatesInWindow: number; certificatesTotal: number; verifications: number | null };
  /** Every programme in scope, busiest first, capped for the page. */
  programmes: ProgrammeInsight[];
  /** Programmes in scope with nothing published — the coverage gap. */
  gaps: { id: string; name: string }[];
  windowDays: number;
}

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export async function getInsights(viewer: Viewer): Promise<Insights> {
  if (!isStaffRole(viewer.role)) {
    throw new Error("Insights are a staff surface; learners read their own record on /analytics.");
  }

  const since = windowStart();
  const scope = scopeFor(viewer);
  const scopedCategories = and(scope, eq(categories.isArchived, false));

  const programmeRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      code: categories.code,
      published: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'PUBLISHED')::int`,
      inReview: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'IN_REVIEW')::int`,
      spaces: sql<number>`count(distinct ${spaces.id})::int`,
    })
    .from(categories)
    .leftJoin(spaces, and(eq(spaces.categoryId, categories.id), eq(spaces.isArchived, false)))
    .leftJoin(materials, eq(materials.spaceId, spaces.id))
    .where(scopedCategories)
    .groupBy(categories.id, categories.name, categories.code)
    .orderBy(desc(sql`count(distinct ${materials.id}) filter (where ${materials.state} = 'PUBLISHED')`), categories.name);

  const [catalogueRow] = await db
    .select({
      programmes: sql<number>`count(distinct ${categories.id})::int`,
      spaces: sql<number>`count(distinct ${spaces.id})::int`,
      published: sql<number>`count(distinct ${materials.id}) filter (where ${materials.isPublished} and ${materials.state} = 'PUBLISHED')::int`,
      inReview: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'IN_REVIEW')::int`,
      draft: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'DRAFT')::int`,
      archived: sql<number>`count(distinct ${materials.id}) filter (where ${materials.state} = 'ARCHIVED')::int`,
    })
    .from(categories)
    .leftJoin(spaces, and(eq(spaces.categoryId, categories.id), eq(spaces.isArchived, false)))
    .leftJoin(materials, eq(materials.spaceId, spaces.id))
    .where(scopedCategories);

  const [completionsRow] = await db
    .select({ n: count() })
    .from(materialProgress)
    .innerJoin(materials, eq(materials.id, materialProgress.materialId))
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .where(and(scope, gte(materialProgress.completedAt, since), isNotNull(materialProgress.completedAt)));

  const [certificatesRow] = await db
    .select({
      recent: sql<number>`count(*) filter (where ${certificates.issuedAt} >= ${since.toISOString()})::int`,
      total: count(),
      verifications: sql<number>`coalesce(sum(${certificates.verificationCount}), 0)::int`,
    })
    .from(certificates)
    .innerJoin(materials, eq(materials.id, certificates.materialId))
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .where(scope);

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
    catalogue: {
      programmes: catalogueRow?.programmes ?? 0,
      spaces: catalogueRow?.spaces ?? 0,
      published: catalogueRow?.published ?? 0,
      inReview: catalogueRow?.inReview ?? 0,
      draft: catalogueRow?.draft ?? 0,
      archived: catalogueRow?.archived ?? 0,
    },
    learning: {
      completionsInWindow: completionsRow?.n ?? 0,
      certificatesInWindow: certificatesRow?.recent ?? 0,
      certificatesTotal: certificatesRow?.total ?? 0,
      verifications: viewer.role === "SYSTEM_ADMIN" ? (certificatesRow?.verifications ?? 0) : null,
    },
    programmes,
    gaps: programmeRows.filter((row) => row.published === 0).map(({ id, name }) => ({ id, name })),
    windowDays: WINDOW_DAYS,
  };
}
