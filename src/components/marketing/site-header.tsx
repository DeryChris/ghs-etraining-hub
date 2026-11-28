"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { primaryNavFor, SITE } from "@/lib/site";

/**
 * The public header: a floating bar that sits over the page at rest and picks
 * up a translucent surface, hairline and soft shadow once the page scrolls
 * under it. The full institutional lockup appears from `xl`; below that the
 * compact wordmark keeps the bar from crowding the navigation items.
 */
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


  const elevated = scrolled || open;
  const ctaHref = signedIn ? "/dashboard" : "/login";
  const ctaLabel = signedIn ? "Open dashboard" : "Sign in";
  const navItems = primaryNavFor(signedIn);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto max-w-7xl">
        <div
          className={`flex h-16 items-center justify-between gap-4 rounded-[var(--radius-hero)] border px-4 transition-[background-color,box-shadow,border-color] duration-base sm:px-5 ${
            elevated ? "glass border-hairline shadow-panel" : "border-transparent bg-transparent"
          }`}
        >
          <Link href="/" className="rounded-control focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${SITE.name} home`}>
            <BrandLockup size={40} className="hidden xl:inline-flex" />
            <BrandLockup size={32} compact className="xl:hidden" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-control px-3 py-2 text-sm font-semibold transition-colors duration-fast ${
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
              className="mt-2 overflow-hidden rounded-[var(--radius-hero)] border border-hairline bg-surface shadow-panel lg:hidden"
            >
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
                {navItems.map((item) => (
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
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline px-3 pt-4 pb-1">
                  <ThemeToggle />
                  <Link
                    href={ctaHref}
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-5 text-sm font-semibold text-primary-ink"
                  >
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
