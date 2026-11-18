import { describe, expect, it } from "vitest";
import { dateRangeError, durationLabel, inclusiveDayCount, planYearOf, yearRange } from "./training-dates";

describe("inclusiveDayCount", () => {
  it("counts both ends, so a one-day training is one day", () => {
    expect(inclusiveDayCount("2026-03-04", "2026-03-04")).toBe(1);
    expect(inclusiveDayCount("2026-03-04", "2026-03-06")).toBe(3);
  });

  it("crosses months and years without arithmetic surprises", () => {
    expect(inclusiveDayCount("2026-01-30", "2026-02-02")).toBe(4);
    expect(inclusiveDayCount("2026-12-30", "2027-01-01")).toBe(3);
  });

  it("returns null for an unreadable or reversed range", () => {
    expect(inclusiveDayCount("2026-03-06", "2026-03-04")).toBeNull();
    expect(inclusiveDayCount("", "2026-03-04")).toBeNull();
    expect(inclusiveDayCount("4 March 2026", "2026-03-06")).toBeNull();
  });
});

describe("durationLabel", () => {
  it("reads the way a plan reads", () => {
    expect(durationLabel("2026-03-04", "2026-03-04")).toBe("1 day");
    expect(durationLabel("2026-03-04", "2026-03-06")).toBe("3 days");
  });

  it("stays silent until both dates exist", () => {
    expect(durationLabel("2026-03-04", null)).toBeNull();
  });
});

describe("planYearOf", () => {
  it("takes the year from the start date", () => {
    expect(planYearOf("2026-11-16")).toBe(2026);
    expect(planYearOf("2025-01-01")).toBe(2025);
  });

  it("refuses anything that is not an ISO date", () => {
    expect(planYearOf("16/11/2026")).toBeNull();
    expect(planYearOf(null)).toBeNull();
  });
});

describe("dateRangeError", () => {
  it("accepts a range that runs forwards", () => {
    expect(dateRangeError("2026-03-04", "2026-03-06")).toBeNull();
  });

  it("accepts a single-day training with no end date", () => {
    expect(dateRangeError("2026-03-04", null)).toBeNull();
    expect(dateRangeError("2026-03-04", "")).toBeNull();
  });

  it("refuses an end before the start, and says so", () => {
    expect(dateRangeError("2026-03-06", "2026-03-04")).toBe(
      "The end date cannot be before the start date.",
    );
  });

  it("refuses a start date that is not a date", () => {
    expect(dateRangeError("next Tuesday", null)).toBe("Enter the date the training starts.");
  });
});

describe("yearRange", () => {
  it("lists years newest first, including next year's planning window", () => {
    const years = yearRange(2027, 2025);
    expect(years).toEqual([2027, 2026, 2025]);
  });
});
