import { describe, expect, it } from "vitest";
import { PROGRAMME_FIELDS, flatProgrammeAreas } from "./programme-taxonomy";

describe("the GHS programme taxonomy", () => {
  it("holds the ten fields from the source document", () => {
    expect(PROGRAMME_FIELDS).toHaveLength(10);
    expect(PROGRAMME_FIELDS[0]?.name).toBe("Administration and Support Services");
    expect(PROGRAMME_FIELDS.map((field) => field.name)).toContain("Clinical Care");
  });

  it("keeps every area inside exactly one field", () => {
    const areas = flatProgrammeAreas();
    expect(areas).toHaveLength(41);
    const names = areas.map((area) => area.name);
    expect(new Set(names).size).toBe(names.length);
    for (const area of areas) expect(PROGRAMME_FIELDS.some((field) => field.code === area.fieldCode)).toBe(true);
  });

  it("has unique codes, because they are the seeder's natural key", () => {
    const codes = [...PROGRAMME_FIELDS.map((field) => field.code), ...flatProgrammeAreas().map((area) => area.code)];
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^PF-[A-Z]+(-\d{2})?$/);
  });

  it("fits the varchar(24) column", () => {
    for (const field of PROGRAMME_FIELDS) {
      expect(field.code.length).toBeLessThanOrEqual(24);
      for (const area of field.areas) expect(area.code.length).toBeLessThanOrEqual(24);
    }
  });
});
