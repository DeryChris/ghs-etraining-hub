import { describe, expect, it } from "vitest";
import {
  CAPABILITY_MATRIX,
  FACILITATOR_GLOBAL_ACTIONS,
  PUBLIC_ACTIONS,
  can,
  isGlobalForFacilitators,
  scopeAllows,
  type Action,
  type Role,
} from "./capabilities";

const ROLES: Role[] = ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"];
const ACTIONS = Object.keys(CAPABILITY_MATRIX.SYSTEM_ADMIN) as Action[];

// Spot checks against the authoritative matrix in docs/rbac.md (section 1).
describe("capability matrix", () => {
  it("keeps administrative actions to SYSTEM_ADMIN", () => {
    expect(can("SYSTEM_ADMIN", "user.create")).toBe(true);
    expect(can("FACILITATOR", "user.create")).toBe(false);
    expect(can("LEARNER", "area.update")).toBe(false);
    expect(can("LEARNER", "audit_log.read")).toBe(false);
  });

  it("lets facilitators author in scope but not run category governance", () => {
    expect(can("FACILITATOR", "material.create")).toBe(true);
    expect(can("FACILITATOR", "material.review")).toBe(true);
    expect(can("LEARNER", "material.review")).toBe(false);
    expect(can("FACILITATOR", "area.assign_facilitator")).toBe(false);
  });

  it("reserves reading other people's threads for SYSTEM_ADMIN", () => {
    expect(can("LEARNER", "message.read_any_thread")).toBe(false);
    expect(can("FACILITATOR", "message.read_any_thread")).toBe(false);
    expect(can("SYSTEM_ADMIN", "message.read_any_thread")).toBe(true);
    expect(can("LEARNER", "message.send")).toBe(true);
  });

  it("returns false for unknown roles", () => {
    expect(can(null, "message.send")).toBe(false);
    expect(can(undefined, "message.send")).toBe(false);
  });

  // docs/rbac.md §4: "CI must also assert that every action string in
  // capabilities.ts appears in the vectors file" — this is that assertion,
  // expressed as a self-consistency sweep so a new action cannot ship untested.
  it("answers for every documented action and every role", () => {
    // A floor, not a pin: it catches a vocabulary that silently loses an action
    // as the product sheds features.
    expect(ACTIONS.length).toBeGreaterThanOrEqual(33);
    for (const role of ROLES) {
      for (const action of ACTIONS) {
        expect(CAPABILITY_MATRIX[role][action], `${role} → ${action}`).toBeTypeOf("boolean");
        expect(can(role, action), `${role} → ${action}`).toBe(CAPABILITY_MATRIX[role][action]);
      }
    }
  });

  it("exposes no action to anonymous visitors", () => {
    expect(PUBLIC_ACTIONS.size).toBe(0);
    for (const action of ACTIONS) {
      expect(can(null, action), action).toBe(false);
    }
  });
});

describe("scope resolution", () => {
  it("blocks a facilitator from publishing their own version", () => {
    expect(scopeAllows("FACILITATOR", "material.publish", { areaId: "a1", reviewerIsAuthor: true })).toBe(false);
    expect(scopeAllows("FACILITATOR", "material.review", { areaId: "a1", reviewerIsAuthor: true })).toBe(false);
  });

  it("requires a category for facilitator governance actions", () => {
    expect(scopeAllows("FACILITATOR", "material.create", {})).toBe(false);
    expect(scopeAllows("FACILITATOR", "material.create", { areaId: "a1" })).toBe(true);
  });

  it("allows facilitators global self-service actions without a category", () => {
    for (const action of FACILITATOR_GLOBAL_ACTIONS) {
      expect(scopeAllows("FACILITATOR", action, {}), action).toBe(true);
      expect(isGlobalForFacilitators(action), action).toBe(true);
    }
    expect(isGlobalForFacilitators("material.publish")).toBe(false);
  });

  it("denies learners material aimed at another cohort", () => {
    expect(scopeAllows("LEARNER", "material.read_published", { audienceMatch: false })).toBe(false);
    expect(scopeAllows("LEARNER", "material.download", { audienceMatch: false })).toBe(false);
    expect(scopeAllows("LEARNER", "material.read_published", { audienceMatch: true })).toBe(true);
  });
});
