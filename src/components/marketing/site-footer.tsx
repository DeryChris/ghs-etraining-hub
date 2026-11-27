import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-mark";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/programmes", label: "Programme Areas" },
      { href: "/catalogue", label: "Resource Library" },
      { href: "/programmes", label: "Training Materials" },
    ],
  },
  {
    title: "Information",
    links: [
      { href: "/about", label: "About the Library" },
      { href: "/help", label: "Help Centre" },
      { href: "/contact", label: "Contact and Support" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/privacy", label: "Privacy Notice" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-hairline bg-surface">
      <div className="flag-stripe absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:px-10">
        <div className="space-y-5">
          <BrandLockup size={44} />
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{SITE.purpose}</p>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border border-primary/40 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-ink"
          >
            Sign in to {SITE.name}
          </Link>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{column.title}</p>
            <ul className="mt-4 space-y-3">
              {column.links.map((link, index) => (
                <li key={`${link.href}-${index}`}>
                  <Link href={link.href} className="text-sm font-medium text-ink transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} Ghana Health Service – Upper West Regional Health Directorate. All rights reserved.</p>
          <p>An institutional digital platform for authorised personnel.</p>
        </div>
      </div>
    </footer>
  );
}
