import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  /**
   * Kept so callers do not have to change, but ignored: the illustrated
   * "folder with a plus" panel is gone from the working screens. See below.
   */
  art?: never;
  className?: string;
}

/**
 * The line a list shows when it has nothing in it.
 *
 * It used to be a dashed panel the height of a card, with a folder-and-plus
 * drawing in the middle and three lines of copy under it. On the screens this
 * product is actually used on — a phone, in a ward, with one thing to do — that
 * panel was the loudest object on the page and pushed the rest of the page below
 * the fold to say "there is nothing here". An empty list is a sentence, not a
 * poster: the heading in ink, the reason beside it in muted text, and the one
 * action as a link. Staff noticed the drawing before they noticed the page.
 */
export function ListEmptyState({ title, description, actionText, actionHref, className }: ListEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-card border border-dashed border-hairline bg-surface/40 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>
      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {actionText}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
