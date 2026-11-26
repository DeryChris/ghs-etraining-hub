import "server-only";

import { createHash } from "crypto";
import { compare, hash } from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import type { Role } from "@/lib/rbac/capabilities";
import { logAudit } from "@/lib/server/audit";

/**
 * Password hashing with bcrypt. Cost 12 is a good balance for 2026 hardware.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

/**
 * Generate a secure random token for password reset / email verification.
 */
export function generateToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

/**
 * Authenticate a user by employee number (or e-mail) + password.
 * On success, updates lastLoginAt and resets failedLoginCount.
 * On failure, increments failedLoginCount and locks after 5 attempts.
 */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  name: string;
  staffId: string;
  email: string;
  /** True when the password is still the one ICT issued. */
  mustChangePassword: boolean;
  region: string | null;
  directorate: string | null;
  cadre: string | null;
  unitHead: boolean;
}

export type AuthResult = { ok: false; message: string } | { ok: true; user: AuthenticatedUser };

export async function authenticateUser(identifier: string, password: string): Promise<AuthResult> {
  // People type the employee number off their payslip; a handful of early
  // accounts were made with an e-mail, so both are accepted. An "@" is the only
  // reliable way to tell the two apart — GHS employee numbers never contain one.
  const typed = identifier.trim();
  const byEmail = typed.includes("@");
  const [user] = await db
    .select()
    .from(users)
    .where(
      byEmail
        ? eq(sql`lower(${users.email})`, typed.toLowerCase())
        : eq(sql`lower(${users.ghsStaffId})`, typed.toLowerCase()),
    )
    .limit(1);

  if (!user) {
    return { ok: false, message: "Invalid email or password." };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, message: "Account is temporarily locked. Try again later." };
  }

  if (!user.isActive) {
    return { ok: false, message: "Account is deactivated. Contact your administrator." };
  }

  if (!user.passwordHash) {
    return { ok: false, message: "No password set for this account. Request a password reset." };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const failedCount = (user.failedLoginCount ?? 0) + 1;
    const updates: Record<string, unknown> = { failedLoginCount: failedCount };
    if (failedCount >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
    }
    await db.update(users).set(updates).where(eq(users.id, user.id));
    return { ok: false, message: "Invalid email or password." };
  }

  // Successful login
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, user.id));

  await logAudit({
    actor: { sub: user.id, role: user.role, name: user.fullName, staffId: user.ghsStaffId },
    action: "AUTH_LOGIN",
    entity: "Session",
    entityId: user.id,
  });

  return {
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      name: user.fullName,
      staffId: user.ghsStaffId,
      email: user.email ?? "",
      mustChangePassword: user.mustChangePassword,
      region: user.region,
      directorate: user.directorate,
      cadre: user.cadre,
      unitHead: user.isUnitHead,
    },
  };
}

/**
 * Create a password reset token for a user. Stores it in the users table
 * with a 1-hour expiry. Returns the raw token (only shown once).
 */
export async function createPasswordResetToken(email: string): Promise<{ ok: boolean; token?: string; message?: string }> {
  const [user] = await db
    .select({ id: users.id, email: users.email, isActive: users.isActive })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    // Don't reveal whether the email exists
    return { ok: true, message: "If an account exists, a reset link has been sent." };
  }

  const token = generateToken();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(users)
    .set({
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: expiresAt,
    })
    .where(eq(users.id, user.id));

  return { ok: true, token, message: `Reset token for ${user.email}: ${token}` };
}

/**
 * Verify and consume a password reset token. Returns the user id if valid.
 */
export async function verifyPasswordResetToken(token: string): Promise<{ ok: boolean; userId?: string; message?: string }> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const [user] = await db
    .select({ id: users.id, passwordResetExpiresAt: users.passwordResetExpiresAt })
    .from(users)
    .where(eq(users.passwordResetToken, tokenHash))
    .limit(1);

  if (!user) {
    return { ok: false, message: "Invalid or expired reset token." };
  }

  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    return { ok: false, message: "Reset token has expired. Request a new one." };
  }

  return { ok: true, userId: user.id };
}

/**
 * Set a new password for a user after verifying the reset token.
 * Clears the reset token on success.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; message?: string }> {
  const verified = await verifyPasswordResetToken(token);
  if (!verified.ok || !verified.userId) {
    return { ok: false, message: verified.message };
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    })
    .where(eq(users.id, verified.userId));

  await logAudit({
    actor: { sub: verified.userId, role: "SYSTEM", name: "System", staffId: "SYSTEM" },
    action: "PASSWORD_RESET",
    entity: "user",
    entityId: verified.userId,
  });

  return { ok: true, message: "Password reset successful." };
}

/**
 * Create a new user with a hashed password.
 */
export async function createUserWithPassword(params: {
  email: string;
  password: string;
  fullName: string;
  staffId: string;
  role: Role;
  region?: string | null;
  directorate?: string | null;
  cadre?: string | null;
  facility?: string | null;
}) {
  const passwordHash = await hashPassword(params.password);

  const [user] = await db
    .insert(users)
    .values({
      ghsStaffId: params.staffId,
      email: params.email.toLowerCase(),
      passwordHash,
      fullName: params.fullName,
      role: params.role,
      region: params.region ?? null,
      directorate: params.directorate ?? null,
      cadre: params.cadre ?? null,
      facility: params.facility ?? null,
      isActive: true,
    })
    .returning();

  await logAudit({
    actor: { sub: "system", role: "SYSTEM_ADMIN", name: "System", staffId: "SYSTEM" },
    action: "USER_CREATED",
    entity: "user",
    entityId: user.id,
    metadata: { staffId: params.staffId, role: params.role },
  });

  return user;
}

/**
 * Change the password of somebody who is already signed in.
 *
 * Different from `resetPassword`: no token is involved, the current password is
 * required, and the account stops being "must change" afterwards. This is the
 * path the first-login screen uses, and the one anybody uses later from Settings.
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; message?: string }> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, role: users.role, fullName: users.fullName, ghsStaffId: users.ghsStaffId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return { ok: false, message: "That account no longer exists." };
  if (!user.passwordHash) return { ok: false, message: "No password is set on this account. Ask ICT to reset it." };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, message: "Your current password is not correct." };
  }

  if (await verifyPassword(newPassword, user.passwordHash)) {
    return { ok: false, message: "Choose a password you have not used before." };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await logAudit({
    actor: { sub: user.id, role: user.role, name: user.fullName, staffId: user.ghsStaffId },
    action: "PASSWORD_CHANGED",
    entity: "user",
    entityId: user.id,
  });

  return { ok: true, message: "Password changed." };
}
