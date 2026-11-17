/**
 * Multi-series area chart, rendered as SVG on the server.
 *
 * Deliberately static: no resize observers, no tooltip library. Each point
 * carries a native `<title>`, so hovering (or focusing on a touch device with
 * TalkBack) still reads "12 Mar · Views 34". The y-axis is scaled to a round
 * maximum so gridlines land on numbers a human can use.
 */
export interface AreaSeries {
  label: string;
  color: string;
  values: number[];
}

export interface AreaChartProps {
  labels: string[];
  series: AreaSeries[];
  height?: number;
  /** Unit appended in tooltips, e.g. "views". */
  unit?: string;
}

const WIDTH = 720;
const PADDING = { top: 12, right: 8, bottom: 26, left: 34 };

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return magnitude * 10;
}

export function AreaChart({ labels, series, height = 220, unit }: AreaChartProps) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((item) => item.values)));
  const count = Math.max(1, labels.length);

  const x = (index: number) => PADDING.left + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));
  const labelEvery = Math.ceil(count / 7);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${series.map((item) => item.label).join(" and ")} over time`}
    >
      <defs>
        {series.map((item, index) => (
          <linearGradient key={item.label} id={`area-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={item.color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={item.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>

      {gridValues.map((value) => (
        <g key={value}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={y(value)}
            y2={y(value)}
            stroke="var(--chart-grid)"
            strokeWidth={1 / 2}
            strokeDasharray={value === 0 ? undefined : "3 4"}
          />
          <text x={PADDING.left - 8} y={y(value) + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">
            {value}
          </text>
        </g>
      ))}

      {series.map((item, seriesIndex) => {
        const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
        const areaPath = `M${x(0)},${y(0)} L${points.split(" ").join(" L")} L${x(item.values.length - 1)},${y(0)} Z`;
        return (
          <g key={item.label}>
            <path d={areaPath} fill={`url(#area-fill-${seriesIndex})`} />
            <polyline
              points={points}
              fill="none"
              stroke={item.color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {item.values.map((value, index) => (
              <circle key={index} cx={x(index)} cy={y(value)} r={2.2} fill={item.color}>
                <title>{`${labels[index] ?? ""} · ${item.label}: ${value}${unit ? ` ${unit}` : ""}`}</title>
              </circle>
            ))}
          </g>
        );
      })}

      {labels.map((label, index) =>
        index % labelEvery === 0 ? (
          <text
            key={label + index}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.6"
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
