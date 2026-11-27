/**
 * Staff IDs, as the payroll list prints them.
 *
 * Ghana Health Service employee numbers are plain digits — 2681763, not
 * GHS-002681763. The prefix was an assumption made when this directory was
 * first built, and it turned a number people know by heart into something they
 * had to be told how to type. Everything here therefore works on the digits and
 * tolerates the prefixed form only so that legacy rows and old payslips still
 * sign in.
 *
 * Pure module: no database or server-only imports.
 */

/** Digits only, with any GHS-/GH- prefix and surrounding space removed. */
export function staffIdDigits(value: string): string {
  return value.trim().replace(/^ghs?-/i, "").replace(/[^0-9]/g, "");
}

/** The canonical form stored in the directory: the digits, leading zeros dropped. */
export function canonicalStaffId(value: string): string {
  const digits = staffIdDigits(value);
  return digits.replace(/^0+(?=.)/, "");
}

/** Employee numbers in the payroll extract are between three and twelve digits. */
export const STAFF_ID_PATTERN = /^[0-9]{3,12}$/;

/** Whether the typed identifier carries an employee number at all. */
export function isNumericStaffId(value: string): boolean {
  return /[0-9]/.test(staffIdDigits(value)) && !/[a-z]/i.test(value.trim().replace(/^ghs?-/i, ""));
}

export function isValidStaffId(value: string): boolean {
  return STAFF_ID_PATTERN.test(staffIdDigits(value));
}

/**
 * Whether two spellings refer to the same employee number.
 *
 * Used for the duplicate check and by the sign-in lookup, so that a directory
 * built with `GHS-000123` still recognises `123` and vice versa.
 */
export function sameStaffId(a: string, b: string): boolean {
  const left = canonicalStaffId(a);
  const right = canonicalStaffId(b);
  return left.length > 0 && left === right;
}
