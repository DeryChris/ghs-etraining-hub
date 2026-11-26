"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { areaFacilitators, fieldFacilitators, sessions, users } from "@/db/schema";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";
import { canonicalStaffId, isValidStaffId, sameStaffId } from "@/lib/staff-id";
import { staffIdMatches } from "@/lib/server/staff-id-sql";
import { roleForStaffRole, staffRoleOf, STAFF_ROLE_VALUES } from "@/lib/rbac/capabilities";
import { createPasswordResetToken, hashPassword } from "@/lib/server/auth";
import { randomBytes } from "node:crypto";

/*
 * Directory administration. Every action re-checks the capability on the server
 * and writes an audit entry in the same transaction as the change, because the
 * role on a row is what grants authority — editing it silently would be the most
 * damaging thing this application could do.
 *
 * Two invariants are enforced here rather than in the UI:
 *   · an administrator cannot change their own role or close their own account;
 *   · the last active administrator can never be demoted or deactivated.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserActionState {
  ok: boolean;
  message: string | null;
}

const REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

const ROLE_VALUES = STAFF_ROLE_VALUES;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const createInput = z
  .object({
    /*
     * The payroll list prints employee numbers as plain digits (2681763), so the
     * field takes them that way. A prefixed GHS-000123 is still accepted and
     * reduced to its digits, because directories built before this change hold
     * the prefixed spelling and people copy whatever is on the paper in front of
     * them.
     */
    staffId: z
      .string()
      .trim()
      .refine(isValidStaffId, "Use the employee number as printed on the payroll list, e.g. 2681763.")
      .transform(canonicalStaffId),
    fullName: z.string().trim().min(3, "Enter the full name as it appears on the staff record.").max(120),
    email: z.string().trim().toLowerCase().email("Enter a work e-mail address.").max(200),
    role: z.enum(ROLE_VALUES),
    region: z.enum(REGIONS).optional().or(z.literal("").transform(() => undefined)),
    directorate: optionalText(120),
    cadre: optionalText(80),
    facility: optionalText(160),
    phone: optionalText(40),
  })
  .strict();

function roleChangeMessage(fullName: string, role: (typeof ROLE_VALUES)[number]): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return `${fullName} is now a system administrator.`;
    case "UNIT_HEAD":
      return `${fullName} is now a unit head: the review queue is on their dashboard.`;
    default:
      return `${fullName} is now a ${role.toLowerCase()}.`;
  }
}

const roleInput = z.object({ userId: z.string().uuid(), role: z.enum(ROLE_VALUES) }).strict();
const targetInput = z.object({ userId: z.string().uuid() }).strict();

function auditActor(session: { sub: string; role: string; name: string; staffId: string }) {
  return { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId };
}

async function activeAdminCount(excludingId?: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(
      and(
        eq(users.role, "SYSTEM_ADMIN"),
        eq(users.isActive, true),
        excludingId ? ne(users.id, excludingId) : undefined,
      ),
    );
  return row?.n ?? 0;
}

export async function createUserAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const parsed = createInput.safeParse({
    staffId: field(formData, "staffId"),
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    role: field(formData, "role") ?? "LEARNER",
    region: field(formData, "region") ?? "",
    directorate: field(formData, "directorate"),
    cadre: field(formData, "cadre"),
    facility: field(formData, "facility"),
    phone: field(formData, "phone"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  const guard = await checkCapability("user.create");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;
  const input = parsed.data;
  const duty = roleForStaffRole(input.role);

  const [existing] = await db
    .select({ id: users.id, email: users.email, staffId: users.ghsStaffId })
    .from(users)
    .where(
      sql`lower(${users.email}) = ${input.email} or ${staffIdMatches(input.staffId)}`,
    )
    .limit(1);
  if (existing) {
    return {
      ok: false,
      message:
        existing.staffId && sameStaffId(existing.staffId, input.staffId)
          ? `Employee number ${input.staffId} is already in the directory.`
          : `${input.email} is already in the directory.`,
    };
  }

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({
          ghsStaffId: input.staffId,
          email: input.email,
          fullName: input.fullName,
          role: duty.role,
          isUnitHead: duty.unitHead,
          region: input.region ?? null,
          directorate: input.directorate,
          cadre: input.cadre,
          facility: input.facility,
          phone: input.phone,
          passwordHash: null, // No password set — must be set via reset link
        })
        .returning({ id: users.id });

      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_CREATED",
          entity: "user",
          entityId: row.id,
          metadata: { staffId: input.staffId, role: duty.role, unitHead: duty.unitHead, region: input.region ?? null },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.create_failed", err: String(error) });
    return { ok: false, message: "The directory record was not created. Try again in a moment." };
  }

  // No Supabase Auth — the person is in the directory but cannot sign in
  // until an administrator sends them a password reset link.
  revalidatePath("/users");
  log.info({ event: "user.created", actor: session.sub, role: duty.role, unitHead: duty.unitHead });

  return {
    ok: true,
    message: `${input.fullName} is in the directory. Send them a password reset link so they can sign in.`,
  };
}

export async function changeUserRoleAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const parsed = roleInput.safeParse({ userId: field(formData, "userId"), role: field(formData, "role") });
  if (!parsed.success) return { ok: false, message: "Choose a role." };

  const guard = await checkCapability("user.assign_role");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  if (parsed.data.userId === session.sub) {
    return { ok: false, message: "You cannot change your own role. Ask another administrator." };
  }

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, isUnitHead: users.isUnitHead })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };

  const current = staffRoleOf({ role: target.role, unitHead: target.isUnitHead });
  if (current === parsed.data.role) return { ok: false, message: `${target.fullName} already has that role.` };
  const next = roleForStaffRole(parsed.data.role);

  if (target.role === "SYSTEM_ADMIN" && (await activeAdminCount(target.id)) === 0) {
    return { ok: false, message: "This is the last active administrator. Give someone else the role first." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ role: next.role, isUnitHead: next.unitHead, updatedAt: new Date() })
        .where(eq(users.id, target.id));
      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_ROLE_CHANGED",
          entity: "user",
          entityId: target.id,
          metadata: { from: current, to: parsed.data.role, role: next.role, unitHead: next.unitHead },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.role_change_failed", err: String(error) });
    return { ok: false, message: "The role was not changed. Try again." };
  }

  revalidatePath("/users");
  revalidatePath("/insights");
  log.info({ event: "user.role_changed", actor: session.sub, target: target.id, to: parsed.data.role });
  return { ok: true, message: roleChangeMessage(target.fullName, parsed.data.role) };
}

