import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { log } from "@/lib/server/logger";
import { db } from "@/db/index";
import { programmeFields, programmeAreas, regions, trainingResources, trainingSessions } from "@/db/schema";
import { UPPER_WEST_REGION_CODE } from "@/db/data/geography";
import { audienceFor, fieldFor, liveArea, liveField } from "@/lib/server/visibility";

/**
 * Aggregate counts only. No individual learner or content detail is exposed.
 *
 * The taxonomy and material aggregates use the same visibility predicates as
 * public browse. Training totals include published, unarchived sessions linked
 * to the Upper West Region only. They are database-derived aggregates, not
 * seed/demo figures; the cached response can be up to five minutes old.
 *
 * Naming note: the interface calls the parent taxonomy node a **Programme Area**
 * and the child node a **Programme Field** (see src/db/schema.ts — the stored
 * tables are `programme_fields` → `programme_areas` → `materials`, so the keys
 * below map the database's field table to the interface's "Programme Area").
 */
export async function getPublicStats(): Promise<{
  programmeAreas: number;
  programmeFields: number;
  /** Files attached to published trainings — there is no separate material count. */
  files: number;
  trainings: number;
}> {
  const [areaRows, fieldRows, fileRows, trainingRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(programmeFields)
      .where(and(liveField, fieldFor(null))),
    db
      .select({ n: count() })
      .from(programmeAreas)
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .where(and(liveArea, liveField, fieldFor(null), audienceFor(null))),
    db
      .select({ n: count() })
      .from(trainingResources)
      .innerJoin(trainingSessions, eq(trainingSessions.id, trainingResources.trainingId))
      .innerJoin(regions, eq(regions.id, trainingSessions.regionId))
      .where(
        and(
          eq(trainingSessions.reviewState, "PUBLISHED"),
          eq(trainingSessions.isArchived, false),
          eq(regions.code, UPPER_WEST_REGION_CODE),
        ),
      ),
    db
      .select({ n: count() })
      .from(trainingSessions)
      .innerJoin(regions, eq(regions.id, trainingSessions.regionId))
      .where(
        and(
          eq(trainingSessions.reviewState, "PUBLISHED"),
          eq(trainingSessions.isArchived, false),
          eq(regions.code, UPPER_WEST_REGION_CODE),
        ),
      ),
  ]);
  return {
    programmeAreas: areaRows[0]?.n ?? 0,
    programmeFields: fieldRows[0]?.n ?? 0,
    files: fileRows[0]?.n ?? 0,
    trainings: trainingRows[0]?.n ?? 0,
  };
}

/**
 * Public counters, cached for five minutes. The marketing site is the only
 * caller, and a stale-by-minutes count is preferable to four aggregates on
 * every visit from a metered mobile connection.
 */
export type PublicStats = Awaited<ReturnType<typeof getPublicStats>>;

/**
 * Cached public counters, with a deliberate soft failure: if the database is
 * unreachable the marketing page renders without numbers instead of an error
 * page. The status is still visible to operators via /api/health and the log.
 */
export const getPublicStatsCached = unstable_cache(
  async (): Promise<PublicStats | null> => {
    try {
      return await getPublicStats();
    } catch (error) {
      log.error({ event: "public_stats.unavailable", error });
      return null;
    }
  },
  ["public-stats"],
  { revalidate: 300, tags: ["taxonomy"] },
);
