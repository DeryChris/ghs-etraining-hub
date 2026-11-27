import { ACCRA_TIME_ZONE, dateKeyInTimeZone } from "@/lib/dates";

export interface Bucket {
  /** Sort key, e.g. 2026-11 or 2026-11-23. */
  key: string;
  /** Axis label, e.g. "Nov 26" or "23 Nov". */
  label: string;
}

export const TRAFFIC_PERIOD_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "12w", label: "12 weeks" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
] as const;

export type TrafficPeriod = (typeof TRAFFIC_PERIOD_OPTIONS)[number]["value"];
export type TrafficBucketUnit = "day" | "week" | "month";

const TRAFFIC_PERIOD_CONFIG: Record<TrafficPeriod, { unit: TrafficBucketUnit; count: number }> = {
  "7d": { unit: "day", count: 7 },
  "30d": { unit: "day", count: 30 },
  "12w": { unit: "week", count: 12 },
  "6m": { unit: "month", count: 6 },
  "12m": { unit: "month", count: 12 },
};

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: ACCRA_TIME_ZONE });
const MONTH_YEAR_LABEL = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: ACCRA_TIME_ZONE,
});
const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: ACCRA_TIME_ZONE });
const DAY_WITH_YEAR_LABEL = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  timeZone: ACCRA_TIME_ZONE,
});
const WEEKDAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  timeZone: ACCRA_TIME_ZONE,
});

function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftDate(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function daysBetween(start: string, end: string): number {
  return Math.round((dateFromKey(end).getTime() - dateFromKey(start).getTime()) / 86_400_000);
}

/** Calendar-month buckets used by both traffic and the history charts. */
export function monthBuckets(count: number, throughDate = dateKeyInTimeZone(new Date(), ACCRA_TIME_ZONE)): Bucket[] {
  const [yearText, monthText] = throughDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const formatter = count >= 12 ? MONTH_YEAR_LABEL : MONTH_LABEL;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - (count - 1 - index), 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: formatter.format(date),
    };
  });
}

function dayBuckets(start: string, count: number): Bucket[] {
  return Array.from({ length: count }, (_, index) => {
    const key = shiftDate(start, index);
    const date = dateFromKey(key);
    return { key, label: count <= 7 ? WEEKDAY_LABEL.format(date) : DAY_LABEL.format(date) };
  });
}

function weekBuckets(start: string, end: string, count: number): Bucket[] {
  const firstMonday = dateFromKey(start);
  firstMonday.setUTCDate(firstMonday.getUTCDate() - ((firstMonday.getUTCDay() + 6) % 7));
  const lastDate = dateFromKey(end);
  lastDate.setUTCDate(lastDate.getUTCDate() - ((lastDate.getUTCDay() + 6) % 7));
  const showYear = count >= 52;
  const buckets: Bucket[] = [];

  for (const date = new Date(firstMonday); date <= lastDate; date.setUTCDate(date.getUTCDate() + 7)) {
    const key = dateKey(date);
    buckets.push({ key, label: (showYear ? DAY_WITH_YEAR_LABEL : DAY_LABEL).format(date) });
  }
  return buckets;
}

export interface TrafficWindow {
  unit: TrafficBucketUnit;
  count: number;
  buckets: Bucket[];
  /** Inclusive Accra calendar dates for the selected window. */
  currentStart: string;
  currentEnd: string;
  /** The immediately preceding, equal-day-count window: [previousStart, currentStart). */
  previousStart: string;
}

/**
 * Build a traffic window and an equal-length comparison window. Calendar-month
 * selections begin at the first month shown; day and week selections are rolling
 * windows. Weekly charts may include 13 labels because an 84-day window can
 * touch parts of 13 Monday-based calendar weeks.
 */
export function trafficWindow(
  periodOrWeeks: TrafficPeriod | number = "12w",
  throughDate = dateKeyInTimeZone(new Date(), ACCRA_TIME_ZONE),
): TrafficWindow {
  const config =
    typeof periodOrWeeks === "number"
      ? { unit: "week" as const, count: Math.max(1, Math.min(104, Math.floor(Number.isFinite(periodOrWeeks) ? periodOrWeeks : 12))) }
      : TRAFFIC_PERIOD_CONFIG[periodOrWeeks];
  const { unit, count } = config;
  const currentEnd = throughDate;
  const currentStart =
    unit === "day"
      ? shiftDate(currentEnd, -(count - 1))
      : unit === "week"
        ? shiftDate(currentEnd, -(count * 7 - 1))
        : `${monthBuckets(count, currentEnd)[0]?.key ?? currentEnd.slice(0, 7)}-01`;
  const windowDays = daysBetween(currentStart, currentEnd) + 1;
  const previousStart = shiftDate(currentStart, -windowDays);
  const buckets =
    unit === "day"
      ? dayBuckets(currentStart, count)
      : unit === "week"
        ? weekBuckets(currentStart, currentEnd, count)
        : monthBuckets(count, currentEnd);

  return { unit, count, buckets, currentStart, currentEnd, previousStart };
}

export function isTrafficPeriod(value: string | undefined): value is TrafficPeriod {
  return TRAFFIC_PERIOD_OPTIONS.some((option) => option.value === value);
}
