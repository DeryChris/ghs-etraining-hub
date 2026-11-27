import "server-only";
import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { materials, programmeAreas, programmeFields } from "@/db/schema";
import { isStaffRole, type Viewer } from "@/lib/viewer";

/*
 * The predicates that decide what a viewer may see. Extracted from the learner
 * queries so every surface that reads published material (the library, insights, the public
 * programme list) answers the question the same way — a difference between two
 * copies of this rule is an access-control bug, not a display quirk.
 *
 * Columns are always referenced through the drizzle table objects, never as raw
 * sql`` fragments: unqualified column names break correlated subqueries.
 *
 * Since ADR-0014 there is one taxonomy. In the user-facing hierarchy,
 * `programme_fields` stores parent Programme Areas and `programme_areas` stores
 * child Programme Fields; materials point to the child. "Live" means both
 * parent and child are not archived, and audience targeting is read from the
 * child Programme Field.
 */

/** Only live, published material — drafts belong to the authoring surfaces. */
export const publishedMaterial = and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"));

export const liveArea = eq(programmeAreas.isArchived, false);
export const liveField = eq(programmeFields.isArchived, false);

/**
 * Audience targeting: a Programme Field with no audience is for everyone; a
 * Programme Field that names a region, directorate or grade is for that cohort
 * only. Staff roles are exempt (they may review content outside their own
 * cohort), and a viewer with no cohort attribute matches untargeted content only.
 */
export function audienceFor(viewer: Viewer | null): SQL | undefined {
  if (viewer && isStaffRole(viewer.role)) return undefined;
  return and(
    or(isNull(programmeAreas.audienceRegion), eq(programmeAreas.audienceRegion, viewer?.region ?? "")),
    or(isNull(programmeAreas.audienceDirectorate), eq(programmeAreas.audienceDirectorate, viewer?.directorate ?? "")),
    or(isNull(programmeAreas.audienceGrade), eq(programmeAreas.audienceGrade, viewer?.grade ?? "")),
  );
}

/** Restricted parent Programme Areas are hidden from Staff accounts. */
export function fieldFor(viewer: Viewer | null): SQL | undefined {
  if (viewer && isStaffRole(viewer.role)) return undefined;
  return eq(programmeFields.isRestricted, false);
}

/** Everything a material needs to be visible: published, in a live area of a live field. */
export function visibleMaterial(viewer: Viewer | null): SQL | undefined {
  return and(publishedMaterial, liveArea, liveField, audienceFor(viewer), fieldFor(viewer));
}
