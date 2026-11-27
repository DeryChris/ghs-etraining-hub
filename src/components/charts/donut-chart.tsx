/**
 * Share-of-total donut. Arcs are drawn with stroke-dasharray on a circle, which
 * needs no path maths and renders identically in every engine; the centre states
 * the total, and every slice has a `<title>`.
 */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const SIZE = 200;
const RADIUS = 78;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ slices, centreLabel }: { slices: DonutSlice[]; centreLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const visibleSlices = slices.filter((slice) => slice.value > 0);
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-40 w-40 shrink-0" role="img" aria-label={`${total} ${centreLabel}`}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--chart-grid)" strokeWidth={STROKE} />
          {total > 0 &&
            visibleSlices.map((slice) => {
              const length = (slice.value / total) * CIRCUMFERENCE;
              const dash = `${Math.max(0, length - 2)} ${CIRCUMFERENCE - Math.max(0, length - 2)}`;
              const element = (
                <circle
                  key={slice.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                >
                  <title>{`${slice.label}: ${slice.value}`}</title>
                </circle>
              );
              offset += length;
              return element;
            })}
        </g>
        <text x={SIZE / 2} y={SIZE / 2 - 2} textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">
          {total}
        </text>
        <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
          {centreLabel}
        </text>
      </svg>

      <ul className="min-w-[10rem] flex-1 space-y-2 text-sm">
        {visibleSlices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden />
              {slice.label}
            </span>
            <span className="tabular-nums font-semibold text-ink-muted">
              {slice.value}
              {total > 0 ? ` · ${Math.round((slice.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
