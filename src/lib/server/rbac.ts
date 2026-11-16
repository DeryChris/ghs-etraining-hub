import "server-only";
import { redirect } from "next/navigation";
import { can, scopeAllows, type Action, type Role, type Scope } from "@/lib/rbac/capabilities";
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

export type CapabilityCheck = { ok: true; session: Session } | { ok: false; message: string };

/**
 * Actions: returns a plain-English refusal instead of throwing, so forms can
 * show it inline. Decisions use the role from the database, never the client.
 */
export async function checkCapability(action: Action, scope: Scope = {}): Promise<CapabilityCheck> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Your session has ended. Sign in again to continue." };
  if (!can(session.role, action) || !scopeAllows(session.role, action, scope)) {
    return { ok: false, message: "Your role does not allow this action." };
  }
  return { ok: true, session };
}
