import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * The public browse error state (13.3): what failed, that nothing was changed,
 * and a retry that does not need JavaScript — a normal link back to the page.
 */
export function BrowseError({ title }: { title?: string }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-8 shadow-panel sm:p-10">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-warn">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        Temporarily unavailable
      </p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {title ?? "We couldn't load these resources."}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Please check your connection and try again. Nothing was changed, and nothing you did caused this.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="." className={buttonClass({ className: "h-11 px-5" })}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </a>
        <Link href="/" className={buttonClass({ variant: "secondary", className: "h-11 px-5" })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
