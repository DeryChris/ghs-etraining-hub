import "server-only";
import { cache } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import type { Viewer } from "@/lib/viewer";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";

/**
 * The signed-in identity. It carries the cohort attributes (region, directorate,
 * cadre) that content visibility depends on, so a page never has to re-read the
 * user row to decide whether a material is meant for this learner.
 */
export interface Session extends Viewer {
  /** public.users.id — the identity every foreign key and audit row uses. */
  sub: string;
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
      region: users.region,
      directorate: users.directorate,
      cadre: users.cadre,
    })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (!row) return { state: "unprovisioned", email };
  if (!row.isActive) return { state: "inactive", email };

  return {
    state: "active",
    session: {
      sub: row.id,
      id: row.id,
      role: row.role,
      name: row.fullName,
      staffId: row.ghsStaffId,
      email,
      region: row.region,
      directorate: row.directorate,
      cadre: row.cadre,
    },
  };
});

export async function getSession(): Promise<Session | null> {
  const account = await resolveAccount();
  return account.state === "active" ? account.session : null;
}
