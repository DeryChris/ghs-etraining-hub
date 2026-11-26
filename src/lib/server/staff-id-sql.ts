import { sql } from "drizzle-orm";
import { users } from "@/db/schema";
import { canonicalStaffId } from "@/lib/staff-id";

/**
 * "This directory row has that employee number."
 *
 * Compares the digits only, so a row stored as `GHS-000123` is the same person
 * as somebody typing `123`, and `000123` matches `123`. Used by the duplicate
 * check on create and by the sign-in lookup in src/lib/server/auth.ts.
 */
export function staffIdMatches(value: string) {
  return sql`ltrim(regexp_replace(lower(${users.ghsStaffId}), '[^0-9]', '', 'g'), '0') = ${canonicalStaffId(value)}`;
}
