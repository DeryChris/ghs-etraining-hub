"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  FolderTree,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutGrid,
  MapPinned,
  Megaphone,
  MessageSquare,
  MessageSquareWarning,
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
import { BrandMark } from "@/components/brand/brand-mark";
import { NavLinkPending } from "@/components/layout/nav-link-pending";
import { SidebarFlagLine, SidebarStar, SidebarWeave } from "@/components/layout/sidebar-art";
import type { ShellUser } from "@/components/layout/types";
import { ROLE_LABELS } from "@/lib/labels";
import { isActiveHref, navFor, type NavCount, type NavIcon } from "@/lib/nav";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutGrid,
  training: GraduationCap,
  library: BookOpen,
  assessment: ClipboardList,
  messages: MessageSquare,
  notifications: Bell,
  cpd: BarChart3,
  insights: TrendingUp,
  materials: PenLine,
  review: ClipboardCheck,
  notice: Megaphone,
  users: Users,
  geography: MapPinned,
  taxonomy: FolderTree,
  complaint: MessageSquareWarning,
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

/**
 * The signed-in menu, on GHS green.
 *
 * The green is fixed rather than themed (see `.nav-surface` in globals.css): the
 * crest reads correctly on it in both themes, and the menu stops being the only
 * surface that flips colour at night. The active item is a gold bar of the flag
 * with near-black ink — 12:1 contrast — and the decorative weave and star are
 * `aria-hidden` at under 10% so the text keeps 7:1.
 */
export function Sidebar({ user, counts, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();
  const indicatorId = `${useId()}-sidebar-indicator`;
  const groups = navFor(user.role, { unitHead: user.unitHead });

  return (
    <div className="nav-surface relative flex h-full flex-col overflow-hidden">
      <SidebarWeave className="text-white" />
      <SidebarStar className="-bottom-10 -right-10 h-56 w-56 text-[var(--nav-active)]" />

      <div className="relative z-10 flex h-16 items-center justify-between px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--nav-active)]"
          aria-label={`${SITE.name} dashboard`}
        >
          <BrandMark size={34} />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-tight text-[var(--nav-ink)]">{SITE.code}</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--nav-muted)]">
              {SITE.tagline}
            </span>
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-control text-[var(--nav-ink)] hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nav-active)]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>

      <div className="relative z-10 px-5">
        <SidebarFlagLine />
      </div>

      <nav aria-label="Primary" className="nav-scroll relative z-10 flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            <p
              id={`nav-section-${group.id}`}
              className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--nav-active)]"
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
                    {/*
                     * No prefetch. In the App Router a prefetched dynamic route
                     * still renders on the server, and this menu puts a dozen of
                     * them in the viewport at once — a dozen renders, each with a
                     * session lookup and its own queries, competing with the tab
                     * the visitor actually asked for. Navigation is fast enough
                     * without it; the pool is not fast enough with it.
                     */}
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={onNavigate}
                      title={item.hint}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nav-active)]",
                        active
                          ? "text-[var(--nav-active-ink)]"
                          : "text-[var(--nav-muted)] hover:bg-white/10 hover:text-[var(--nav-ink)]",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={indicatorId}
                          aria-hidden
                          className="absolute inset-0 rounded-control bg-[var(--nav-active)] shadow-panel"
                          transition={{ type: "spring", stiffness: 480, damping: 40 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative h-[18px] w-[18px] shrink-0 transition-transform duration-fast",
                          !active && "group-hover:translate-x-0.5",
                        )}
                        aria-hidden
                      />
                      <span className="relative flex-1">{item.label}</span>
                      <NavLinkPending />
                      {count > 0 && (
                        <span
                          className={cn(
                            "relative rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold",
                            active
                              ? "bg-black/10 text-[var(--nav-active-ink)]"
                              : "bg-[var(--nav-active)] text-[var(--nav-active-ink)]",
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

      <div className="nav-divider relative z-10 border-t p-4">
        <div className="nav-wash flex items-center gap-3 rounded-control p-3">
          <BrandMark size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--nav-ink)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--nav-muted)]">
              {user.unitHead && user.role === "FACILITATOR" ? "Unit head" : ROLE_LABELS[user.role]} · {user.staffId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
