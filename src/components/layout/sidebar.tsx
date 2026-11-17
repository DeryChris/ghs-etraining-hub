"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderKanban,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  PenLine,
  Settings,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { BrandMark, Wordmark } from "@/components/brand/brand-mark";
import type { ShellUser } from "@/components/layout/types";
import { ROLE_LABELS } from "@/lib/labels";
import { isActiveHref, navFor, type NavCount, type NavIcon } from "@/lib/nav";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutGrid,
  programmes: FolderKanban,
  library: BookOpen,
  assessment: ClipboardList,
  messages: MessageSquare,
  notifications: Bell,
  cpd: BarChart3,
  insights: TrendingUp,
  materials: PenLine,
  sessions: CalendarDays,
  review: ClipboardCheck,
  notice: Megaphone,
  users: Users,
  settings: Settings,
};

export interface SidebarCounts {
  messages: number;
  notifications: number;
  reviews: number;
}

interface SidebarProps {
  user: ShellUser;
  counts: SidebarCounts;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ user, counts, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const indicatorId = `${useId()}-sidebar-indicator`;
  const groups = navFor(user.role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="rounded-control focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`${SITE.name} dashboard`}
        >
          <Wordmark size={32} />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>
      <div className="flag-stripe mx-5 h-0.5 rounded-full opacity-80" aria-hidden />

      <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            <p
              id={`nav-section-${group.id}`}
              className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted"
            >
              {group.label}
            </p>
            <ul aria-labelledby={`nav-section-${group.id}`} className="space-y-1">
              {group.items.map((item) => {
                const active = isActiveHref(pathname, item.href);
                const count = item.count ? counts[item.count as NavCount] : 0;
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={item.hint}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors duration-fast",
                        active ? "text-primary-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={indicatorId}
                          aria-hidden
                          className="absolute inset-0 rounded-control bg-primary shadow-panel"
                          transition={{ type: "spring", stiffness: 480, damping: 40 }}
                        />
                      )}
                      <Icon className="relative h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className="relative flex-1">{item.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "relative rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold",
                            active ? "bg-primary-ink text-primary" : "bg-primary text-primary-ink",
                          )}
                          aria-label={`${count} ${item.count === "reviews" ? "waiting for review" : "unread"}`}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-4">
        <div className="flex items-center gap-3 rounded-control bg-surface-2 p-3">
          <BrandMark size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">
              {ROLE_LABELS[user.role]} ┬╖ {user.staffId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
