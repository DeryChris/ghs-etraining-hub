import { describe, expect, it } from "vitest";
import { compactAudience, describeAudience, isAudienceFilter, matchesAudience } from "./notification-audience";

const viewer = { region: "Greater Accra", directorate: "Pharmacy", grade: "Pharmacist" };

/* Ga West and Ga East are two different districts with similar names — the case
 * a name-keyed filter gets wrong and an id-keyed one cannot. */
const GA_WEST = "1f0a6f3e-0b7c-4a1d-9c2e-8a5b6d7e8f90";
const GA_EAST = "2b1c7d4f-1c8d-4b2e-8d3f-9b6c7e8f9a01";

describe("notification audience", () => {
  it("treats a null filter as everyone", () => {
    expect(matchesAudience(null, viewer)).toBe(true);
    expect(matchesAudience(undefined, viewer)).toBe(true);
    expect(describeAudience(null)).toBe("Everyone");
  });

  it("requires every chosen dimension to match", () => {
    expect(matchesAudience({ region: "Greater Accra" }, viewer)).toBe(true);
    expect(matchesAudience({ region: "Ashanti" }, viewer)).toBe(false);
    expect(matchesAudience({ region: "Greater Accra", directorate: "Pharmacy" }, viewer)).toBe(true);
    expect(matchesAudience({ region: "Greater Accra", grade: "Midwife" }, viewer)).toBe(false);
  });

  it("hides a targeted notice from a viewer with no value for that dimension", () => {
    expect(matchesAudience({ grade: "Pharmacist" }, { ...viewer, grade: null })).toBe(false);
    expect(matchesAudience({ region: "Ashanti" }, { ...viewer, region: null })).toBe(false);
  });

  it("drops blank values instead of narrowing to nobody", () => {
    expect(compactAudience({ region: "  ", directorate: "Pharmacy" })).toEqual({ directorate: "Pharmacy" });
    expect(compactAudience({ region: "", grade: null })).toBeNull();
  });

  it("limits a notice to one district by row id, not by name", () => {
    const inGaWest = { ...viewer, districtId: GA_WEST };
    expect(matchesAudience({ district: GA_WEST }, inGaWest)).toBe(true);
    expect(matchesAudience({ district: GA_EAST }, inGaWest)).toBe(false);
    /* A viewer with no district does not match a district notice, and a district
     * notice with a region beside it still needs both to hold. */
    expect(matchesAudience({ district: GA_WEST }, { ...viewer, districtId: null })).toBe(false);
    expect(matchesAudience({ district: GA_WEST, region: "Greater Accra" }, inGaWest)).toBe(true);
    expect(matchesAudience({ district: GA_WEST, region: "Ashanti" }, inGaWest)).toBe(false);
  });

  it("refuses a district filter that is not an id", () => {
    expect(isAudienceFilter({ district: GA_WEST })).toBe(true);
    expect(isAudienceFilter({ district: "Ga West" })).toBe(false);
  });

  it("summarises the audience for staff screens", () => {
    const names = new Map([[GA_WEST, "Ga West"]]);
    expect(describeAudience({ district: GA_WEST }, names)).toBe("Ga West");
    expect(describeAudience({ district: GA_WEST, grade: "Pharmacist" }, names)).toBe("Pharmacist · Ga West");
    // Without a name it still tells the truth rather than printing a uuid.
    expect(describeAudience({ district: GA_WEST })).toBe("one district");
    expect(describeAudience({ region: "Greater Accra", directorate: "Pharmacy" })).toBe("Greater Accra · Pharmacy");
    expect(describeAudience({})).toBe("Everyone");
  });

  it("rejects payloads that are not an audience filter", () => {
    expect(isAudienceFilter({ region: "Greater Accra" })).toBe(true);
    expect(isAudienceFilter({ role: "SYSTEM_ADMIN" })).toBe(false);
    expect(isAudienceFilter({ region: 3 })).toBe(false);
    expect(isAudienceFilter([])).toBe(false);
    expect(isAudienceFilter(null)).toBe(false);
  });
});
