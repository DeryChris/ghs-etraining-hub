import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** An illustration for the thing being described — a programme field, say. */
  icon?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {icon && <div className="mt-0.5 hidden shrink-0 sm:block">{icon}</div>}
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-ink-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
