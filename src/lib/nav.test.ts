import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/rbac/capabilities";
import { activeHref, isActiveHref, navFor } from "@/lib/nav";

const ROLES = ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"] as const;

function hrefs(role: Role, options: { unitHead?: boolean } = {}): string[] {
  return navFor(role, options).flatMap((section) => section.items.map((item) => item.href));
}

describe("navFor", () => {
  it("gives an administrator the administration section and no authoring workspace", () => {
    const admin = hrefs("SYSTEM_ADMIN");
    expect(admin).toContain("/users");
    expect(admin).toContain("/geography");
    expect(admin).toContain("/programme-fields");
    expect(admin).toContain("/settings");
    expect(admin).toContain("/review");
    expect(admin).not.toContain("/authoring");
    expect(admin).not.toContain("/notices");
  });

  it("gives a facilitator authoring and notices but no administration and no review queue", () => {
    const facilitator = hrefs("FACILITATOR");
    expect(facilitator).toEqual(expect.arrayContaining(["/authoring", "/notices"]));
    // The review queue is a sign-off duty: administrators and unit heads only.
    expect(facilitator).not.toContain("/review");
    expect(facilitator).toContain("/help");
    expect(facilitator).not.toContain("/users");
    expect(facilitator).not.toContain("/settings");
    expect(facilitator).not.toContain("/geography");
    expect(facilitator).not.toContain("/programme-fields");
  });

  it("keeps a learner to the shared destinations only", () => {
    expect(hrefs("LEARNER")).toEqual([
      "/dashboard",
      "/trainings",
      "/catalogue",
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
    expect(admin.map((section) => section.id)).toEqual([
      "learn",
      "community",
      "support",
      "record",
      "author",
      "administration",
    ]);
    for (const section of admin) expect(section.items.length).toBeGreaterThan(0);
    // Order within a section follows the declaration, not the role filter.
    expect(admin[4]?.items.map((item) => item.href)).toEqual(["/review"]);
  });

  it("renamed Programmes to Trainings for every role, with the catalogue beside it", () => {
    for (const role of ROLES) {
      expect(hrefs(role)).toContain("/trainings");
      expect(hrefs(role)).toContain("/catalogue");
      // Directorates and spaces are gone: there is one taxonomy (ADR-0014).
      expect(hrefs(role)).not.toContain("/directorates");
      expect(hrefs(role)).not.toContain("/sessions");
    }
    const trainings = navFor("FACILITATOR")
      .flatMap((section) => section.items)
      .find((item) => item.href === "/trainings");
    expect(trainings?.label).toBe("Trainings");
  });

  it("gives every role notifications, including facilitators", () => {
    for (const role of ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"] as const) {
      expect(hrefs(role)).toContain("/notifications");
    }
  });

  it("puts the two reference-data surfaces in Administration, for administrators only", () => {
    const admin = navFor("SYSTEM_ADMIN").find((section) => section.id === "administration");
    expect(admin?.items.map((item) => item.label)).toEqual([
      "Users",
      "Geography & facilities",
      "Programme fields",
      "Complaints",
      "Settings",
    ]);
  });

  it("puts the review queue on administrators and unit heads, and counts it for them", () => {
    const review = (role: Role, options: { unitHead?: boolean } = {}) =>
      navFor(role, options)
        .flatMap((section) => section.items)
        .find((item) => item.href === "/review");
    expect(review("SYSTEM_ADMIN")?.count).toBe("reviews");
    expect(review("FACILITATOR")).toBeUndefined();
    expect(review("FACILITATOR", { unitHead: true })?.count).toBe("reviews");
    expect(review("LEARNER", { unitHead: true })).toBeUndefined();
  });

  it("gives unit heads their facilitator menu plus the review queue, and nothing else", () => {
    const plain = hrefs("FACILITATOR");
    const head = hrefs("FACILITATOR", { unitHead: true });
    expect(head.slice().sort()).toEqual([...plain, "/review"].sort());
    expect(head).not.toContain("/users");
    expect(head).not.toContain("/complaints");
  });
});

describe("isActiveHref", () => {
  it("does not light up the dashboard from every other page", () => {
    expect(isActiveHref("/library", "/dashboard")).toBe(false);
    expect(isActiveHref("/dashboard", "/dashboard")).toBe(true);
  });

  it("keeps a section selected on its sub-pages", () => {
    expect(isActiveHref("/authoring/8f2c", "/authoring")).toBe(true);
    expect(isActiveHref("/trainings/abc", "/trainings")).toBe(true);
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
