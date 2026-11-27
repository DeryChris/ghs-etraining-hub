/** Ranked horizontal bars; labels carry the real count and hierarchy. */
export interface RankItem {
  label: string;
  value: number;
  color: string;
  /** Optional parent label, e.g. the Programme Area above a Programme Field. */
  hint?: string;
}

export function RankBars({ items, unit }: { items: RankItem[]; unit?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={`${item.hint ?? ""}:${item.label}`} className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink" title={item.label}>{item.label}</p>
              {item.hint && <p className="mt-0.5 truncate text-xs text-ink-muted" title={item.hint}>{item.hint}</p>}
            </div>
            <p className="shrink-0 text-right text-sm font-bold tabular-nums text-ink">
              {item.value.toLocaleString("en-GB")}
              {unit && <span className="ml-1 text-xs font-normal text-ink-muted">{unit}</span>}
            </p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div
              className="h-full rounded-full transition-[width] duration-base ease-out-quint"
              style={{
                width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%`,
                backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${item.color} 68%, var(--surface)), ${item.color})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
