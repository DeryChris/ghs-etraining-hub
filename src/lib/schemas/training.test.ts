import { describe, expect, it } from "vitest";
import { trainingInput, trainingUpdateInput } from "./training";

const IDS = {
  programmeFieldId: "11111111-1111-4111-8111-111111111111",
  programmeAreaId: "22222222-2222-4222-8222-222222222222",
  regionId: "33333333-3333-4333-8333-333333333333",
};

function valid(overrides: Record<string, string> = {}) {
  return {
    title: "Malaria case management refresher",
    year: "2026",
    programmeFieldId: IDS.programmeFieldId,
    programmeAreaId: IDS.programmeAreaId,
    regionId: IDS.regionId,
    startsOn: "2026-03-04",
    endsOn: "2026-03-06",
    status: "PLANNED",
    ...overrides,
  };
}

describe("trainingInput", () => {
  it("accepts a complete plan and coerces the year", () => {
    const parsed = trainingInput.parse(valid());
    expect(parsed.year).toBe(2026);
    expect(parsed.status).toBe("PLANNED");
    expect(parsed.endsOn).toBe("2026-03-06");
  });

  it("turns empty optional selects into undefined, not empty strings", () => {
    const parsed = trainingInput.parse(valid({ districtId: "", facilityId: "", targetGroup: "  " }));
    expect(parsed.districtId).toBeUndefined();
    expect(parsed.facilityId).toBeUndefined();
    expect(parsed.targetGroup).toBeUndefined();
  });

  it("refuses a title that is too short", () => {
    const parsed = trainingInput.safeParse(valid({ title: "IPC" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toContain("at least 4 characters");
  });

  it("refuses an end date before the start date", () => {
    const parsed = trainingInput.safeParse(valid({ startsOn: "2026-03-06", endsOn: "2026-03-04" }));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("The end date cannot be before the start date.");
  });

  it("allows a single-day training with no end date", () => {
    const parsed = trainingInput.safeParse(valid({ endsOn: "" }));
    expect(parsed.success).toBe(true);
  });

  it("refuses an implausible year", () => {
    expect(trainingInput.safeParse(valid({ year: "1066" })).success).toBe(false);
    expect(trainingInput.safeParse(valid({ year: "2026-27" })).success).toBe(false);
  });

  it("refuses unknown keys, so a stray field cannot slip through", () => {
    expect(trainingInput.safeParse({ ...valid(), approved: "yes" }).success).toBe(false);
  });

  it("defaults the status rather than requiring it", () => {
    const withoutStatus = valid();
    delete (withoutStatus as { status?: string }).status;
    expect(trainingInput.parse(withoutStatus).status).toBe("PLANNED");
  });
});

describe("trainingUpdateInput", () => {
  it("carries the row id and the same rules", () => {
    const parsed = trainingUpdateInput.parse({
      ...valid(),
      trainingId: "44444444-4444-4444-8444-444444444444",
    });
    expect(parsed.trainingId).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("still refuses a reversed range", () => {
    const parsed = trainingUpdateInput.safeParse({
      ...valid({ startsOn: "2026-03-06", endsOn: "2026-03-04" }),
      trainingId: "44444444-4444-4444-8444-444444444444",
    });
    expect(parsed.success).toBe(false);
  });
});
