import Link from "next/link";
import { Wordmark } from "@/components/brand/brand-mark";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "/programmes", label: "Programmes" },
      { href: "/catalogue", label: "Library" },
      { href: "/help", label: "Complaint Hub" },
    ],
  },
  {
    title: "Organisation",
    links: [
      { href: "/about", label: `About ${SITE.code}` },
      { href: "/contact", label: "Contact and support" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms", label: "Terms of use" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-hairline bg-surface">
      <div className="flag-stripe absolute inset-x-0 top-0 h-1" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div className="space-y-5">
          <Wordmark size={40} />
          <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
            The material from every GHS training programme, filed by programme field and area, versioned, and open to
            staff in all {SITE.regionCount} regions.
          </p>
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
              {column.links.map((link) => (
                <li key={link.href}>
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
          <p>
            © {new Date().getFullYear()} Ghana Health Service · {SITE.fullName}
          </p>
          <p>Internal platform for GHS staff. Access is monitored and recorded.</p>
        </div>
      </div>
    </footer>
  );
}
