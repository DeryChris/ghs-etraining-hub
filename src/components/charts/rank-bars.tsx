/**
 * Ranked horizontal bars for "which programme gets the most traffic". Colour
 * carries identity (each programme keeps its colour across the page), length
 * carries the number, and the number is printed — so the chart is readable
 * without estimating a bar against an axis.
 */
export interface RankItem {
  label: string;
  value: number;
  color: string;
  hint?: string;
}

export function RankBars({ items, unit }: { items: RankItem[]; unit?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink" title={item.label}>
              {item.label}
              {item.hint && <span className="ml-1.5 text-xs text-ink-muted">{item.hint}</span>}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-ink">
              {item.value}
              {unit ? <span className="ml-1 text-xs font-normal text-ink-muted">{unit}</span> : null}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className="h-full rounded-full transition-[width] duration-base ease-out-quint"
              style={{ width: `${Math.max(2, Math.round((item.value / max) * 100))}%`, backgroundColor: item.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
