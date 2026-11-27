"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/index";
import { isSchemaError } from "@/lib/db-error";
import { users } from "@/db/schema";
import { isValidStaffId, staffIdDigits } from "@/lib/staff-id";
import { logAudit } from "@/lib/server/audit";
import { hashPassword } from "@/lib/server/auth";
import { log } from "@/lib/server/logger";
import { consumeRateLimit, rateLimitKey } from "@/lib/server/rate-limit";
import { setSessionCookie } from "@/lib/server/session";
import { staffIdMatches } from "@/lib/server/staff-id-sql";

/**
 * What to say when the directory cannot be read.
 *
 * A database one migration behind this build answers with a SQLSTATE, not a
 * network error, and telling the person to "try again in a moment" sends them to
 * retry something that will fail identically until the deployment is fixed.
 */
const DIRECTORY_DOWN = (stale: boolean) =>
  stale
    ? "The staff directory is being updated and cannot be read at the moment. Try again in a few minutes."
    : "The staff directory could not be reached. Try again in a moment.";

/**
 * Creating an account, against the staff sheet rather than against a form.
 *
 * The directory is already here: ICT imports the payroll extract, and every row
 * carries the name, region, district, facility and grade the sheet holds. What a
 * person adds is only the part the sheet cannot know — an e-mail address, a
 * telephone number, and a password. Verifying the employee number first is what
 * lets the rest of the form be read-only facts: nobody types their own grade.
 *
 * The account is *claimed*, never duplicated. A row that already has a password
 * is somebody's account, and this path refuses it — otherwise anyone who knows an
 * employee number could take over a colleague's account by "registering" it.
 */

const MIN_PASSWORD_LENGTH = 10;

const CONTACT = z.object({
  email: z.string().trim().toLowerCase().email("Enter a working e-mail address."),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a telephone number we can reach you on.")
    .max(20, "That telephone number is too long."),
  altPhone: z.string().trim().max(20, "That telephone number is too long.").optional().or(z.literal("")),
});

export interface StaffRecord {
  staffId: string;
  fullName: string;
  region: string | null;
  district: string | null;
  facility: string | null;
  grade: string | null;
}

export interface RegistrationState {
  error: string | null;
  /** Present once the employee number has been verified. */
  person?: StaffRecord;
  /** Echoed back so a failed attempt keeps what was typed. */
  email?: string;
  phone?: string;
  altPhone?: string;
}

interface DirectoryRow {
  id: string;
  ghsStaffId: string;
  fullName: string;
  region: string | null;
  district: string | null;
  facility: string | null;
  grade: string | null;
  isActive: boolean;
  passwordHash: string | null;
}

