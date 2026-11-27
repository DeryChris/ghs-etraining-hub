import { describe, expect, it } from "vitest";
import { canonicalStaffId, isValidStaffId, sameStaffId, staffIdDigits } from "@/lib/staff-id";

describe("staff ids", () => {
  it("keeps a bare employee number", () => {
    expect(canonicalStaffId("2681763")).toBe("2681763");
    expect(isValidStaffId("2681763")).toBe(true);
  });

  it("drops a legacy prefix and surrounding space", () => {
    expect(staffIdDigits(" GHS-000123 ")).toBe("000123");
    expect(canonicalStaffId("GH-000123")).toBe("123");
    expect(isValidStaffId("GHS-000123")).toBe(true);
  });

  it("rejects words and short numbers", () => {
    expect(isValidStaffId("SMOKE-URL")).toBe(false);
    expect(isValidStaffId("12")).toBe(false);
    expect(isValidStaffId("")).toBe(false);
  });

  it("treats the prefixed and plain spellings of one number as the same person", () => {
    expect(sameStaffId("GHS-000123", "123")).toBe(true);
    expect(sameStaffId("2681763", "2681763")).toBe(true);
    expect(sameStaffId("2681763", "2681764")).toBe(false);
    expect(sameStaffId("", "")).toBe(false);
  });
});
