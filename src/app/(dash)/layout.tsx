import { redirect } from "next/navigation";
import { AccountBlocked } from "@/components/layout/account-blocked";
import { AppShell } from "@/components/layout/app-shell";
import { countUnreadMessages } from "@/lib/server/messaging-queries";
import { countUnreadNotifications } from "@/lib/server/notification-queries";
import { resolveAccount } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for every signed-in surface. Identity and role are resolved
 * here on the server, so protected HTML is never rendered for anonymous or
 * unprovisioned visitors.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await resolveAccount();
  if (account.state === "anonymous") redirect("/login");
  if (account.state !== "active") return <AccountBlocked state={account.state} />;

  const { session } = account;
  const [unreadMessages, unreadNotifications] = await Promise.all([
    countUnreadMessages(session.sub),
    countUnreadNotifications(session),
  ]);

  return (
    <AppShell
      user={{ name: session.name, role: session.role, staffId: session.staffId }}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
