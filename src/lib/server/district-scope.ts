import "server-only";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/index";
import { districts, users } from "@/db/schema";
import { isDistrictScoped } from "@/lib/rbac/capabilities";
import type { Session } from "@/lib/server/session";

/**
 * The boundary around a District HR.
 *
 * A district HR is an administrator for one district. Every action they take on a
 * person, a facility, a notice or a complaint is checked against this module, and
 * the check is made against the database on each call: the district they hold can
 * be changed between two requests, and a session cookie issued an hour ago would
 * still say the old one.
 *
 * Two failure modes are worth naming, because both look like working software:
 *
 *   * **No district assigned.** A row promoted to DISTRICT_HR without a
 *     `district_id` would otherwise be scoped by `district_id IS NULL`, which
 *     matches every person whose district is unknown — a sweep of all accounts
 *     with an unparseable district. The scope therefore refuses to build a filter
 *     at all when there is no district, and every caller treats that as "no".
 *   * **Scoping by name.** `users.district` is free text from the staff sheet. A
 *     boundary drawn on it would leak "Wa" into "Wa East". The boundary is
 *     `users.district_id`, a foreign key, and the text column is only ever shown.
 */

export interface DistrictScope {
  /** True when this session's authority is limited to one district. */
  scoped: boolean;
  /** The district row, or null — which for a scoped actor means "cannot act". */
  districtId: string | null;
}

export function districtScopeOf(session: Pick<Session, "role" | "districtId">): DistrictScope {
  const scoped = isDistrictScoped(session.role);
  return { scoped, districtId: session.districtId ?? null };
}

/** The refusal every scoped action returns when the caller has no district. */
export const NO_DISTRICT_MESSAGE =
  "Your account is not attached to a district yet. An administrator has to set it before you can act.";

/**
 * A predicate over `users` for lists: everything, for an administrator; their
 * district, for a district HR; nothing, for anyone scoped without a district.
 */
export function districtUserFilter(scope: DistrictScope): SQL | undefined {
  if (!scope.scoped) return undefined;
  if (!scope.districtId) return sql`false`;
  return eq(users.districtId, scope.districtId);
}

/** Is this row inside the caller's district? Administrators are never limited. */
export async function isUserInScope(
  session: Pick<Session, "role" | "districtId">,
  userId: string,
): Promise<boolean> {
  const scope = districtScopeOf(session);
  if (!scope.scoped) return true;
  if (!scope.districtId) return false;

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.districtId, scope.districtId)))
    .limit(1);
  return Boolean(row);
}

/** The district row itself, for a heading ("Wa Municipal"), or null. */
export async function districtName(districtId: string | null): Promise<string | null> {
  if (!districtId) return null;
  const [row] = await db
    .select({ name: districts.name })
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);
  return row?.name ?? null;
}
