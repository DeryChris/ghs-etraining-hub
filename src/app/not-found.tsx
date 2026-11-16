import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmptyArt } from "@/components/brand/illustrations";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="hero-glow grid-texture flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <BrandMark size={52} />
      <EmptyArt variant="search" className="mt-10 h-36 w-auto text-ink-muted" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Error 404</p>
      <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">We could not find that page.</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
        The link may be out of date, or the page has moved. Try the home page or your dashboard.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
          Home page
        </Link>
        <Link href="/dashboard" className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
          Go to dashboard
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </main>
  );
}
