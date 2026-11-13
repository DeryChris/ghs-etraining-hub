import * as React from "react";
import { cn } from "@/lib/utils";
import { Archive } from "lucide-react";

export interface ListEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  className?: string;
}

export function ListEmptyState({
  title,
  description,
  actionText,
  actionHref,
  className,
}: ListEmptyStateProps) {
  return (
    <div className={cn("rounded-card border border-hairline bg-surface p-8 text-center", className)}>
      <Archive className="w-10 h-10 mx-auto text-ink-muted mb-4" />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="text-ink-muted text-sm mt-2">{description}</p>
      {actionText && actionHref && (
        <a
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-control bg-primary text-primary-ink text-xs font-semibold hover:bg-emerald-400 transition"
        >
          {actionText}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  );
}
