import { describe, expect, it } from "vitest";
import { PROGRAMME_FIELDS } from "@/db/data/programme-taxonomy";
import { areaGlyphKey, FIELD_GLYPH_KEYS } from "@/components/ui/field-tile-icon";

/**
 * Every programme a card can show has a picture of its own.
 *
 * The glyph used to be guessed from the words in the name, and anything the
 * guesses missed fell through to a stethoscope — so a page of ten cards showed
 * the same picture on six of them, and the icon said nothing about the card it
 * sat on. This test fails when a sub-field is added without a glyph, which is the
 * only way the fallback can come back.
 */
const AREAS = PROGRAMME_FIELDS.flatMap((field) => field.areas.map((area) => area.name));

describe("sub-field glyphs", () => {
  it("has a taxonomy to draw", () => {
    expect(AREAS.length).toBeGreaterThan(40);
  });

  it("gives every named sub-field a glyph of its own", () => {
    const fallbacks = AREAS.filter((name) => areaGlyphKey(name) === "stethoscope" && name !== "Clinical Service Development");
    expect(fallbacks).toEqual([]);
  });

  it("is case- and spacing-insensitive, so a rename keeps its picture", () => {
    expect(areaGlyphKey("  epi ")).toBe(areaGlyphKey("EPI"));
    expect(areaGlyphKey("mental health")).toBe("brain");
  });

  it("still guesses for a subject an administrator invents", () => {
    expect(areaGlyphKey("Malaria Case Management")).not.toBe("stethoscope");
    expect(areaGlyphKey("Something nobody has filed before")).toBe("stethoscope");
  });

  it("has a glyph for every programme area as well", () => {
    expect(FIELD_GLYPH_KEYS).toHaveLength(PROGRAMME_FIELDS.length);
  });
});
