import { describe, expect, it } from "vitest";
import { compactAudience, describeAudience, isAudienceFilter, matchesAudience } from "./notification-audience";

const viewer = { region: "Greater Accra", directorate: "Pharmacy", grade: "Pharmacist" };

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

  it("summarises the audience for staff screens", () => {
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
