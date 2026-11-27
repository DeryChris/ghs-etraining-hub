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
export const AUDIENCE_KEYS = ["region", "directorate", "grade"] as const;
export type AudienceKey = (typeof AUDIENCE_KEYS)[number];
export type AudienceFilter = Partial<Record<AudienceKey, string>>;

/** Drops empty values so `{ region: "" }` does not silently mean "nobody". */
export function compactAudience(input: Partial<Record<AudienceKey, string | null | undefined>>): AudienceFilter | null {
  const filter: AudienceFilter = {};
  for (const key of AUDIENCE_KEYS) {
    const value = input[key]?.trim();
    if (value) filter[key] = value;
  }
  return Object.keys(filter).length ? filter : null;
}

export function isAudienceFilter(value: unknown): value is AudienceFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([key, entry]) => (AUDIENCE_KEYS as readonly string[]).includes(key) && typeof entry === "string" && entry.length > 0,
  );
}

export function matchesAudience(
  filter: AudienceFilter | null | undefined,
  viewer: Pick<Viewer, "region" | "directorate" | "grade">,
): boolean {
  if (!filter) return true;
  return AUDIENCE_KEYS.every((key) => {
    const wanted = filter[key];
    if (!wanted) return true;
    return viewer[key] === wanted;
  });
}

/** Human summary for the compose form and the staff-facing history. */
export function describeAudience(filter: AudienceFilter | null | undefined): string {
  if (!filter) return "Everyone";
  const parts = AUDIENCE_KEYS.flatMap((key) => (filter[key] ? [filter[key] as string] : []));
  return parts.length ? parts.join(" · ") : "Everyone";
}
