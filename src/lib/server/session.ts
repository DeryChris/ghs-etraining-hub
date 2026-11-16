import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import type { Role } from "@/lib/rbac/capabilities";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";

export interface Session {
  /** public.users.id — the identity every foreign key and audit row uses. */
  sub: string;
  role: Role;
  name: string;
  staffId: string;
  email: string;
}

export type AccountState =
  | { state: "anonymous" }
  | { state: "unprovisioned"; email: string }
  | { state: "inactive"; email: string }
  | { state: "active"; session: Session };

/**
 * Identity comes from Supabase Auth ("who you are"). Authority comes from
 * public.users ("what you may do"). user_metadata is writable by the user
 * themselves, so it is never consulted for role or access.
 */
export const resolveAccount = cache(async (): Promise<AccountState> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const authUser = data.user;
  if (error || !authUser?.email) return { state: "anonymous" };

  const email = authUser.email.toLowerCase();
  const [row] = await db
    .select({
      id: users.id,
      role: users.role,
      fullName: users.fullName,
      ghsStaffId: users.ghsStaffId,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!row) return { state: "unprovisioned", email };
  if (!row.isActive) return { state: "inactive", email };

  return {
    state: "active",
    session: { sub: row.id, role: row.role, name: row.fullName, staffId: row.ghsStaffId, email },
  };
});

export async function getSession(): Promise<Session | null> {
  const account = await resolveAccount();
  return account.state === "active" ? account.session : null;
}
