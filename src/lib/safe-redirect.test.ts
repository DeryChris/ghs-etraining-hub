import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";
import { safeAppLink } from "./links";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/materials/abc?x=1")).toBe("/materials/abc?x=1");
  });

  it("rejects open-redirect attempts and falls back", () => {
    expect(safeNextPath("https://evil.example/steal")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("/ok\r\nSet-Cookie: x=1")).toBe("/dashboard");
  });

  it("never loops back to sign-in and handles empty input", () => {
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath("/login?next=/x")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/library")).toBe("/library");
  });
});

describe("safeAppLink", () => {
  it("renders only routes the app serves", () => {
    expect(safeAppLink("/library?q=cold")).toBe("/library?q=cold");
    expect(safeAppLink("/materials/3f2504e0-4f89-41d3-9a0c-0305e82c3301")).not.toBeNull();
    expect(safeAppLink("/directorates/CAT-ICD-02/standard-precautions-sop")).toBeNull();
    expect(safeAppLink("https://evil.example")).toBeNull();
    expect(safeAppLink("//evil.example")).toBeNull();
    expect(safeAppLink(null)).toBeNull();
  });
});
