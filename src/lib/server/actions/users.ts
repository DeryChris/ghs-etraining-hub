"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { displayOrigin } from "@/lib/app-url";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";
import { authenticateUser, createUserWithPassword, createPasswordResetToken } from "@/lib/server/auth";

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

const ROLE_VALUES = ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const createInput = z
  .object({
    staffId: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^GHS-[0-9]{3,12}$/, "Use the staff ID as printed on the directory, e.g. GHS-000123."),
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

  const [existing] = await db
    .select({ id: users.id, email: users.email, staffId: users.ghsStaffId })
    .from(users)
    .where(sql`lower(${users.email}) = ${input.email} or ${users.ghsStaffId} = ${input.staffId}`)
    .limit(1);
  if (existing) {
    return {
      ok: false,
      message:
        existing.staffId === input.staffId
          ? `Staff ID ${input.staffId} is already in the directory.`
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
          role: input.role,
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
          metadata: { staffId: input.staffId, role: input.role, region: input.region ?? null },
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
  log.info({ event: "user.created", actor: session.sub, role: input.role });

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
    .select({ id: users.id, fullName: users.fullName, role: users.role })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (target.role === parsed.data.role) return { ok: false, message: `${target.fullName} already has that role.` };

  if (target.role === "SYSTEM_ADMIN" && (await activeAdminCount(target.id)) === 0) {
    return { ok: false, message: "This is the last active administrator. Give someone else the role first." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(users.id, target.id));
      await logAudit(
        {
          actor: auditActor(session),
          action: "USER_ROLE_CHANGED",
          entity: "user",
          entityId: target.id,
          metadata: { from: target.role, to: parsed.data.role },
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
  return { ok: true, message: `${target.fullName} is now ${parsed.data.role === "SYSTEM_ADMIN" ? "a system administrator" : parsed.data.role.toLowerCase()}.` };
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

/* ── Unit heads ─────────────────────────────────────────────────────────────── */

const unitHeadInput = z.object({ userId: z.string().uuid() }).strict();

/**
 * Marks a facilitator as a unit head, or takes the duty away again.
 *
 * A unit head is a facilitator who signs off the material filed under their
 * programme fields — the review queue, for the areas they are assigned to. The
 * role itself does not change, so their area assignments and materials keep
 * working whichever way this is set.
 */
export async function setUnitHeadAction(_previous: UserActionState, formData: FormData): Promise<UserActionState> {
  const parsed = unitHeadInput.safeParse({ userId: field(formData, "userId") });
  if (!parsed.success) return { ok: false, message: "That person could not be identified. Reload the page." };

  const guard = await checkCapability("user.assign_role");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [target] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, isUnitHead: users.isUnitHead })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return { ok: false, message: "That person is no longer in the directory." };
  if (target.role !== "FACILITATOR") {
    return {
      ok: false,
      message: `${target.fullName} is a ${target.role.toLowerCase().replace("_", " ")}. Only a facilitator can be a unit head.`,
    };
  }

  const next = !target.isUnitHead;
  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ isUnitHead: next, updatedAt: new Date() }).where(eq(users.id, target.id));
      await logAudit(
        {
          actor: auditActor(session),
          action: next ? "USER_UNIT_HEAD_GRANTED" : "USER_UNIT_HEAD_REMOVED",
          entity: "user",
          entityId: target.id,
          metadata: { fullName: target.fullName },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "user.unit_head_failed", err: String(error) });
    return { ok: false, message: "That was not saved. Try again." };
  }

  revalidatePath("/users");
  return {
    ok: true,
    message: next
      ? `${target.fullName} is now a unit head: the review queue is on their dashboard.`
      : `${target.fullName} is no longer a unit head.`,
  };
}
