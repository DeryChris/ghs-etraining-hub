import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { log } from "@/lib/server/logger";
import { db } from "@/db/index";
import { programmeFields, materials, programmeAreas } from "@/db/schema";

/** Aggregate counts only. No individual learner or content detail is exposed. */
export async function getPublicStats(): Promise<{ fields: number; areas: number; materials: number }> {
  const [fieldRows, areaRows, materialRows] = await Promise.all([
    db.select({ n: count() }).from(programmeFields).where(eq(programmeFields.isArchived, false)),
    db.select({ n: count() }).from(programmeAreas).where(eq(programmeAreas.isArchived, false)),
    db
      .select({ n: count() })
      .from(materials)
      .where(and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"))),
  ]);
  return {
    fields: fieldRows[0]?.n ?? 0,
    areas: areaRows[0]?.n ?? 0,
    materials: materialRows[0]?.n ?? 0,
  };
}

/**
 * Public counters, cached for five minutes. The marketing site is the only
 * caller, and a stale-by-minutes count is preferable to three aggregates on
 * every visit from a metered mobile connection.
 */
export type PublicStats = { fields: number; areas: number; materials: number };

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
