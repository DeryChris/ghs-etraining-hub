import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { categories, materialProgress, materialVersions, materials, spaces, users } from "@/db/schema";
import { PRIORITY_RANK, type MaterialType, type PriorityLevel, type ProgressStatus } from "@/lib/labels";

/*
 * Learners only ever see published, live content.
 * Every condition is built with eq()/and() so columns are table-qualified. Raw column
 * references inside sql`` can render unqualified, which breaks correlated subqueries.
 */
const publishedMaterial = and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"));
const liveSpace = eq(spaces.isArchived, false);
const liveCategory = eq(categories.isArchived, false);

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/* ── Directorates & spaces ─────────────────────────────────────────────── */

export interface CategoryCard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  spaceCount: number;
  materialCount: number;
}

export async function listCategories(): Promise<CategoryCard[]> {
  const spaceTotal = db
    .select({ n: count() })
    .from(spaces)
    .where(and(eq(spaces.categoryId, categories.id), liveSpace));

  const materialTotal = db
    .select({ n: count() })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .where(and(eq(spaces.categoryId, categories.id), liveSpace, publishedMaterial));

  return db
    .select({
      id: categories.id,
      code: categories.code,
      name: categories.name,
      description: categories.description,
      spaceCount: sql<number>`coalesce((${spaceTotal}), 0)::int`,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
    })
    .from(categories)
    .where(liveCategory)
    .orderBy(asc(categories.name));
}

/**
 * The public directorate list, cached for five minutes. Signed-in pages use the
 * uncached listCategories() so a facilitator's publish is visible immediately.
 */
export const listPublicCategories = unstable_cache(listCategories, ["public-categories"], {
  revalidate: 300,
  tags: ["taxonomy"],
});

export async function getCategory(id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), liveCategory))
    .limit(1);
  return row ?? null;
}

export interface SpaceCard {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  materialCount: number;
  completedCount: number;
}

export async function listSpacesInCategory(categoryId: string, userId: string): Promise<SpaceCard[]> {
  const materialTotal = db
    .select({ n: count() })
    .from(materials)
    .where(and(eq(materials.spaceId, spaces.id), publishedMaterial));

  const completedTotal = db
    .select({ n: count() })
    .from(materialProgress)
    .innerJoin(materials, eq(materials.id, materialProgress.materialId))
    .where(
      and(
        eq(materials.spaceId, spaces.id),
        eq(materialProgress.userId, userId),
        eq(materialProgress.status, "COMPLETED"),
        publishedMaterial,
      ),
    );

  return db
    .select({
      id: spaces.id,
      slug: spaces.slug,
      title: spaces.title,
      description: spaces.description,
      materialCount: sql<number>`coalesce((${materialTotal}), 0)::int`,
      completedCount: sql<number>`coalesce((${completedTotal}), 0)::int`,
    })
    .from(spaces)
    .where(and(eq(spaces.categoryId, categoryId), liveSpace))
    .orderBy(asc(spaces.title));
}

export async function getSpaceBySlug(slug: string) {
  const [row] = await db
    .select({ space: spaces, category: categories })
    .from(spaces)
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .where(and(eq(spaces.slug, slug), liveSpace, liveCategory))
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
  requiresAcknowledgement: boolean;
  estimatedMinutes: number | null;
  cpdCreditsX10: number;
  authorName: string;
  status: ProgressStatus;
  watchedPercent: number;
  acknowledgedAt: Date | null;
}

export async function listMaterialsInSpace(spaceId: string, userId: string): Promise<MaterialListItem[]> {
  return db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      requiresAcknowledgement: materials.requiresAcknowledgement,
      estimatedMinutes: materials.estimatedMinutes,
      cpdCreditsX10: materials.cpdCreditsX10,
      authorName: users.fullName,
      status: sql<ProgressStatus>`coalesce(${materialProgress.status}, 'NOT_STARTED')`,
      watchedPercent: sql<number>`coalesce(${materialProgress.watchedPercent}, 0)`,
      acknowledgedAt: materialProgress.acknowledgedAt,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, userId)))
    .where(and(eq(materials.spaceId, spaceId), publishedMaterial))
    .orderBy(asc(materials.title));
}

export interface LibraryItem extends MaterialListItem {
  spaceSlug: string;
  spaceTitle: string;
  categoryName: string;
}

export async function searchLibrary(input: {
  query: string;
  type: MaterialType | null;
  userId: string;
}): Promise<LibraryItem[]> {
  const term = input.query.trim().slice(0, 120);
  const pattern = `%${escapeLike(term)}%`;

  return db
    .select({
      id: materials.id,
      title: materials.title,
      summary: materials.summary,
      type: materials.type,
      priority: materials.priority,
      requiresAcknowledgement: materials.requiresAcknowledgement,
      estimatedMinutes: materials.estimatedMinutes,
      cpdCreditsX10: materials.cpdCreditsX10,
      authorName: users.fullName,
      status: sql<ProgressStatus>`coalesce(${materialProgress.status}, 'NOT_STARTED')`,
      watchedPercent: sql<number>`coalesce(${materialProgress.watchedPercent}, 0)`,
      acknowledgedAt: materialProgress.acknowledgedAt,
      spaceSlug: spaces.slug,
      spaceTitle: spaces.title,
      categoryName: categories.name,
    })
    .from(materials)
    .innerJoin(users, eq(users.id, materials.authorId))
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, input.userId)))
    .where(
      and(
        publishedMaterial,
        liveSpace,
        liveCategory,
        input.type ? eq(materials.type, input.type) : undefined,
        term ? or(ilike(materials.title, pattern), ilike(materials.summary, pattern)) : undefined,
      ),
    )
    .orderBy(asc(materials.title))
    .limit(120);
}

