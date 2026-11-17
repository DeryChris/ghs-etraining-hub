import "server-only";
import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { categories, materials, spaces } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/*
 * The predicates that decide what a viewer may see. Extracted from the learner
 * queries so every catalogue surface (library, assessments, insights, public
 * programme list) answers the question the same way — a difference between two
 * copies of this rule is an access-control bug, not a display quirk.
 *
 * Columns are always referenced through the drizzle table objects, never as raw
 * sql`` fragments: unqualified column names break correlated subqueries.
 */

/** Only live, published material — drafts belong to the authoring surfaces. */
export const publishedMaterial = and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"));

export const liveSpace = eq(spaces.isArchived, false);
export const liveCategory = eq(categories.isArchived, false);

/**
 * Audience targeting: a space with no audience is for everyone; a space that
 * names a region, directorate or cadre is for that cohort only. Staff are exempt
 * (they review content outside their own cohort), and a viewer with no cohort
 * attribute is compared against "" so it matches untargeted content only.
 */
export function audienceFor(viewer: Viewer | null): SQL | undefined {
  if (viewer && isStaffRole(viewer.role)) return undefined;
  return and(
    or(isNull(spaces.audienceRegion), eq(spaces.audienceRegion, viewer?.region ?? "")),
    or(isNull(spaces.audienceDirectorate), eq(spaces.audienceDirectorate, viewer?.directorate ?? "")),
    or(isNull(spaces.audienceCadre), eq(spaces.audienceCadre, viewer?.cadre ?? "")),
  );
}

/** Restricted directorates (sensitive clinical programmes) are staff-only. */
export function categoryFor(viewer: Viewer | null): SQL | undefined {
  if (viewer && isStaffRole(viewer.role)) return undefined;
  return eq(categories.isRestricted, false);
}
