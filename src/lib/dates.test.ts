import { describe, expect, it } from "vitest";
import { ACCRA_TIME_ZONE, dateKeyInTimeZone } from "./dates";

describe("dateKeyInTimeZone", () => {
  it("returns the calendar day for the requested zone, not the process timezone", () => {
    const instant = new Date("2026-11-27T00:30:00.000Z");
    expect(dateKeyInTimeZone(instant)).toBe("2026-11-27");
    expect(dateKeyInTimeZone(instant, "America/Los_Angeles")).toBe("2026-11-26");
    expect(ACCRA_TIME_ZONE).toBe("Africa/Accra");
  });
});
