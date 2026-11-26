import { redirect } from "next/navigation";
import { AccountBlocked } from "@/components/layout/account-blocked";
import { DatabaseUnavailable } from "@/components/layout/database-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { countReviewQueue } from "@/lib/server/authoring-queries";
import { countUnreadMessages } from "@/lib/server/messaging-queries";
import { countUnreadNotifications, listNotifications } from "@/lib/server/notification-queries";
import { connectionErrorCode, databaseTarget } from "@/lib/db-target";
import { within, withinOr } from "@/lib/server/deadline";
import { log } from "@/lib/server/logger";
import { resolveAccount, type AccountState } from "@/lib/server/session";

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
  /*
   * The shell cannot draw until it knows who is asking, so this one query is on
   * the critical path of every signed-in route. When the database is unreachable
   * it used to sit here indefinitely — the visitor saw the loading skeleton and
   * nothing else. A deadline turns that into an explanation.
   */
  let account: AccountState;
  try {
    account = await within("shell.session", resolveAccount(), 8_000);
  } catch (error) {
    log.error({
      event: "shell.session_unavailable",
      error,
      code: connectionErrorCode(error),
    });
    return (
      <DatabaseUnavailable
        target={databaseTarget(process.env.DATABASE_URL)}
        code={connectionErrorCode(error)}
      />
    );
  }

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
  const [unreadMessages, unreadNotifications, reviewCount, drawerNotices] = await Promise.all([
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
    // The drawer shows the newest few and links to the tab for the rest; if it
    // cannot be read the bell still opens, with an honest empty state.
    withinOr("shell.drawer_notices", listNotifications(session, 6), [], 5_000),
  ]);

  return (
    <AppShell
      user={{
        name: session.name,
        role: session.role,
        staffId: session.staffId,
        unitHead: session.unitHead,
      }}
      counts={{
        messages: unreadMessages,
        notifications: unreadNotifications,
        reviews: reviewCount,
      }}
      notifications={drawerNotices.map((notice) => ({
        id: notice.id,
        title: notice.title,
        body: notice.body,
        type: notice.type,
        priority: notice.priority,
        linkUrl: notice.linkUrl,
        publishedAt: notice.publishedAt.toISOString(),
        isRead: notice.isRead,
      }))}
    >
      {children}
    </AppShell>
  );
}
