import "server-only";
import { getSession } from "@/lib/server/session";
import { can, scopeAllows, type Action, type Role } from "@/lib/rbac/capabilities";
import { notFound, redirect } from "next/navigation";

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

export async function requireSession(): Promise<{
  sub: string; role: Role; name: string; staffId: string;
}> {
  const session = await getSession();
  return {
    sub: session.sub,
    role: session.role as Role,
    name: session.name,
    staffId: session.staffId,
  };
}

export async function requireCapability(action: Action, scope?: Record<string, unknown>) {
  const session = await requireSession();
  const allowed = can(session.role, action);
  if (!allowed) {
    throw new ForbiddenError(`Insufficient capability: ${action}`);
  }
  const scopeAllowed = scopeAllows(session.role, action, scope as never);
  if (!scopeAllowed) {
    throw new ForbiddenError(`Scope mismatch for: ${action}`);
  }
  return session;
}

export function requireSessionOr404(): never {
  notFound();
}

export function requireSessionOr403(): never {
  throw new ForbiddenError("Forbidden");
}

export function requireRoleOrRedirect(allowedRoles: Role[]) {
  return async () => {
    try {
      const session = await requireSession();
      if (!allowedRoles.includes(session.role)) {
        redirect("/dashboard?error=unauthorized");
      }
      return session;
    } catch {
      redirect("/login");
    }
  };
}
