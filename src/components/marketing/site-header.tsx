"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PRIMARY_NAV } from "@/lib/site";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaHref = signedIn ? "/dashboard" : "/login";
  const ctaLabel = signedIn ? "Open dashboard" : "Sign in";

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-base ${
        scrolled ? "glass border-b border-hairline shadow-panel" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:h-18 lg:px-10">
        <Link href="/" className="rounded-control focus-visible:outline-2 focus-visible:outline-primary" aria-label="GHS-ELN home">
          <Wordmark size={34} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-control px-3.5 py-2 text-sm font-semibold transition-colors duration-fast ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="site-nav-underline"
                    aria-hidden
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 42 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden md:inline-flex" />
          <Link
            href={ctaHref}
            className="hidden items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-4 py-2 text-sm font-semibold text-primary-ink transition-transform duration-fast hover:-translate-y-0.5 active:translate-y-0 md:inline-flex"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-surface text-ink lg:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-hairline bg-canvas lg:hidden"
          >
            <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 sm:px-8">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center justify-between rounded-control px-3 text-base font-semibold text-ink hover:bg-surface-2"
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-ink-muted" aria-hidden />
                </Link>
              ))}
              <div className="mt-3 flex items-center justify-between gap-3">
                <ThemeToggle />
                <Link
                  href={ctaHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-5 text-sm font-semibold text-primary-ink"
                >
                  {ctaLabel}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
