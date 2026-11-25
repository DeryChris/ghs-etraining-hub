"use server";

import { redirect } from "next/navigation";
import { logAudit } from "@/lib/server/audit";
import { getSession, clearSessionCookie } from "@/lib/server/session";

export async function signOutAction(): Promise<void> {
  const session = await getSession();

  if (session) {
    await logAudit({
      actor: {
        sub: session.sub,
        role: session.role,
        name: session.name,
        staffId: session.staffId,
      },
      action: "AUTH_SIGNED_OUT",
      entity: "Session",
      entityId: session.sub,
    });
  }

  await clearSessionCookie();
  redirect("/login");
}
