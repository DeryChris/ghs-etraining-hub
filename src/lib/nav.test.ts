import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/rbac/capabilities";
import { activeHref, isActiveHref, LEARNER_NAV, navFor } from "@/lib/nav";

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

  it("gives a facilitator notices but no administration, review queue or upload door", () => {
    const facilitator = hrefs("FACILITATOR");
    expect(facilitator).toContain("/notices");
    // Material is uploaded from the training it belongs to, so there is no
    // authoring workspace to walk into.
    expect(facilitator).not.toContain("/authoring");
    // The review queue is a sign-off duty: administrators and unit heads only.
    expect(facilitator).not.toContain("/review");
    // The desk lives inside messages now, and the public help pages are for
    // people who cannot sign in at all: neither is a destination of its own.
    expect(facilitator).toContain("/messages");
    expect(facilitator).not.toContain("/complaints");
    expect(facilitator).not.toContain("/help");
    expect(facilitator).not.toContain("/users");
    expect(facilitator).not.toContain("/settings");
    expect(facilitator).not.toContain("/geography");
    expect(facilitator).not.toContain("/programme-fields");
  });

  it("keeps a learner to the shared destinations only", () => {
    expect(hrefs("LEARNER")).toEqual([
      "/dashboard",
      "/catalogue",
      "/trainings",
      "/messages",
      "/notifications",
    ]);
    // "My record" held only "My activity", which lives on the dashboard now.
    expect(navFor("LEARNER").map((section) => section.id)).toEqual(["learn", "community"]);
  });

  it("draws the learner's top bar from the same five destinations", () => {
    expect(LEARNER_NAV.map((item) => item.href)).toEqual(hrefs("LEARNER"));
    expect(LEARNER_NAV.map((item) => item.label)).toEqual([
      "Dashboard",
      "Library",
      "Trainings",
      "Messages",
      "Notifications",
    ]);
    // Nothing administrative in a member of staff's bar.
    for (const href of ["/insights", "/users", "/review", "/authoring", "/notices", "/settings"]) {
      expect(LEARNER_NAV.map((item) => item.href)).not.toContain(href);
    }
  });

  it("no longer offers a separate activity tab", () => {
    for (const role of ROLES) expect(hrefs(role)).not.toContain("/analytics");
  });

  it("drops sections that have no items for the role, and never reorders the rest", () => {
    const admin = navFor("SYSTEM_ADMIN");
    expect(admin.map((section) => section.id)).toEqual([
      "learn",
      "community",
      "record",
      "author",
      "administration",
    ]);
    for (const section of admin) expect(section.items.length).toBeGreaterThan(0);
    // Order within a section follows the declaration, not the role filter.
    expect(admin[3]?.items.map((item) => item.href)).toEqual(["/review"]);
  });

  it("gives every role both doors: Trainings and the library by subject", () => {
    for (const role of ROLES) {
      expect(hrefs(role)).toContain("/trainings");
      // One library, filed by programme: field → area → trainings and material.
      // The old flat material list is not a second destination any more; its
      // route redirects into this one.
      expect(hrefs(role)).toContain("/catalogue");
      expect(hrefs(role)).not.toContain("/library");
      // Directorates and spaces are gone: there is one taxonomy (ADR-0014).
      expect(hrefs(role)).not.toContain("/directorates");
      expect(hrefs(role)).not.toContain("/sessions");
    }
    const items = navFor("FACILITATOR").flatMap((section) => section.items);
    expect(items.find((item) => item.href === "/trainings")?.label).toBe("Trainings");
    // The tab is called the library, and it is the catalogue route.
    expect(items.find((item) => item.href === "/catalogue")?.label).toBe("Library");
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
      "Programme areas",
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
    // The desk is open to every member of staff, head or not.
    expect(head).toContain("/messages");
  });
});

describe("isActiveHref", () => {
  it("does not light up the dashboard from every other page", () => {
    expect(isActiveHref("/catalogue", "/dashboard")).toBe(false);
    expect(isActiveHref("/dashboard", "/dashboard")).toBe(true);
  });

  it("keeps a section selected on its sub-pages", () => {
    expect(isActiveHref("/trainings/8f2c", "/trainings")).toBe(true);
    expect(isActiveHref("/trainings/abc", "/trainings")).toBe(true);
  });

  it("does not match on a shared prefix", () => {
    expect(isActiveHref("/catalogue-of-things", "/catalogue")).toBe(false);
  });
});

describe("activeHref", () => {
  it("prefers the most specific match", () => {
    expect(activeHref("/trainings/8f2c", "FACILITATOR")).toBe("/trainings");
    expect(activeHref("/messages", "LEARNER")).toBe("/messages");
    expect(activeHref("/unknown", "LEARNER")).toBeUndefined();
  });
});
