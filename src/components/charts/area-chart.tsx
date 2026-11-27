"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Responsive multi-series area chart. The SVG keeps a pixel-sized viewBox after
 * measuring its container, so axis labels stay legible on a phone as well as a
 * desktop. Each week/day is a keyboard and touch target with one shared tooltip
 * for all visible series; the text table remains available from ChartCard.
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
  /** Colour a point in the past only — the current period is drawn solid. */
  dots?: boolean;
}

/** Monotone cubic interpolation: smooth without inventing peaks between values. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  let d = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const FALLBACK_WIDTH = 720;
const PADDING = { top: 18, right: 14, bottom: 38, left: 48 };

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return magnitude * 10;
}

function bucketDescription(label: string, series: AreaSeries[], index: number): string {
  const values = series.map((item) => `${item.label}: ${(item.values[index] ?? 0).toLocaleString("en-GB")}`);
  return `${label}. ${values.join(". ")}.`;
}

export function AreaChart({ labels, series, height = 300, dots = true }: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bucketRefs = useRef<(SVGRectElement | null)[]>([]);
  const [chartWidth, setChartWidth] = useState(FALLBACK_WIDTH);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState<boolean[]>(() => series.map(() => true));
  const id = useId().replace(/:/g, "");
  const descriptionId = `${id}-description`;
  const tooltipId = `${id}-tooltip`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const width = Math.round(container.getBoundingClientRect().width);
      if (width > 0) setChartWidth((current) => (current === width ? current : width));
    };
    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const activeSeries = series.filter((_, index) => visible[index] !== false);
  const plotWidth = Math.max(1, chartWidth - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);
  const count = Math.max(1, labels.length);
  const max = niceMax(Math.max(1, ...series.flatMap((item) => item.values)));
  const x = (index: number) => PADDING.left + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const y = (value: number) => PADDING.top + plotHeight - (value / max) * plotHeight;
  const labelEvery = Math.max(1, Math.ceil(count / 7));
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));

  function moveFocus(index: number, direction: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(labels.length - 1, index + direction));
    bucketRefs.current[nextIndex]?.focus();
  }

  const tooltipAnchor = selectedIndex === null
    ? null
    : {
        left: x(selectedIndex),
        top: Math.min(...activeSeries.map((item) => y(item.values[selectedIndex] ?? 0)), height - PADDING.bottom),
      };
  const showTooltipBelow = (tooltipAnchor?.top ?? 0) < 96;
  const tooltipTranslateX =
    selectedIndex === 0 ? "0" : selectedIndex === count - 1 ? "-100%" : "-50%";

  return (
    <div
      ref={containerRef}
      role="group"
      aria-describedby={descriptionId}
      className="w-full"
    >
      <p id={descriptionId} className="sr-only">
        Interactive line chart. Focus a date and use the arrow keys to move between reporting periods. Select a legend item to show or hide its line.
      </p>

      <div role="group" aria-label="Chart legend" className="mb-3 flex flex-wrap items-center gap-2">
        {series.map((item, index) => {
          const isVisible = visible[index] !== false;
          return (
            <button
              key={item.label}
              type="button"
              aria-pressed={isVisible}
              onClick={() => {
                setVisible((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
                setSelectedIndex(null);
              }}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isVisible
                  ? "border-hairline bg-surface text-ink"
                  : "border-hairline/60 bg-surface-2 text-ink-muted"
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isVisible ? item.color : "var(--hairline)" }}
              />
              {item.label}
              <span className="sr-only">{isVisible ? "shown" : "hidden"}</span>
            </button>
          );
        })}
      </div>

      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          preserveAspectRatio="none"
          className="block h-full w-full overflow-visible"
          role="group"
          aria-label={`${series.map((item) => item.label).join(" and ")} over time`}
        >
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.label} id={`${id}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity={index === 0 ? 0.2 : 0.18} />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {gridValues.map((value, index) => (
            <g key={`${value}-${index}`} aria-hidden="true">
              <line
                x1={PADDING.left}
                x2={chartWidth - PADDING.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
                strokeDasharray={index === 0 ? undefined : "3 5"}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PADDING.left - 9}
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="currentColor"
                opacity="0.68"
              >
                {value.toLocaleString("en-GB")}
              </text>
            </g>
          ))}

          {selectedIndex !== null && (
            <line
              x1={x(selectedIndex)}
              x2={x(selectedIndex)}
              y1={PADDING.top}
              y2={height - PADDING.bottom}
              stroke="var(--hairline)"
              strokeWidth={1}
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
              aria-hidden="true"
            />
          )}

          {activeSeries.map((item) => {
            const seriesIndex = series.findIndex((candidate) => candidate.label === item.label);
            const values = labels.map((_, index) => item.values[index] ?? 0);
            const points = values.map((value, index) => ({ x: x(index), y: y(value) }));
            const line = smoothPath(points);
            const areaPath = points.length
              ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
              : "";
            return (
              <g key={item.label}>
                <path d={areaPath} fill={`url(#${id}-fill-${seriesIndex})`} className="chart-area-reveal" />
                <path
                  d={line}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  className="chart-line-reveal"
                />
                {dots && points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={selectedIndex === index ? 4 : 2.7}
                    fill="var(--surface)"
                    stroke={item.color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    aria-hidden="true"
                  />
                ))}
              </g>
            );
          })}

          {labels.map((label, index) =>
            index % labelEvery === 0 || index === labels.length - 1 ? (
              <text
                key={`${label}-${index}`}
                x={x(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                opacity="0.7"
                aria-hidden="true"
              >
                {label}
              </text>
            ) : null,
          )}

          {labels.map((label, index) => {
            const left = index === 0 ? PADDING.left : (x(index - 1) + x(index)) / 2;
            const right = index === labels.length - 1 ? chartWidth - PADDING.right : (x(index) + x(index + 1)) / 2;
            const visibleValues = activeSeries.length ? activeSeries : series;
            return (
              <rect
                key={`focus-${label}-${index}`}
                ref={(element) => { bucketRefs.current[index] = element; }}
                x={left}
                y={PADDING.top}
                width={Math.max(1, right - left)}
                height={plotHeight}
                fill="transparent"
                pointerEvents="all"
                role="button"
                tabIndex={0}
                aria-label={bucketDescription(label, visibleValues, index)}
                aria-describedby={selectedIndex === index ? tooltipId : undefined}
                onPointerEnter={() => setSelectedIndex(index)}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse" && document.activeElement !== event.currentTarget) setSelectedIndex(null);
                }}
                onFocus={() => setSelectedIndex(index)}
                onBlur={() => setSelectedIndex(null)}
                onClick={() => setSelectedIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveFocus(index, -1);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveFocus(index, 1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    bucketRefs.current[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    bucketRefs.current[labels.length - 1]?.focus();
                  }
                }}
                className="cursor-crosshair outline-none focus-visible:fill-primary/5"
              />
            );
          })}
        </svg>

        {activeSeries.length === 0 && (
          <p className="pointer-events-none absolute inset-x-16 top-1/2 -translate-y-1/2 rounded-control bg-surface/95 px-4 py-3 text-center text-sm text-ink-muted shadow-panel">
            Turn a legend item back on to see its trend.
          </p>
        )}

        {selectedIndex !== null && tooltipAnchor && activeSeries.length > 0 && (
          <div
            id={tooltipId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none absolute z-10 min-w-40 rounded-control border border-hairline bg-surface px-3 py-2.5 shadow-lift"
            style={{
              left: tooltipAnchor.left,
              top: tooltipAnchor.top,
              transform: `translate(${tooltipTranslateX}, ${showTooltipBelow ? "12px" : "calc(-100% - 12px)"})`,
            }}
          >
            <p className="mb-2 whitespace-nowrap text-xs font-semibold text-ink">{labels[selectedIndex]}</p>
            <ul className="space-y-1.5">
              {activeSeries.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-muted">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                    {item.label}
                  </span>
                  <span className="font-bold tabular-nums text-ink">
                    {(item.values[selectedIndex] ?? 0).toLocaleString("en-GB")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