export async function setUserActiveAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const parsed = targetInput.extend({ active: z.enum(["true", "false"]) }).safeParse({
    userId: field(formData, "userId"),
    active: field(formData, "active"),
  });
  if (!parsed.success) return { ok: false, message: "Nothing to change." };

  const activate = parsed.data.active === "true";
  const guard = await checkCapability(activate ? "user.reactivate" : "user.deactivate");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  if (parsed.data.userId === session.sub) {
    return { ok: false, message: "You cannot close your own account." };
  }

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (target.isActive === activate) {
    return { ok: false, message: `${target.fullName} is already ${activate ? "active" : "deactivated"}.` };
  }
  if (!activate && target.role === "SYSTEM_ADMIN" && (await activeAdminCount(target.id)) === 0) {
    return { ok: false, message: "This is the last active administrator. Make someone else an administrator first." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ isActive: activate, deactivatedAt: activate ? null : new Date(), updatedAt: new Date() })
        .where(eq(users.id, target.id));
      await logAudit(
        {
          actor: auditActor(session),
          action: activate ? "USER_REACTIVATED" : "USER_DEACTIVATED",
          entity: "user",
          entityId: target.id,
          metadata: { role: target.role },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.active_change_failed", err: String(error) });
    return { ok: false, message: "The account was not changed. Try again." };
  }

  revalidatePath("/users");
  revalidatePath("/insights");
  return {
    ok: true,
    message: activate
      ? `${target.fullName} can sign in again. Their record and audit history are unchanged.`
      : `${target.fullName} is deactivated. Their record stays in the audit trail; nothing is deleted.`,
  };
}

/** Re-sends the "set your password" link. It never reveals a password. */
export async function sendPasswordResetAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const parsed = targetInput.safeParse({ userId: field(formData, "userId") });
  if (!parsed.success) return { ok: false, message: "Choose a person." };

  const guard = await checkCapability("user.reset_password");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (!target.isActive) return { ok: false, message: "Reactivate the account before sending a reset link." };

  if (!target.email) {
    return { ok: false, message: "That account has no e-mail on file. Reset the password instead — it hands over a new one directly." };
  }
  const result = await createPasswordResetToken(target.email);

  await logAudit({
    actor: auditActor(session),
    action: "USER_PASSWORD_RESET_REQUESTED",
    entity: "user",
    entityId: target.id,
  });

  if (!result.ok) {
    log.error({ event: "user.reset_mail_failed", err: result.message });
    return { ok: false, message: "The reset link was not created. Try again in a few minutes." };
  }

  // Log the reset token for the administrator to deliver (since no SMTP is configured)
  log.info({ event: "user.reset_token", actor: session.sub, target: target.id, token: result.token });

  return {
    ok: true,
    message: `Reset token for ${target.email}: ${result.token}. Share this securely with the user.`,
  };
}

/* ── Password: set a temporary one and show it to the administrator ───────────
 * No mail provider exists in this pilot, so "send the new details" means the
 * administrator reads them off the screen and hands them over. The plaintext is
 * returned once, never stored, and never written to the log.
 */

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%*";

function temporaryPassword(length = 14): string {
  const bytes = randomBytes(length);
  let value = "";
  for (let index = 0; index < length; index += 1) value += PASSWORD_ALPHABET[bytes[index] % PASSWORD_ALPHABET.length];
  return value;
}

