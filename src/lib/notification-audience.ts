import type { Viewer } from "@/lib/viewer";

/**
 * A notice can be narrowed to a cohort without addressing it to named people.
 * `notifications.audience_filter` holds only the keys that were chosen; a
 * missing key means "any", and a null filter means everyone (docs/architecture.md §9).
 *
 * Matching is intentionally strict: if a notice is limited to the Pharmacy
 * directorate, a learner whose directorate is blank does not see it. Guessing in
 * the other direction would leak a notice to the wrong cohort.
 */
export const AUDIENCE_KEYS = ["region", "directorate", "grade", "district"] as const;
export type AudienceKey = (typeof AUDIENCE_KEYS)[number];
export type AudienceFilter = Partial<Record<AudienceKey, string>>;

/**
 * Where a key's value comes from on the viewer.
 *
 * Region, directorate and grade are cohort *names* copied from the staff sheet,
 * so the comparison is string against string. A district is different: names
 * repeat and people mistype them, so the filter stores the district's row id and
 * is compared with the viewer's `districtId`. That is the same key the District
 * HR boundary uses — one definition of "which district" for the whole app.
 */
function viewerValue(key: AudienceKey, viewer: Pick<Viewer, "region" | "directorate" | "grade" | "districtId">): string | null | undefined {
  return key === "district" ? viewer.districtId : viewer[key];
}

/** Drops empty values so `{ region: "" }` does not silently mean "nobody". */
export function compactAudience(input: Partial<Record<AudienceKey, string | null | undefined>>): AudienceFilter | null {
  const filter: AudienceFilter = {};
  for (const key of AUDIENCE_KEYS) {
    const value = input[key]?.trim();
    if (value) filter[key] = value;
  }
  return Object.keys(filter).length ? filter : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAudienceFilter(value: unknown): value is AudienceFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([key, entry]) => {
    if (!(AUDIENCE_KEYS as readonly string[]).includes(key)) return false;
    if (typeof entry !== "string" || entry.length === 0) return false;
    // A district is an id: anything else would compare a name against an id and
    // silently match nobody, which reads on screen as "the notice reached no one".
    return key === "district" ? UUID.test(entry) : true;
  });
}

export function matchesAudience(
  filter: AudienceFilter | null | undefined,
  viewer: Pick<Viewer, "region" | "directorate" | "grade" | "districtId">,
): boolean {
  if (!filter) return true;
  return AUDIENCE_KEYS.every((key) => {
    const wanted = filter[key];
    if (!wanted) return true;
    return viewerValue(key, viewer) === wanted;
  });
}

/**
 * Human summary for the compose form and the staff-facing history.
 *
 * A district is stored as an id, so it is only worth printing when the caller
 * can supply the name; without one the sentence stays true — "one district" —
 * rather than putting a uuid in front of a person.
 */
export function describeAudience(
  filter: AudienceFilter | null | undefined,
  districtNames?: ReadonlyMap<string, string>,
): string {
  if (!filter) return "Everyone";
  const parts = AUDIENCE_KEYS.flatMap((key) => {
    const value = filter[key];
    if (!value) return [];
    if (key !== "district") return [value];
    return [districtNames?.get(value) ?? "one district"];
  });
  return parts.length ? parts.join(" · ") : "Everyone";
}
