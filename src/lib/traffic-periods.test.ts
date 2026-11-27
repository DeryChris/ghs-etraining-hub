import { describe, expect, it } from "vitest";
import { trafficWindow } from "./traffic-periods";

function inclusiveDays(start: string, end: string): number {
  return (new Date(`${end}T00:00:00.000Z`).getTime() - new Date(`${start}T00:00:00.000Z`).getTime()) / 86_400_000 + 1;
}

describe("trafficWindow", () => {
  const throughDate = "2026-11-27";

  it("creates rolling daily periods and exact, adjacent comparison windows", () => {
    const window = trafficWindow("7d", throughDate);
    expect(window.currentStart).toBe("2026-11-21");
    expect(window.currentEnd).toBe(throughDate);
    expect(window.previousStart).toBe("2026-11-14");
    expect(window.buckets).toHaveLength(7);
    expect(window.buckets[0].key).toBe(window.currentStart);
    expect(window.buckets.at(-1)?.key).toBe(window.currentEnd);
    expect(inclusiveDays(window.previousStart, "2026-11-20")).toBe(inclusiveDays(window.currentStart, window.currentEnd));
  });

  it("keeps a rolling 30-day window distinct from calendar months", () => {
    const window = trafficWindow("30d", throughDate);
    expect(window.currentStart).toBe("2026-10-29");
    expect(window.previousStart).toBe("2026-09-29");
    expect(window.buckets).toHaveLength(30);
  });

  it("compares 12 weeks over the same 84-day span, including partial calendar weeks", () => {
    const window = trafficWindow("12w", throughDate);
    expect(window.currentStart).toBe("2026-09-05");
    expect(inclusiveDays(window.currentStart, window.currentEnd)).toBe(84);
    expect(inclusiveDays(window.previousStart, "2026-09-04")).toBe(84);
    expect(window.buckets).toHaveLength(13);
    expect(window.buckets[0].key).toBe("2026-08-31");
    expect(window.buckets.at(-1)?.key).toBe("2026-11-23");
  });

  it("uses calendar-month starts but gives the previous comparison the same number of days", () => {
    const window = trafficWindow("6m", throughDate);
    expect(window.currentStart).toBe("2026-06-01");
    expect(window.buckets.map((bucket) => bucket.key)).toEqual([
      "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    ]);
    expect(inclusiveDays(window.previousStart, "2026-05-31")).toBe(
      inclusiveDays(window.currentStart, window.currentEnd),
    );
  });

  it("labels year-spanning monthly buckets with the year", () => {
    const window = trafficWindow("12m", throughDate);
    expect(window.currentStart).toBe("2025-12-01");
    expect(window.buckets).toHaveLength(12);
    expect(window.buckets[0].label).toContain("25");
    expect(window.buckets.at(-1)?.label).toContain("26");
  });
});
