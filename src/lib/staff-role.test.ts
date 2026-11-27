import { describe, expect, it } from "vitest";
import { isStaffRole, roleForStaffRole, staffRoleOf } from "@/lib/rbac/capabilities";

describe("the role field", () => {
  it("writes a unit head as a facilitator carrying the duty", () => {
    expect(roleForStaffRole("UNIT_HEAD")).toEqual({ role: "FACILITATOR", unitHead: true });
  });

  it("clears the duty when the choice is anything else", () => {
    expect(roleForStaffRole("FACILITATOR")).toEqual({ role: "FACILITATOR", unitHead: false });
    expect(roleForStaffRole("LEARNER")).toEqual({ role: "LEARNER", unitHead: false });
    expect(roleForStaffRole("SYSTEM_ADMIN")).toEqual({ role: "SYSTEM_ADMIN", unitHead: false });
  });

  it("reads the four choices back off a stored row", () => {
    expect(staffRoleOf({ role: "FACILITATOR", unitHead: true })).toBe("UNIT_HEAD");
    expect(staffRoleOf({ role: "FACILITATOR", unitHead: false })).toBe("FACILITATOR");
    expect(staffRoleOf({ role: "LEARNER" })).toBe("LEARNER");
    expect(staffRoleOf({ role: "SYSTEM_ADMIN", unitHead: true })).toBe("SYSTEM_ADMIN");
  });

  it("only accepts the four choices from a query string", () => {
    expect(isStaffRole("UNIT_HEAD")).toBe(true);
    expect(isStaffRole("SYSTEM_ADMIN")).toBe(true);
    expect(isStaffRole("unit_head")).toBe(false);
    expect(isStaffRole("")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
});
