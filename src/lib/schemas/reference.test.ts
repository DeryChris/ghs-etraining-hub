import { describe, expect, it } from "vitest";
import {
  codeFrom,
  districtInput,
  facilityInput,
  programmeAreaInput,
  programmeFieldInput,
  regionInput,
} from "./reference";

describe("codeFrom", () => {
  it("takes the initials of a multi-word name", () => {
    // "and" is a connector, so it does not become an initial: A(dministration)
    // S(upport) S(ervices).
    expect(codeFrom("Administration and Support Services")).toBe("ASS");
    expect(codeFrom("Clinical Care")).toBe("CC");
  });

  it("falls back to the word itself for a single-word name", () => {
    expect(codeFrom("Nutrition")).toBe("NUTR");
  });

  it("survives punctuation and ampersands", () => {
    expect(codeFrom("Policy, Planning & Monitoring")).toBe("PPM");
  });

  it("never returns something shorter than two characters", () => {
    expect(codeFrom("A")).toHaveLength(2);
  });
});

describe("programmeFieldInput", () => {
  it("accepts a name with no code, because one is generated", () => {
    const parsed = programmeFieldInput.parse({ name: "  Public Health  " });
    expect(parsed.name).toBe("Public Health");
    expect(parsed.code).toBeUndefined();
  });

  it("upper-cases a supplied code and refuses a bad one", () => {
    expect(programmeFieldInput.parse({ name: "Public Health", code: "pf-ph" }).code).toBe("PF-PH");
    expect(programmeFieldInput.safeParse({ name: "Public Health", code: "pf ph!" }).success).toBe(false);
  });

  it("refuses a name that is only digits", () => {
    expect(programmeFieldInput.safeParse({ name: "2026" }).success).toBe(false);
  });
});

describe("programmeAreaInput", () => {
  it("requires the parent field", () => {
    expect(programmeAreaInput.safeParse({ name: "Estate Management" }).success).toBe(false);
    expect(
      programmeAreaInput.safeParse({ fieldId: "11111111-1111-4111-8111-111111111111", name: "Estate Management" })
        .success,
    ).toBe(true);
  });
});

describe("geography inputs", () => {
  it("accepts a region with a generated code", () => {
    expect(regionInput.parse({ name: "Upper West" }).name).toBe("Upper West");
  });

  it("defaults a district to DISTRICT kind and drops an empty capital", () => {
    const parsed = districtInput.parse({
      regionId: "11111111-1111-4111-8111-111111111111",
      name: "Wa Municipal",
      capital: "",
    });
    expect(parsed.kind).toBe("DISTRICT");
    expect(parsed.capital).toBeUndefined();
  });

  it("refuses an unknown district kind", () => {
    expect(
      districtInput.safeParse({
        regionId: "11111111-1111-4111-8111-111111111111",
        name: "Wa Municipal",
        kind: "CITY",
      }).success,
    ).toBe(false);
  });

  it("defaults a facility to a GHS health centre, and reads isActive", () => {
    const parsed = facilityInput.parse({
      districtId: "11111111-1111-4111-8111-111111111111",
      name: "Wa Regional Hospital",
      isActive: "false",
    });
    expect(parsed.type).toBe("HEALTH_CENTRE");
    expect(parsed.ownership).toBe("GHS");
    expect(parsed.isActive).toBe(false);
  });
});
