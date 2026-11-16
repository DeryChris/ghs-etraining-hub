"use server";

import { redirect } from "next/navigation";
import { logAudit } from "@/lib/server/audit";
import { getSession } from "@/lib/server/session";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";

export async function signOutAction(): Promise<void> {
  const session = await getSession();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  if (session) {
    await logAudit({
      actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
      action: "AUTH_SIGNED_OUT",
      entity: "Session",
      entityId: session.sub,
    });
  }
  redirect("/login");
}
