import { describe, expect, it } from "vitest";
import {
  CAPABILITY_MATRIX,
  FACILITATOR_GLOBAL_ACTIONS,
  PUBLIC_ACTIONS,
  can,
  canAssignRole,
  isDistrictScoped,
  isGlobalForFacilitators,
  rolesAssignableBy,
  roleForStaffRole,
  staffRoleOf,
  scopeAllows,
  type Action,
  type Role,
} from "./capabilities";

const ROLES: Role[] = ["SYSTEM_ADMIN", "DISTRICT_HR", "FACILITATOR", "LEARNER"];
const ACTIONS = Object.keys(CAPABILITY_MATRIX.SYSTEM_ADMIN) as Action[];

// Spot checks against the authoritative matrix in docs/rbac.md (section 1).
describe("capability matrix", () => {
  it("keeps administrative actions to SYSTEM_ADMIN", () => {
    expect(can("SYSTEM_ADMIN", "user.create")).toBe(true);
    expect(can("FACILITATOR", "user.create")).toBe(false);
    expect(can("LEARNER", "area.update")).toBe(false);
    expect(can("LEARNER", "audit_log.read")).toBe(false);
  });

  it("lets facilitators author in scope but not manage the programme taxonomy", () => {
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

  it("requires a Programme Field scope for facilitator authoring actions", () => {
    expect(scopeAllows("FACILITATOR", "material.create", {})).toBe(false);
    expect(scopeAllows("FACILITATOR", "material.create", { areaId: "a1" })).toBe(true);
  });

  it("allows facilitators global self-service actions without programme scope", () => {
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

/*
 * District HR: an administrator for one district. The matrix is written as the
 * administrator's row less the exceptions, so these tests exist to keep the
 * exceptions honest — a new action defaults to the administrator's answer, and
 * anything that must not follow has to be named here.
 */
describe("district HR", () => {
  it("administers people", () => {
    expect(can("DISTRICT_HR", "user.create")).toBe(true);
    expect(can("DISTRICT_HR", "user.deactivate")).toBe(true);
    expect(can("DISTRICT_HR", "user.reactivate")).toBe(true);
    expect(can("DISTRICT_HR", "user.reset_password")).toBe(true);
    expect(can("DISTRICT_HR", "user.read_pii")).toBe(true);
    expect(can("DISTRICT_HR", "user.assign_role")).toBe(true);
  });

  it("cannot reach past the district", () => {
    /* A regional sheet is not a district's business, and the taxonomy decides
     * what exists for every district at once. */
    expect(can("DISTRICT_HR", "user.bulk_import")).toBe(false);
    expect(can("DISTRICT_HR", "taxonomy.manage")).toBe(false);
    expect(can("DISTRICT_HR", "area.update")).toBe(false);
    expect(can("DISTRICT_HR", "area.assign_facilitator")).toBe(false);
    expect(can("DISTRICT_HR", "maintenance_banner.manage")).toBe(false);
    /* Geography is theirs below the district line and nowhere above it: the page
     * loads one district's tree, and the actions refuse region and district rows
     * outright. Notices are theirs too, because the audience filter can now name
     * a district and the action writes the officer's own into it. */
    expect(can("DISTRICT_HR", "geography.manage")).toBe(true);
    expect(can("DISTRICT_HR", "notification.broadcast")).toBe(true);
  });

  it("does not author or approve trainings", () => {
    expect(can("DISTRICT_HR", "training.manage")).toBe(false);
    expect(can("DISTRICT_HR", "material.publish")).toBe(false);
    expect(can("DISTRICT_HR", "comment.moderate")).toBe(false);
  });

  it("is the only role whose authority is district-scoped", () => {
    expect(isDistrictScoped("DISTRICT_HR")).toBe(true);
    expect(isDistrictScoped("SYSTEM_ADMIN")).toBe(false);
    expect(isDistrictScoped("FACILITATOR")).toBe(false);
    expect(isDistrictScoped("LEARNER")).toBe(false);
  });
});

describe("role assignment", () => {
  it("lets a district HR make facilitators and unit heads, but not administrators", () => {
    expect(canAssignRole("DISTRICT_HR", "LEARNER")).toBe(true);
    expect(canAssignRole("DISTRICT_HR", "FACILITATOR")).toBe(true);
    expect(canAssignRole("DISTRICT_HR", "UNIT_HEAD")).toBe(true);
    expect(canAssignRole("DISTRICT_HR", "DISTRICT_HR")).toBe(false);
    expect(canAssignRole("DISTRICT_HR", "SYSTEM_ADMIN")).toBe(false);
  });

  it("lets an administrator grant anything, and nobody else grant anything", () => {
    for (const role of ["LEARNER", "FACILITATOR", "UNIT_HEAD", "DISTRICT_HR", "SYSTEM_ADMIN"] as const) {
      expect(canAssignRole("SYSTEM_ADMIN", role)).toBe(true);
    }
    expect(rolesAssignableBy("FACILITATOR")).toEqual([]);
    expect(rolesAssignableBy("LEARNER")).toEqual([]);
  });

  it("round-trips every role choice through the stored row", () => {
    for (const choice of ["LEARNER", "FACILITATOR", "UNIT_HEAD", "DISTRICT_HR", "SYSTEM_ADMIN"] as const) {
      expect(staffRoleOf(roleForStaffRole(choice))).toBe(choice);
    }
  });
});
