"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";
import { Sidebar, type SidebarCounts } from "@/components/layout/sidebar";
import type { ShellUser } from "@/components/layout/types";
import { SITE } from "@/lib/site";

export function AppShell({
  user,
  counts,
  children,
}: {
  user: ShellUser;
  counts: SidebarCounts;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  /**
   * Desktop rail width, remembered between visits.
   *
   * Facilitators work through lists with the menu open; administrators on a
   * laptop spend the day in tables and want the width. Starting from "expanded"
   * means a first-time visitor still sees what the menu contains — the memory
   * only takes over once somebody has made the choice.
   */
  const [collapsed, setCollapsed] = useState(false);

  // The server cannot know what this browser chose, so the rail always renders
  // expanded first and adopts the stored width after hydration — reading it
  // during render would be a hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ghs.nav.collapsed");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, which only exists on the client
      if (stored === "1") setCollapsed(true);
    } catch {
      // Private mode, or storage disabled: the default stands.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("ghs.nav.collapsed", next ? "1" : "0");
      } catch {
        // Nothing to do: the choice simply will not be remembered.
      }
      return next;
    });
  }, []);

  // Escape closes the mobile drawer. The listener only exists while the drawer is open.
  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const closeNav = () => setNavOpen(false);
  const sidebarProps = { user, counts, collapsed, onToggleCollapse: toggleCollapsed };
  const railWidth = collapsed ? "md:pl-[76px]" : "md:pl-64";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-ink"
      >
        Skip to main content
      </a>

      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden border-r border-ghs-green/30 shadow-panel transition-[width] duration-200 md:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <Sidebar {...sidebarProps} />
      </aside>

      <AnimatePresence>
        {navOpen && (
          <motion.button
            key="scrim"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeNav}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 cursor-default bg-canvas/70 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside
        id="primary-nav"
        inert={!navOpen}
        initial={false}
        animate={{ x: navOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-hidden rounded-none shadow-lift md:hidden"
      >
        <Sidebar {...sidebarProps} onNavigate={closeNav} onClose={closeNav} />
      </motion.aside>

      <div className={`transition-[padding] duration-200 ${railWidth}`}>
        <Header user={user} unreadNotifications={counts.notifications} onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 py-6 focus:outline-none md:px-8 md:py-10">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="mx-auto max-w-[1200px] px-4 pb-10 text-xs text-ink-muted md:px-8">
          {SITE.name} · Internal platform. Access is monitored and recorded.
        </footer>
      </div>
    </div>
  );
}
