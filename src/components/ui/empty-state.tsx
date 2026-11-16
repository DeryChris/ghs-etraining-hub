import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyArt, type EmptyArtVariant } from "@/components/brand/illustrations";
import { cn } from "@/lib/utils";

export interface ListEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  art?: EmptyArtVariant;
  className?: string;
}

/** A calm, illustrated empty state that names the next step. */
export function ListEmptyState({ title, description, actionText, actionHref, art = "folder", className }: ListEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-card border border-dashed border-hairline bg-surface/60 px-6 py-12 text-center", className)}>
      <EmptyArt variant={art} className="h-24 w-auto text-ink-muted" />
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      </div>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-pill)] bg-primary px-5 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary/90"
        >
          {actionText}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
