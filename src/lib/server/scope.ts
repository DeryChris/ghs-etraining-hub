import "server-only";
import { and, eq, exists, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { categories, categoryFacilitators } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/**
 * Row scope for any query that reads across programmes.
 *
 * A SYSTEM_ADMIN is unscoped. A facilitator is limited to the categories they
 * are assigned to in `category_facilitators` — read from the database, never from
 * the request (docs/rbac.md §2). A learner gets `false`, because these queries
 * back staff surfaces; anything a learner may read goes through the catalogue
 * predicates in `visibility.ts` instead.
 */
export function scopeFor(viewer: Viewer): SQL | undefined {
  if (!isStaffRole(viewer.role)) return sql`false`;
  if (viewer.role === "SYSTEM_ADMIN") return undefined;
  return exists(
    db
      .select({ one: sql`1` })
      .from(categoryFacilitators)
      .where(and(eq(categoryFacilitators.categoryId, categories.id), eq(categoryFacilitators.userId, viewer.id))),
  );
}
