"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, BellRing, CheckCheck, X } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/server/actions/notifications";

/**
 * The bell, and what it pulls down.
 *
 * A drawer rather than a page: most notices are one sentence long, and making
 * somebody leave the screen they are reading to find that out is the reason
 * notification counts get ignored. Everything here is also on `/notifications`,
 * which is one click away in the footer of the panel — the drawer is a shortcut,
 * never the only route.
 */

export interface DrawerNotice {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  linkUrl: string | null;
  publishedAt: string;
  isRead: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  TRAINING_PUBLISHED: "Training",
  TRAINING_RETURNED: "Review",
  MATERIAL_PUBLISHED: "Library",
  DIRECT_MESSAGE: "Message",
  COMPLAINT_UPDATE: "Complaint",
  ACCOUNT: "Account",
  SYSTEM_MAINTENANCE: "Service",
  MATERIAL_UPDATE: "Library",
  COMMENT_REPLY: "Comment",
  ASSIGNMENT_DUE: "Due",
  REVIEW_REQUEST: "Review",
};

const TYPE_TONE: Record<string, string> = {
  TRAINING_PUBLISHED: "bg-primary/12 text-primary",
  MATERIAL_PUBLISHED: "bg-primary/12 text-primary",
  TRAINING_RETURNED: "bg-warn/15 text-warn",
  COMPLAINT_UPDATE: "bg-info/12 text-info",
  DIRECT_MESSAGE: "bg-accent/20 text-ink",
  ACCOUNT: "bg-surface-2 text-ink-muted",
  REVIEW_REQUEST: "bg-warn/15 text-warn",
};

/** "3 minutes ago", "yesterday" — anything older than a week gets a date. */
function when(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationBell({ items, unread }: { items: DrawerNotice[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Escape and outside-click close it; focus returns to the bell so keyboard
  // users are not dropped at the top of the page.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="notification-drawer"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-control border bg-surface transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          open ? "border-primary/60 text-ink" : "border-hairline text-ink-muted hover:border-primary/40 hover:text-ink"
        }`}
      >
        {unread > 0 ? <BellRing className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-[var(--radius-pill)] bg-primary px-1 text-center text-[10px] font-bold leading-5 text-primary-ink ring-2 ring-canvas">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panel}
          id="notification-drawer"
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(92vw,25rem)] overflow-hidden rounded-card border border-hairline bg-surface shadow-lift"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink">Notifications</h2>
              {unread > 0 && (
                <span className="rounded-[var(--radius-pill)] bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-ink">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <form action={markAllNotificationsReadAction}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-control px-2 py-1.5 text-[11px] font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                    Mark all read
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell className="mx-auto h-6 w-6 text-ink-muted" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-ink">Nothing yet</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                New material, trainings and replies to you will appear here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(60vh,26rem)] divide-y divide-hairline overflow-y-auto overscroll-contain">
              {items.map((notice) => (
                <li key={notice.id}>
                  <Link
                    href={notice.linkUrl ?? "/notifications"}
                    onClick={() => {
                      setOpen(false);
                      // Opening it is reading it; no second gesture required.
                      if (!notice.isRead) void markNotificationReadAction(notice.id);
                    }}
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                      notice.isRead ? "" : "bg-primary/[0.045]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notice.isRead ? "bg-hairline" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[13px] font-bold text-ink">{notice.title}</span>
                        {notice.priority === "HIGH" && !notice.isRead && (
                          <span className="rounded-[var(--radius-pill)] bg-danger/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-danger">
                            New
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-muted">{notice.body}</span>
                      <span className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                        <span
                          className={`rounded-[var(--radius-pill)] px-1.5 py-0.5 ${
                            TYPE_TONE[notice.type] ?? "bg-surface-2 text-ink-muted"
                          }`}
                        >
                          {TYPE_LABEL[notice.type] ?? "Notice"}
                        </span>
                        <span className="text-ink-muted normal-case">{when(notice.publishedAt)}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 border-t border-hairline px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-2"
          >
            Open all notifications
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