async function findStaff(staffId: string): Promise<DirectoryRow | undefined> {
  const [row] = await db
    .select({
      id: users.id,
      ghsStaffId: users.ghsStaffId,
      fullName: users.fullName,
      region: users.region,
      district: users.district,
      facility: users.facility,
      grade: users.grade,
      isActive: users.isActive,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(staffIdMatches(staffId))
    .limit(1);
  return row;
}

/**
 * Step one: does the staff sheet know this employee number, and is the account
 * still unclaimed? The answer decides whether the form opens at all.
 */
export async function verifyStaffIdAction(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const typed = String(formData.get("staffId") ?? "").trim();

  if (!typed) return { error: "Enter your GHS Staff ID." };
  if (!isValidStaffId(typed)) {
    return { error: "A staff ID is the digits on your payslip — between three and twelve of them." };
  }

  // Ten lookups an hour from one place: enough for somebody who has mistyped
  // their number twice, few enough that the directory cannot be enumerated.
  let limited = false;
  try {
    const bucket = await consumeRateLimit(rateLimitKey("register.lookup", staffIdDigits(typed)), 10, 3600);
    limited = !bucket.allowed;
  } catch (error) {
    // A limiter that cannot write must not stop somebody registering.
    log.warn({ event: "auth.register_rate_limit_failed", error: String(error) });
  }
  if (limited) {
    return { error: "Too many attempts from here. Wait an hour, or lodge a complaint and we will check the number for you." };
  }

  let row: DirectoryRow | undefined;
  try {
    row = await findStaff(typed);
  } catch (error) {
    log.error({ event: "auth.register_lookup_failed", schemaDrift: isSchemaError(error), error: String(error) });
    return { error: DIRECTORY_DOWN(isSchemaError(error)) };
  }

  if (!row) {
    return {
      error:
        "That staff ID is not on the GHS sheet. Check the digits, or lodge a complaint — we can add you to the directory.",
    };
  }
  if (!row.isActive) {
    return { error: "That account has been deactivated. Lodge a complaint and it will be looked at." };
  }
  if (row.passwordHash) {
    return { error: "That account is already set up. Sign in with your password instead." };
  }

  return {
    error: null,
    person: {
      staffId: row.ghsStaffId,
      fullName: row.fullName,
      region: row.region,
      district: row.district,
      facility: row.facility,
      grade: row.grade,
    },
  };
}

/**
 * Step two: the contact details and the password, applied to the row the
 * directory already holds. The form's hidden fields are *not* trusted — the row
 * is looked up again by employee number, so a tampered page can only ever claim
 * the account whose number it typed.
 */
export async function registerAction(
  previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const typed = String(formData.get("staffId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const altPhone = String(formData.get("altPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const kept: RegistrationState = { error: null, person: previous.person, email, phone, altPhone };

  if (!isValidStaffId(typed)) {
    return { error: "That staff ID is not valid. Start again with your employee number." };
  }

  const contact = CONTACT.safeParse({ email, phone, altPhone });
  if (!contact.success) {
    return { ...kept, error: contact.error.issues[0]?.message ?? "Check your contact details." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ...kept, error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` };
  }
  if (password !== confirm) {
    return { ...kept, error: "The two passwords do not match. Check both and try again." };
  }

  let row: DirectoryRow | undefined;
  try {
    row = await findStaff(typed);
  } catch (error) {
    log.error({ event: "auth.register_lookup_failed", schemaDrift: isSchemaError(error), error: String(error) });
    return { ...kept, error: DIRECTORY_DOWN(isSchemaError(error)) };
  }

  if (!row || !row.isActive) {
    return { ...kept, error: "That staff ID is no longer on the GHS sheet. Lodge a complaint and we will check it." };
  }
  if (row.passwordHash) {
    return { ...kept, error: "That account was set up while this page was open. Sign in instead." };
  }

  const [clash] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(sql`lower(${users.email})`, contact.data.email), ne(users.id, row.id)))
    .limit(1);
  if (clash) {
    return { ...kept, error: "Another account already uses that e-mail address. Use a different one." };
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    log.error({ event: "auth.register_hash_failed", error: String(error) });
    return { ...kept, error: "The password could not be stored. Try again in a moment." };
  }

  try {
    await db
      .update(users)
      .set({
        email: contact.data.email,
        phone: contact.data.phone,
        grade: row.grade,
        passwordHash,
        mustChangePassword: false,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        // The alternative number shares the `phone` column's shape; it is kept in
        // the audit row rather than a column of its own until one is needed.
      })
      .where(eq(users.id, row.id));
  } catch (error) {
    log.error({ event: "auth.register_failed", staffId: row.ghsStaffId, error: String(error) });
    const duplicate = String(error).includes("users_email_unique") || String(error).includes("users_email");
    return {
      ...kept,
      error: duplicate
        ? "Another account already uses that e-mail address. Use a different one."
        : "The account was not created. Try again in a moment.",
    };
  }

  try {
    await logAudit({
      actor: { sub: row.id, role: "LEARNER", name: row.fullName, staffId: row.ghsStaffId },
      action: "AUTH_ACCOUNT_ACTIVATED",
      entity: "user",
      entityId: row.id,
      metadata: { email: contact.data.email, altPhone: contact.data.altPhone || null },
    });
  } catch (error) {
    // The account exists and works; a missing audit row is reported, not fatal.
    log.error({ event: "auth.register_audit_failed", userId: row.id, error: String(error) });
  }

  await setSessionCookie(
    {
      sub: row.id,
      id: row.id,
      role: "LEARNER",
      name: row.fullName,
      staffId: row.ghsStaffId,
      email: contact.data.email,
      region: row.region ?? null,
      directorate: null,
      grade: row.grade ?? null,
      unitHead: false,
      mustChange: false,
    },
    60 * 60 * 12,
  );

  log.info({ event: "auth.account_activated", userId: row.id });

  redirect("/dashboard");
}
