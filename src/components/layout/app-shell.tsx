"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import type { ShellUser } from "@/components/layout/types";

export function AppShell({
  user,
  unreadMessages,
  unreadNotifications,
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadNotifications: number;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

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
  const sidebarProps = { user, unreadMessages, unreadNotifications };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-ink"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-hairline bg-surface/70 backdrop-blur md:block">
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
        className="surface-card fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] rounded-none border-y-0 border-l-0 shadow-lift md:hidden"
      >
        <Sidebar {...sidebarProps} onNavigate={closeNav} onClose={closeNav} />
      </motion.aside>

      <div className="md:pl-64">
        <Header user={user} unreadNotifications={unreadNotifications} onOpenNav={() => setNavOpen(true)} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 py-6 focus:outline-none md:px-8 md:py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-[1200px] px-4 pb-10 text-xs text-ink-muted md:px-8">
          GHS-ELN · Internal platform. Access is monitored and recorded.
        </footer>
      </div>
    </div>
  );
}
