export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-base ease-out-quint" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-muted">{percent}%</span>
    </div>
  );
}
