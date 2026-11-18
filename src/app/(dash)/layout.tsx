import { redirect } from "next/navigation";
import { AccountBlocked } from "@/components/layout/account-blocked";
import { AppShell } from "@/components/layout/app-shell";
import { countReviewQueue } from "@/lib/server/authoring-queries";
import { countUnreadMessages } from "@/lib/server/messaging-queries";
import { countUnreadNotifications } from "@/lib/server/notification-queries";
import { withinOr } from "@/lib/server/deadline";
import { resolveAccount } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for every signed-in surface. Identity and role are resolved
 * here on the server, so protected HTML is never rendered for anonymous or
 * unprovisioned visitors.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await resolveAccount();
  if (account.state === "anonymous") redirect("/login");
  if (account.state !== "active")
    return <AccountBlocked state={account.state} />;

  const { session } = account;
  const staff = session.role !== "LEARNER";
  /*
   * Badge counts are decoration: the shell must render even if one of them
   * stalls, so each has a deadline and falls back to no badge rather than
   * holding the whole navigation and page behind it.
   */
  const [unreadMessages, unreadNotifications, reviewCount] = await Promise.all([
    withinOr(
      "shell.unread_messages",
      countUnreadMessages(session.sub),
      0,
      5_000,
    ),
    withinOr(
      "shell.unread_notifications",
      countUnreadNotifications(session),
      0,
      5_000,
    ),
    staff
      ? withinOr("shell.review_queue", countReviewQueue(session), 0, 5_000)
      : Promise.resolve(0),
  ]);

  return (
    <AppShell
      user={{
        name: session.name,
        role: session.role,
        staffId: session.staffId,
      }}
      counts={{
        messages: unreadMessages,
        notifications: unreadNotifications,
        reviews: reviewCount,
      }}
    >
      {children}
    </AppShell>
  );
}
