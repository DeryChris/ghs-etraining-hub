"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { displayOrigin } from "@/lib/app-url";
import { field } from "@/lib/schemas/authoring";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";

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

/** A random, never-shown password: the account holder sets their own by e-mail. */
function randomPassword(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.slice(0, 40);
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

/**
 * Creates the directory row first — that is what grants access — and then tries
 * to provision the Supabase login. When provisioning is not possible the person
 * is still in the directory and the message says exactly what to run, rather
 * than failing the whole operation or pretending the account is ready.
 */
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

  // Provision the login. A failure here does not undo the directory row: the
  // person exists, they simply cannot sign in until a login is issued.
  const admin = getSupabaseAdminClient();
  if (!admin) {
    revalidatePath("/users");
    return {
      ok: true,
      message: `${input.fullName} is in the directory. No auth login was created — SUPABASE_SERVICE_ROLE_KEY is not set, so run: npm run user:provision -- ${input.email}`,
    };
  }

  const { error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (authError && authError.code !== "email_exists") {
    log.error({ event: "user.auth_provision_failed", err: authError.message });
    revalidatePath("/users");
    return {
      ok: true,
      message: `${input.fullName} is in the directory, but the sign-in could not be created (${authError.message}). Run: npm run user:provision -- ${input.email}`,
    };
  }

  // Send the "set your password" link. Without it a freshly created login has an
  // unknown password, which is a support call waiting to happen.
  const origin = displayOrigin();
  const supabase = await createSupabaseServerClient();
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: origin ? `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}` : undefined,
  });

  revalidatePath("/users");
  log.info({ event: "user.created", actor: session.sub, role: input.role });

  return {
    ok: true,
    message: mailError
      ? `${input.fullName} can now be provisioned, but the set-password e-mail did not send. Ask ICT to issue a password.`
      : `${input.fullName} is in the directory and a set-password link is on its way to ${input.email}.`,
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

  const origin = displayOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: origin ? `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}` : undefined,
  });

  await logAudit({
    actor: auditActor(session),
    action: "USER_PASSWORD_RESET_REQUESTED",
    entity: "user",
    entityId: target.id,
  });

  if (error) {
    log.error({ event: "user.reset_mail_failed", err: error.message });
    return { ok: false, message: "The e-mail was not sent. Try again in a few minutes." };
  }

  return { ok: true, message: `A set-password link was sent to ${target.email}. It works once and expires.` };
}
