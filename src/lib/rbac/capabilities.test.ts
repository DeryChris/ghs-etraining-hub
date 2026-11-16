import { describe, expect, it } from "vitest";
import { can, scopeAllows } from "./capabilities";

// Spot checks against the authoritative matrix in docs/rbac.md (section 1).
describe("capability matrix", () => {
  it("keeps administrative actions to SYSTEM_ADMIN", () => {
    expect(can("SYSTEM_ADMIN", "user.create")).toBe(true);
    expect(can("FACILITATOR", "user.create")).toBe(false);
    expect(can("LEARNER", "category.create")).toBe(false);
    expect(can("LEARNER", "audit_log.read")).toBe(false);
  });

  it("lets facilitators author in scope but not run category governance", () => {
    expect(can("FACILITATOR", "material.create")).toBe(true);
    expect(can("FACILITATOR", "category.assign_facilitator")).toBe(false);
  });

  it("denies learners the thread-reading capability", () => {
    expect(can("LEARNER", "message.read_thread")).toBe(false);
    expect(can("LEARNER", "message.send")).toBe(true);
  });

  it("returns false for unknown roles", () => {
    expect(can(null, "message.send")).toBe(false);
    expect(can(undefined, "message.send")).toBe(false);
  });
});

describe("scope resolution", () => {
  it("blocks a facilitator from publishing their own version", () => {
    expect(scopeAllows("FACILITATOR", "material.publish", { categoryId: "c1", reviewerIsAuthor: true })).toBe(false);
  });

  it("requires a category for facilitator governance actions", () => {
    expect(scopeAllows("FACILITATOR", "space.create", {})).toBe(false);
    expect(scopeAllows("FACILITATOR", "space.create", { categoryId: "c1" })).toBe(true);
  });

  it("allows facilitators global self-service actions without a category", () => {
    expect(scopeAllows("FACILITATOR", "message.send", {})).toBe(true);
    expect(scopeAllows("FACILITATOR", "enrollment.self", {})).toBe(true);
    expect(scopeAllows("FACILITATOR", "analytics.view_personal", {})).toBe(true);
  });

  it("denies learners a locked assessment", () => {
    expect(scopeAllows("LEARNER", "assessment.take", { enrolled: false })).toBe(false);
    expect(scopeAllows("LEARNER", "assessment.take", { enrolled: true, attemptsLeft: true })).toBe(true);
  });
});
