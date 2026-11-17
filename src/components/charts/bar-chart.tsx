/**
 * Stacked monthly bars. Each segment carries a `<title>`, and the stack total is
 * labelled above the bar, so the chart is readable without a legend lookup.
 */
export interface BarSeries {
  label: string;
  color: string;
  values: number[];
}

const WIDTH = 720;
const PADDING = { top: 16, right: 8, bottom: 26, left: 34 };

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return magnitude * 10;
}

export function BarChart({
  labels,
  series,
  height = 220,
  showTotals = true,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  showTotals?: boolean;
}) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;
  const count = Math.max(1, labels.length);
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0));
  const max = niceMax(Math.max(1, ...totals));
  const slot = plotWidth / count;
  const barWidth = Math.min(38, slot * 0.62);
  const gridValues = [0, 0.5, 1].map((fraction) => Math.round(max * fraction));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img" aria-label="Monthly totals">
      {gridValues.map((value) => {
        const y = PADDING.top + plotHeight - (value / max) * plotHeight;
        return (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeWidth={1 / 2}
              strokeDasharray={value === 0 ? undefined : "3 4"}
            />
            <text x={PADDING.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">
              {value}
            </text>
          </g>
        );
      })}

      {labels.map((label, index) => {
        const centre = PADDING.left + slot * index + slot / 2;
        let cursor = PADDING.top + plotHeight;
        return (
          <g key={label + index}>
            {series.map((item, seriesIndex) => {
              const value = item.values[index] ?? 0;
              if (value <= 0) return null;
              const segmentHeight = (value / max) * plotHeight;
              cursor -= segmentHeight;
              const isTop = seriesIndex === series.length - 1;
              return (
                <rect
                  key={item.label}
                  x={centre - barWidth / 2}
                  y={cursor}
                  width={barWidth}
                  height={Math.max(1, segmentHeight)}
                  rx={isTop ? 3 : 0}
                  fill={item.color}
                >
                  <title>{`${label} · ${item.label}: ${value}`}</title>
                </rect>
              );
            })}
            {showTotals && totals[index] > 0 && (
              <text
                x={centre}
                y={cursor - 5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="currentColor"
                opacity="0.75"
              >
                {totals[index]}
              </text>
            )}
            <text x={centre} y={height - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