export async function getMaterialDetail(materialId: string, userId: string) {
  const [row] = await db
    .select({
      material: materials,
      space: spaces,
      category: categories,
      authorName: users.fullName,
      version: materialVersions,
      progress: materialProgress,
    })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .innerJoin(users, eq(users.id, materials.authorId))
    .leftJoin(materialVersions, eq(materialVersions.id, materials.currentVersionId))
    .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, userId)))
    .where(and(eq(materials.id, materialId), publishedMaterial, liveSpace, liveCategory))
    .limit(1);
  return row ?? null;
}

/* ── Learner dashboard ─────────────────────────────────────────────────── */

export interface MandatoryItem {
  id: string;
  title: string;
  priority: PriorityLevel;
  estimatedMinutes: number | null;
  spaceTitle: string;
  spaceSlug: string;
  /** Acknowledged earlier, but a newer version was published since. */
  reacknowledgementRequired: boolean;
}

export interface ContinueItem {
  id: string;
  title: string;
  type: MaterialType;
  watchedPercent: number;
  spaceTitle: string;
  spaceSlug: string;
}

export interface LearnerDashboard {
  creditsX10: number;
  completedCount: number;
  inProgressCount: number;
  mandatoryTotal: number;
  mandatoryOutstanding: MandatoryItem[];
  continueLearning: ContinueItem[];
}

export async function getLearnerDashboard(userId: string): Promise<LearnerDashboard> {
  const [totalsRows, mandatoryRows, continueRows] = await Promise.all([
    db
      .select({
        creditsX10: sql<number>`coalesce(sum(case when ${materialProgress.status} = 'COMPLETED' then ${materials.cpdCreditsX10} else 0 end), 0)::int`,
        completedCount: sql<number>`(count(*) filter (where ${materialProgress.status} = 'COMPLETED'))::int`,
        inProgressCount: sql<number>`(count(*) filter (where ${materialProgress.status} = 'IN_PROGRESS'))::int`,
      })
      .from(materialProgress)
      .innerJoin(materials, eq(materials.id, materialProgress.materialId))
      .where(eq(materialProgress.userId, userId)),
    db
      .select({
        id: materials.id,
        title: materials.title,
        priority: materials.priority,
        estimatedMinutes: materials.estimatedMinutes,
        currentVersionId: materials.currentVersionId,
        spaceTitle: spaces.title,
        spaceSlug: spaces.slug,
        acknowledgedAt: materialProgress.acknowledgedAt,
        acknowledgedVersionId: materialProgress.materialVersionId,
      })
      .from(materials)
      .innerJoin(spaces, eq(spaces.id, materials.spaceId))
      .innerJoin(categories, eq(categories.id, spaces.categoryId))
      .leftJoin(materialProgress, and(eq(materialProgress.materialId, materials.id), eq(materialProgress.userId, userId)))
      .where(and(publishedMaterial, liveSpace, liveCategory, eq(materials.requiresAcknowledgement, true))),
    db
      .select({
        id: materials.id,
        title: materials.title,
        type: materials.type,
        watchedPercent: materialProgress.watchedPercent,
        spaceTitle: spaces.title,
        spaceSlug: spaces.slug,
      })
      .from(materialProgress)
      .innerJoin(materials, eq(materials.id, materialProgress.materialId))
      .innerJoin(spaces, eq(spaces.id, materials.spaceId))
      .innerJoin(categories, eq(categories.id, spaces.categoryId))
      .where(
        and(
          eq(materialProgress.userId, userId),
          eq(materialProgress.status, "IN_PROGRESS"),
          publishedMaterial,
          liveSpace,
          liveCategory,
        ),
      )
      .orderBy(desc(materialProgress.updatedAt))
      .limit(4),
  ]);

  const totals = totalsRows[0];
  const mandatoryOutstanding = mandatoryRows
    .filter((row) => !(row.acknowledgedAt !== null && row.acknowledgedVersionId === row.currentVersionId))
    .map((row) => ({
      id: row.id,
      title: row.title,
      priority: row.priority,
      estimatedMinutes: row.estimatedMinutes,
      spaceTitle: row.spaceTitle,
      spaceSlug: row.spaceSlug,
      reacknowledgementRequired: row.acknowledgedAt !== null,
    }))
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.title.localeCompare(b.title));

  return {
    creditsX10: totals?.creditsX10 ?? 0,
    completedCount: totals?.completedCount ?? 0,
    inProgressCount: totals?.inProgressCount ?? 0,
    mandatoryTotal: mandatoryRows.length,
    mandatoryOutstanding,
    continueLearning: continueRows,
  };
}

/* ── Personal analytics & transcript ───────────────────────────────────── */

export interface CompletionRecord {
  materialId: string;
  title: string;
  type: MaterialType;
  creditsX10: number;
  completedAt: Date | null;
  spaceTitle: string;
}

export async function listCompletions(userId: string, limit = 500): Promise<CompletionRecord[]> {
  return db
    .select({
      materialId: materials.id,
      title: materials.title,
      type: materials.type,
      creditsX10: materials.cpdCreditsX10,
      completedAt: materialProgress.completedAt,
      spaceTitle: spaces.title,
    })
    .from(materialProgress)
    .innerJoin(materials, eq(materials.id, materialProgress.materialId))
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .where(and(eq(materialProgress.userId, userId), eq(materialProgress.status, "COMPLETED")))
    .orderBy(desc(materialProgress.completedAt))
    .limit(limit);
}