export interface CredentialState extends UserActionState {
  /** Shown once, to be copied by the administrator. Never persisted or logged. */
  credentials?: { email: string; fullName: string; password: string };
}

export async function resetUserPasswordAction(
  _previous: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const parsed = targetInput.safeParse({ userId: field(formData, "userId") });
  if (!parsed.success) return { ok: false, message: "Choose a person." };

  const guard = await checkCapability("user.reset_password");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (!target.isActive) return { ok: false, message: "Reactivate the account before resetting its password." };

  const password = temporaryPassword();
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        // A reset also clears the lockout: the reason somebody needs a new
        // password is usually that they were locked out of the old one.
        .set({
          passwordHash: await hashPassword(password),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, target.id));

      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, target.id), isNull(sessions.revokedAt)));

      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_PASSWORD_RESET",
          entity: "user",
          entityId: target.id,
          metadata: { fullName: target.fullName },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.password_reset_failed", userId: target.id, err: String(error) });
    return { ok: false, message: "The password was not changed. Try again." };
  }

  revalidatePath("/users");
  return {
    ok: true,
    message: `New password for ${target.fullName}. Copy it now — it is not shown again.`,
    credentials: { email: target.email ?? "", fullName: target.fullName, password },
  };
}

/* ── Details ───────────────────────────────────────────────────────────────── */

const detailsInput = z
  .object({
    userId: z.string().uuid(),
    fullName: z.string().trim().min(3, "Enter the full name.").max(120),
    // Optional: staff without a work address sign in with their employee number.
    email: z.union([z.string().trim().toLowerCase().email("Enter a valid e-mail address."), z.literal("")]),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    cadre: z.string().trim().max(80).optional().or(z.literal("")),
    facility: z.string().trim().max(120).optional().or(z.literal("")),
    region: z.string().trim().max(60).optional().or(z.literal("")),
  })
  .strict();

export async function updateUserDetailsAction(
  _previous: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = detailsInput.safeParse({
    userId: field(formData, "userId"),
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    cadre: field(formData, "cadre"),
    facility: field(formData, "facility"),
    region: field(formData, "region"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  const guard = await checkCapability("user.create");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          fullName: parsed.data.fullName,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          cadre: parsed.data.cadre || null,
          facility: parsed.data.facility || null,
          region: parsed.data.region || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, target.id));
      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_DETAILS_UPDATED",
          entity: "user",
          entityId: target.id,
          metadata: { from: target.email, to: parsed.data.email || null },
        },
        tx,
      );
    });
  } catch (error) {
    const duplicate = String(error).includes("users_email_unique") || String(error).includes("duplicate key");
    log.error({ event: "user.details_failed", userId: target.id, err: String(error) });
    return { ok: false, message: duplicate ? "Another account already uses that e-mail address." : "The details were not saved." };
  }

  revalidatePath("/users");
  return { ok: true, message: `Details saved for ${parsed.data.fullName}.` };
}

/* ── Access: programme fields and areas ──────────────────────────────────────
 * Replaces the whole grant set in one transaction, so the screen's checkboxes
 * mean what they say. A field grant covers every area inside it, including ones
 * created later; an area grant covers just that area.
 */

export async function setUserAccessAction(
  _previous: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const userId = field(formData, "userId");
  if (!userId) return { ok: false, message: "Choose a person." };

  const guard = await checkCapability("area.assign_facilitator");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const fieldIds = formData.getAll("fieldId").filter((value): value is string => typeof value === "string" && UUID_RE.test(value));
  const areaIds = formData.getAll("areaId").filter((value): value is string => typeof value === "string" && UUID_RE.test(value));

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (target.role === "LEARNER") {
    return {
      ok: false,
      message: `${target.fullName} is a learner. Make them a facilitator first, then choose the programme fields they hold.`,
    };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(fieldFacilitators).where(eq(fieldFacilitators.userId, userId));
      await tx.delete(areaFacilitators).where(eq(areaFacilitators.userId, userId));

      if (fieldIds.length > 0) {
        await tx.insert(fieldFacilitators).values(fieldIds.map((fieldId) => ({ fieldId, userId })));
      }
      if (areaIds.length > 0) {
        await tx.insert(areaFacilitators).values(areaIds.map((areaId) => ({ areaId, userId })));
      }

      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_ACCESS_UPDATED",
          entity: "user",
          entityId: userId,
          metadata: { fields: fieldIds.length, areas: areaIds.length },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.access_failed", userId, err: String(error) });
    return { ok: false, message: "Those assignments were not saved. Try again." };
  }

  revalidatePath("/users");
  const summary = [fieldIds.length ? `${fieldIds.length} field${fieldIds.length === 1 ? "" : "s"}` : null, areaIds.length ? `${areaIds.length} area${areaIds.length === 1 ? "" : "s"}` : null]
    .filter(Boolean)
    .join(" and ");
  return {
    ok: true,
    message: summary ? `${target.fullName} now covers ${summary}.` : `${target.fullName} has no programme access.`,
  };
}
