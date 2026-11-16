import { Bell } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityChip } from "@/components/ui/priority-chip";
import { formatDateTime } from "@/lib/format";
import { safeAppLink } from "@/lib/links";
import { notificationTypeLabel, PRIORITY_LEVELS, type PriorityLevel } from "@/lib/labels";
import { listNotifications } from "@/lib/server/notification-queries";
import { requireSession } from "@/lib/server/rbac";
import { markAllNotificationsReadAction } from "@/lib/server/actions/notifications";
import Link from "next/link";

export default async function NotificationsPage() {
  const session = await requireSession();
  const items = await listNotifications(session.sub, 100);
  const unread = items.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Official notices"
        title="Notifications"
        description={unread > 0 ? `${unread} unread ${unread === 1 ? "notice" : "notices"}.` : "You are up to date."}
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Marking…">
                Mark all as read
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <ListEmptyState title="No notifications" description="Official notices, protocol updates and messages addressed to you will appear here." />
      ) : (
        <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
          {items.map((item) => {
            const link = safeAppLink(item.linkUrl);
            const showPriority = (PRIORITY_LEVELS as readonly string[]).includes(item.priority) && item.priority !== "LOW" && item.priority !== "MEDIUM";
            return (
              <li key={item.id} className={`flex gap-4 p-5 ${item.isRead ? "" : "bg-primary/5"}`}>
                <span className="mt-1 shrink-0">
                  <Bell className={`h-4 w-4 ${item.isRead ? "text-ink-muted" : "text-primary"}`} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <span>{notificationTypeLabel(item.type)}</span>
                    {!item.isRead && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-ink">Unread</span>}
                    {showPriority && <PriorityChip priority={item.priority as PriorityLevel} />}
                  </div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink-muted">
                    <time dateTime={item.publishedAt.toISOString()}>{formatDateTime(item.publishedAt)}</time>
                    {link && (
                      <Link href={link} className="font-semibold text-primary underline-offset-4 hover:underline">
                        Open
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
