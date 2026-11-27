"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/brand-mark";
import { AccountMenu } from "@/components/layout/header";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { NotificationBell, type DrawerNotice } from "@/components/layout/notification-drawer";
import { PageTransition } from "@/components/layout/page-transition";
import type { ShellUser } from "@/components/layout/types";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { inputClass } from "@/components/ui/input";
import { isActiveHref, LEARNER_NAV, type NavCount } from "@/lib/nav";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The shell a member of staff sees: a top bar and five links, the way the public
 * site and every learning platform people already use are laid out.
 *
 * Why this exists beside `AppShell` (ADR‑0027). The sidebar is a good home for
 * somebody who administers the library — it holds a dozen destinations and a
 * working width that can be collapsed and remembered. A learner has five, two of
 * which are a reading list and a mailbox, and the rail made the product read as a
 * management console. So the learner's screens are wide, calm, and reachable from
 * a phone with a thumb: the bottom bar is the same five links, not a hamburger
 * that hides them.
 *
 * Both shells receive exactly the same props from `(dash)/layout.tsx`, so a page
 * does not know which one is drawing it.
 */
export interface LearnerShellCounts {
  messages: number;
  notifications: number;
}

export function LearnerShell({
  user,
  counts,
  notifications,
  children,
}: {
  user: ShellUser;
  counts: LearnerShellCounts;
  /** The newest few notices, for the drawer under the bell. */
  notifications: DrawerNotice[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  /** The learner's two counters. A learner never sees the review queue. */
  const badge = (count: NavCount | undefined) =>
    count === "messages" ? counts.messages : count === "notifications" ? counts.notifications : 0;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-ink"
      >
        Skip to main content
      </a>

      <header className="glass sticky top-0 z-40 border-b border-hairline">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            aria-label={`${SITE.name} — dashboard`}
            className="shrink-0 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Wordmark size={32} />
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 lg:flex">
            {LEARNER_NAV.map((item) => {
              const active = isActiveHref(pathname, item.href);
              const Icon = NAV_ICONS[item.icon];
              const unread = badge(item.count);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 rounded-[var(--radius-pill)] px-3.5 py-2 text-sm font-semibold transition-colors duration-fast",
                    active ? "bg-primary/10 text-primary" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                  {unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-ink">
                      {unread > 9 ? "9+" : unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <form
              action="/trainings"
              method="get"
              role="search"
              className="relative hidden w-64 xl:block"
            >
              <label htmlFor="learner-search" className="sr-only">
                Search the library
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
              <input
                id="learner-search"
                name="q"
                type="search"
                placeholder="Search the library"
                className={`${inputClass} h-10 rounded-[var(--radius-pill)] pl-10 text-sm`}
              />
            </form>

            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              aria-expanded={searchOpen}
              aria-controls="learner-search-mobile"
              aria-label={searchOpen ? "Close search" : "Open search"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-surface text-ink-muted hover:text-ink xl:hidden"
            >
              {searchOpen ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
            </button>

            <ThemeToggle className="hidden sm:inline-flex" />
            <NotificationBell items={notifications} unread={counts.notifications} />
            <AccountMenu user={user} />
          </div>
        </div>

        {searchOpen && (
          <div id="learner-search-mobile" className="border-t border-hairline bg-canvas px-4 pb-4 pt-3 sm:px-6 xl:hidden">
            <form action="/trainings" method="get" role="search" className="relative">
              <label htmlFor="learner-search-small" className="sr-only">
                Search the library
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
              <input
                id="learner-search-small"
                name="q"
                type="search"
                autoFocus
                placeholder="Search documents, videos and practicals"
                className={`${inputClass} h-11 rounded-[var(--radius-pill)] pl-10`}
              />
            </form>
          </div>
        )}
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 focus:outline-none sm:px-6 md:pb-14 md:pt-8 lg:px-8"
      >
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-24 text-xs text-ink-muted sm:px-6 md:pb-8 lg:px-8">
        {SITE.name} · Internal platform. Access is monitored and recorded.
      </footer>

      {/* The same five links, within thumb reach. A phone is how most staff will
          meet this product, and a menu that hides the destinations behind a
          hamburger is the thing every learning app stopped doing. */}
      <nav
        aria-label="Main, compact"
        className="glass fixed inset-x-0 bottom-0 z-40 border-t border-hairline pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
          {LEARNER_NAV.map((item) => {
            const active = isActiveHref(pathname, item.href);
            const Icon = NAV_ICONS[item.icon];
            const unread = badge(item.count);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-control px-1 py-2 text-[10px] font-semibold transition-colors duration-fast",
                    active ? "text-primary" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden />
                    {unread > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-ink">
                        {unread > 9 ? "9+" : unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="learner-tab-underline"
                      aria-hidden
                      className="h-0.5 w-6 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 42 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
