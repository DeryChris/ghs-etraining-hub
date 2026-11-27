import { describe, expect, it } from "vitest";
import { periodDelta, periodDeltaLabel } from "./period-delta";

describe("periodDelta", () => {
  it("compares equivalent periods", () => {
    expect(periodDelta(12, 10)).toBeCloseTo(20);
    expect(periodDelta(7, 10)).toBeCloseTo(-30);
  });

  it("does not invent a percentage for a zero baseline", () => {
    expect(periodDelta(3, 0)).toBeNull();
    expect(periodDelta(0, 0)).toBeNull();
    expect(periodDeltaLabel(3, 0)).toBe("New activity");
    expect(periodDeltaLabel(0, 0)).toBeNull();
    expect(periodDeltaLabel(Number.POSITIVE_INFINITY, 0)).toBeNull();
  });

  it("omits comparisons when the previous value is invalid", () => {
    expect(periodDelta(3, Number.NaN)).toBeNull();
    expect(periodDelta(Number.POSITIVE_INFINITY, 2)).toBeNull();
  });
});
