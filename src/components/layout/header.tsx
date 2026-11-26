"use client";

import Link from "next/link";
import {
  ChevronDown,
  Menu,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ShellUser } from "@/components/layout/types";
import { NotificationBell, type DrawerNotice } from "@/components/layout/notification-drawer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { inputClass } from "@/components/ui/input";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { staffRoleOf } from "@/lib/rbac/capabilities";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { signOutAction } from "@/lib/server/actions/auth";

const TITLES = /^(dr|mr|mrs|ms|miss|prof|sr|sister|nurse|madam|mama)\.?\s+/i;

/** "Dr. Kwabena Mensah" → "KM". Falls back to one letter, never to an empty badge. */
function initialsOf(name: string): string {
  const parts = name.replace(TITLES, "").split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function Header({
  user,
  unreadNotifications,
  notifications,
  onOpenNav,
}: {
  user: ShellUser;
  unreadNotifications: number;
  notifications: DrawerNotice[];
  onOpenNav: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-hairline">
      <div className="flex h-16 items-center gap-2 px-4 md:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          aria-controls="primary-nav"
          aria-label="Open navigation menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-ink-muted hover:text-ink md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <form
          action="/catalogue"
          method="get"
          role="search"
          className="relative hidden w-full max-w-lg md:block"
        >
          <label htmlFor="global-search" className="sr-only">
            Search materials
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search protocols, videos and labs"
            className={`${inputClass} h-11 rounded-[var(--radius-pill)] pl-10`}
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <ThemeToggle />

          <NotificationBell items={notifications} unread={unreadNotifications} />

          <span
            aria-hidden
            className="mx-1 hidden h-7 w-px bg-hairline sm:block"
          />

          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

/**
 * The account card. A `<details>` keeps it working without JavaScript; the
 * effect below only adds the behaviour a menu should have and a disclosure does
 * not — close on outside click or Escape, and reopen closed after signing out.
 */
function AccountMenu({ user }: { user: ShellUser }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const found = detailsRef.current;
    if (!found) return;
    const element: HTMLDetailsElement = found;

    function onPointerDown(event: PointerEvent) {
      if (!element.open) return;
      if (!element.contains(event.target as Node)) element.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && element.open) {
        element.open = false;
        element.querySelector<HTMLElement>("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const initials = initialsOf(user.name);

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-pill)] border border-hairline bg-surface pl-1 pr-1 transition-colors duration-fast hover:border-primary/40 [&::-webkit-details-marker]:hidden"
        aria-label={`Account menu for ${user.name}`}
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(150deg,#006B3F,#003D24)] text-[11px] font-bold tracking-wide text-white ring-1 ring-primary/25"
        >
          {initials}
        </span>
        <span className="hidden min-w-0 pl-0.5 pr-1 text-left sm:block">
          <span className="block max-w-[10.5rem] truncate text-[13px] font-semibold leading-tight text-ink">
            {user.name}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium uppercase leading-tight tracking-[0.07em] text-ink-muted">
            {STAFF_ROLE_LABELS[staffRoleOf({ role: user.role, unitHead: user.unitHead })]}
          </span>
        </span>
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors group-open:bg-surface-2 group-open:text-ink"
        >
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-base group-open:rotate-180" />
        </span>
        <span className="sr-only">Open account menu</span>
      </summary>

      <div className="surface-card absolute right-0 z-40 mt-2 w-72 overflow-hidden p-0 shadow-lift">
        <div className="flex items-center gap-3 border-b border-hairline bg-surface-2/60 p-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(150deg,#006B3F,#003D24)] text-sm font-bold text-white ring-1 ring-primary/25"
          >
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {user.name}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-ink-muted">
              {user.staffId}
            </span>
            <span className="mt-1 inline-flex rounded-[var(--radius-pill)] bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {STAFF_ROLE_LABELS[staffRoleOf({ role: user.role, unitHead: user.unitHead })]}
            </span>
          </span>
        </div>

        <div className="p-1.5">
          <Link
            href="/analytics"
            className="flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-sm font-medium text-ink hover:bg-surface-2"
          >
            <UserRound className="h-4 w-4 text-ink-muted" aria-hidden />
            My activity
          </Link>
          {user.role === "SYSTEM_ADMIN" && (
            <Link
              href="/settings"
              className="flex min-h-10 items-center gap-2.5 rounded-control px-2.5 text-sm font-medium text-ink hover:bg-surface-2"
            >
              <Settings className="h-4 w-4 text-ink-muted" aria-hidden />
              Settings
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-2">
          <span className="text-xs font-semibold text-ink-muted">
            Appearance
          </span>
          <ThemeToggle />
        </div>

        <form action={signOutAction} className="border-t border-hairline p-1.5">
          <SignOutButton />
        </form>
      </div>
    </details>
  );
}
