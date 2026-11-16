import "server-only";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { categoryFacilitators } from "@/db/schema";
import {
  can,
  isGlobalForFacilitators,
  scopeAllows,
  type Action,
  type Role,
  type Scope,
} from "@/lib/rbac/capabilities";
import { getSession, type Session } from "@/lib/server/session";

/** Pages: unauthenticated visitors are sent to sign-in. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Pages: a role gate for surfaces whose existence is already known to the user.
 * Wrong role → dashboard with a notice, never a redirect loop.
 */
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/dashboard?notice=forbidden");
  return session;
}

/**
 * A facilitator's authority is the set of categories they are assigned to in
 * category_facilitators — read from the database, never from the request payload
 * (docs/rbac.md §2).
 */
async function facilitatorAssignedTo(userId: string, categoryId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: categoryFacilitators.id })
    .from(categoryFacilitators)
    .where(and(eq(categoryFacilitators.userId, userId), eq(categoryFacilitators.categoryId, categoryId)))
    .limit(1);
  return Boolean(row);
}

export type CapabilityCheck = { ok: true; session: Session } | { ok: false; message: string };

/**
 * Actions: returns a plain-English refusal instead of throwing, so forms can
 * show it inline. Decisions use the role from the database, never the client.
 *
 * When a category-scoped action is attempted by a facilitator, the assignment is
 * verified here rather than trusted from the caller's scope object.
 */
export async function checkCapability(action: Action, scope: Scope = {}): Promise<CapabilityCheck> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session has ended. Sign in again to continue." };
  if (!can(session.role, action) || !scopeAllows(session.role, action, scope)) {
    return { ok: false, message: "Your role does not allow this action." };
  }

  if (session.role === "FACILITATOR" && !isGlobalForFacilitators(action) && scope.categoryId) {
    if (!(await facilitatorAssignedTo(session.sub, scope.categoryId))) {
      return { ok: false, message: "That directorate is not assigned to you." };
    }
  }

  return { ok: true, session };
}
