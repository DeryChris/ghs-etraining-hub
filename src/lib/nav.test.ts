import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/rbac/capabilities";
import { activeHref, isActiveHref, navFor } from "@/lib/nav";

function hrefs(role: Role): string[] {
  return navFor(role).flatMap((section) => section.items.map((item) => item.href));
}

describe("navFor", () => {
  it("gives an administrator the administration section and no authoring workspace", () => {
    const admin = hrefs("SYSTEM_ADMIN");
    expect(admin).toContain("/users");
    expect(admin).toContain("/settings");
    expect(admin).toContain("/review");
    expect(admin).not.toContain("/authoring");
    expect(admin).not.toContain("/notices");
  });

  it("gives a facilitator authoring, review and notices but no administration", () => {
    const facilitator = hrefs("FACILITATOR");
    expect(facilitator).toEqual(
      expect.arrayContaining(["/authoring", "/review", "/notices", "/sessions"]),
    );
    expect(facilitator).not.toContain("/users");
    expect(facilitator).not.toContain("/settings");
  });

  it("keeps a learner to the shared destinations only", () => {
    expect(hrefs("LEARNER")).toEqual([
      "/dashboard",
      "/directorates",
      "/library",
      "/assessments",
      "/messages",
      "/notifications",
      "/analytics",
    ]);
    expect(navFor("LEARNER").map((section) => section.id)).toEqual(["learn", "community", "record"]);
  });

  it("drops sections that have no items for the role, and never reorders the rest", () => {
    const admin = navFor("SYSTEM_ADMIN");
    expect(admin.map((section) => section.id)).toEqual(["learn", "community", "record", "author", "administration"]);
    for (const section of admin) expect(section.items.length).toBeGreaterThan(0);
    // Order within a section follows the declaration, not the role filter.
    expect(admin[3]?.items.map((item) => item.href)).toEqual(["/sessions", "/review"]);
  });

  it("gives every role notifications, including facilitators", () => {
    for (const role of ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"] as const) {
      expect(hrefs(role)).toContain("/notifications");
    }
  });

  it("counts the review queue for staff only", () => {
    const review = (role: Role) =>
      navFor(role)
        .flatMap((section) => section.items)
        .find((item) => item.href === "/review");
    expect(review("SYSTEM_ADMIN")?.count).toBe("reviews");
    expect(review("FACILITATOR")?.count).toBe("reviews");
    expect(review("LEARNER")).toBeUndefined();
  });
});

describe("isActiveHref", () => {
  it("does not light up the dashboard from every other page", () => {
    expect(isActiveHref("/library", "/dashboard")).toBe(false);
    expect(isActiveHref("/dashboard", "/dashboard")).toBe(true);
  });

  it("keeps a section selected on its sub-pages", () => {
    expect(isActiveHref("/authoring/8f2c", "/authoring")).toBe(true);
    expect(isActiveHref("/directorates/abc", "/directorates")).toBe(true);
  });

  it("does not match on a shared prefix", () => {
    expect(isActiveHref("/library-of-things", "/library")).toBe(false);
  });
});

describe("activeHref", () => {
  it("prefers the most specific match", () => {
    expect(activeHref("/authoring/8f2c", "FACILITATOR")).toBe("/authoring");
    expect(activeHref("/messages", "LEARNER")).toBe("/messages");
    expect(activeHref("/unknown", "LEARNER")).toBeUndefined();
  });
});
