import { describe, expect, it } from "vitest";
import { previewKindFor } from "./ghs-constants";

/**
 * The viewer picks its renderer from this one function, so a MIME type that maps
 * to the wrong kind does not fail loudly — it silently shows an empty frame or a
 * "no view" panel for a file that could have been read. Each allowlisted type is
 * pinned here.
 */
describe("previewKindFor", () => {
  it("maps the documents the browser can draw itself", () => {
    expect(previewKindFor("application/pdf")).toBe("pdf");
    expect(previewKindFor("image/png")).toBe("image");
    expect(previewKindFor("image/jpeg")).toBe("image");
    expect(previewKindFor("video/mp4")).toBe("video");
    expect(previewKindFor("audio/mpeg")).toBe("audio");
  });

  it("maps the formats the server has to read", () => {
    expect(
      previewKindFor("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe("docx");
    expect(
      previewKindFor("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    ).toBe("pptx");
    expect(previewKindFor("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("xlsx");
    expect(previewKindFor("text/markdown")).toBe("text");
    expect(previewKindFor("text/csv")).toBe("text");
  });

  it("ignores parameters and casing", () => {
    expect(previewKindFor("Application/PDF; charset=binary")).toBe("pdf");
    expect(previewKindFor("  TEXT/PLAIN ")).toBe("text");
  });

  it("says none rather than guessing at an unknown or absent type", () => {
    expect(previewKindFor("application/x-unknown")).toBe("none");
    expect(previewKindFor("")).toBe("none");
    expect(previewKindFor(null)).toBe("none");
    expect(previewKindFor(undefined)).toBe("none");
  });
});
