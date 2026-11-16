import Link from "next/link";
import { Bell, ChevronDown, LogOut, Menu, Search, User } from "lucide-react";
import type { ShellUser } from "@/components/layout/types";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { inputClass } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/labels";
import { signOutAction } from "@/lib/server/actions/auth";

export function Header({
  user,
  unreadNotifications,
  onOpenNav,
}: {
  user: ShellUser;
  unreadNotifications: number;
  onOpenNav: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-30 border-b border-hairline">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          aria-controls="primary-nav"
          aria-label="Open navigation menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-ink-muted hover:text-ink md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <form action="/library" method="get" role="search" className="relative hidden w-full max-w-lg md:block">
          <label htmlFor="global-search" className="sr-only">
            Search materials
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search protocols, videos and labs"
            className={`${inputClass} h-11 rounded-[var(--radius-pill)] pl-10`}
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />

          <Link
            href="/notifications"
            aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-surface text-ink-muted transition-colors hover:text-ink"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-[var(--radius-pill)] bg-primary px-1 text-center text-[10px] font-bold leading-5 text-primary-ink ring-2 ring-canvas">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>

          <details className="group relative">
            <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-hairline bg-surface px-2.5 text-ink hover:border-primary/40 [&::-webkit-details-marker]:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold leading-tight">{user.name}</span>
                <span className="block text-[10px] leading-tight text-ink-muted">{ROLE_LABELS[user.role]}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink-muted transition-transform duration-base group-open:rotate-180" aria-hidden />
              <span className="sr-only">Account menu</span>
            </summary>
            <div className="surface-card absolute right-0 z-40 mt-2 w-64 p-2 shadow-lift">
              <div className="border-b border-hairline px-3 pb-3 pt-2">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {user.staffId} · {ROLE_LABELS[user.role]}
                </p>
              </div>
              <div className="border-b border-hairline py-3 sm:hidden">
                <ThemeToggle className="mx-3" />
              </div>
              <form action={signOutAction} className="pt-2">
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink hover:bg-surface-2"
                >
                  <LogOut className="h-4 w-4 text-ink-muted" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
