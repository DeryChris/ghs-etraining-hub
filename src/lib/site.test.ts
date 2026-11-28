import { describe, expect, it } from "vitest";
import { PRIMARY_NAV, primaryNavFor } from "@/lib/site";

describe("primaryNavFor", () => {
  it("hides the Library from signed-out navigation", () => {
    const links = primaryNavFor(false);

    expect(links.map((item) => item.href)).not.toContain("/catalogue");
    expect(links.map((item) => item.label)).toContain("Programme Areas");
    expect(links).toHaveLength(PRIMARY_NAV.length - 1);
  });

  it("shows the Library after sign-in", () => {
    expect(primaryNavFor(true)).toEqual(PRIMARY_NAV);
  });
});
