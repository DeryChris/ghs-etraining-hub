import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** A headline number, its own trend and a restrained series-colour accent. */
export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Text under the number, e.g. "Published in your assigned scope". */
  hint?: string;
  /** Percentage change against the immediately preceding equivalent period. */
  delta?: number | null;
  /** Used instead of a percentage when the previous period had no activity. */
  deltaLabel?: string | null;
  /** Points for the sparkline — same period as the headline number. */
  spark?: number[];
  /** CSS colour for the icon chip, sparkline and trend indicator. */
  color: string;
  className?: string;
}

function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  if (values.length < 2) return <span className="h-9" aria-hidden />;
  const width = 120;
  const height = 36;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-[120px]" aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill={`url(#${id})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ icon: Icon, label, value, hint, delta, deltaLabel, spark, color, className }: KpiCardProps) {
  const gradientId = `kpi-spark-${useId().replace(/:/g, "")}`;
  const hasChange = typeof delta === "number" || Boolean(deltaLabel);
  const up = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "relative isolate flex h-full min-h-[172px] flex-col overflow-hidden rounded-card border border-hairline bg-surface p-5 shadow-panel transition-[border-color,box-shadow] duration-base hover:shadow-lift",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 z-0 h-32 w-36 rotate-12 rounded-[42%_58%_67%_33%/55%_41%_59%_45%] blur-2xl"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)` }}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-ink-muted">{label}</p>
          <p className="mt-3 text-4xl font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {typeof value === "number" ? value.toLocaleString("en-GB") : value}
          </p>
        </div>
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`, color }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {hint && <p className="relative z-10 mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p>}

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 pt-4">
        <Sparkline values={spark ?? []} color={color} id={gradientId} />
        {hasChange && (
          <span
            className="inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
              color,
            }}
          >
            {typeof delta === "number" ? (
              up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Activity className="h-3.5 w-3.5" aria-hidden />
            )}
            {typeof delta === "number" ? `${up ? "+" : ""}${delta.toFixed(1)}%` : deltaLabel}
            <span className="sr-only">versus the previous equivalent period</span>
          </span>
        )}
      </div>
    </div>
  );
}

/** The grid the cards sit in, so every page uses the same rhythm. */
export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section aria-label="Headline numbers" className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {children}
    </section>
  );
}
