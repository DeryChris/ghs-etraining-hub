import "server-only";
import { cache } from "react";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { users, sessions } from "@/db/schema";
import type { Role } from "@/lib/rbac/capabilities";

/**
 * The signed-in identity. It carries the cohort attributes (region, directorate,
 * cadre) that content visibility depends on, so a page never has to re-read the
 * user row to decide whether a material is meant for this learner.
 */
export interface Session {
  /** public.users.id — the identity every foreign key and audit row uses. */
  sub: string;
  id: string;
  role: Role;
  name: string;
  staffId: string;
  email: string;
  region?: string;
  directorate?: string;
  cadre?: string;
  unitHead?: boolean;
}

export type AccountState =
  | { state: "anonymous" }
  | { state: "unprovisioned"; email: string }
  | { state: "inactive"; email: string }
  | { state: "active"; session: Session };

const COOKIE_NAME = "ghs_session";

/**
 * Identity comes from our own session cookie ("who you are"). Authority comes
 * from public.users ("what you may do"). No Supabase Auth involved.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHash("sha256")
    .update(`${payload}.${process.env.SESSION_SECRET}`)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): Session | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHash("sha256")
      .update(`${payload}.${process.env.SESSION_SECRET}`)
      .digest("hex");
    if (sig !== expected) return null;
    const session: Session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Create a signed session cookie + persist it in the sessions table.
 * Returns the raw token so the caller can set it as a cookie.
 */
export async function createDbSession(userId: string, ip?: string, userAgent?: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const session: Session = {
    sub: user.id,
    id: user.id,
    role: user.role,
    name: user.fullName,
    staffId: user.ghsStaffId,
    email: user.email,
    region: user.region,
    directorate: user.directorate,
    cadre: user.cadre,
    unitHead: user.isUnitHead,
  };

  const token = createSessionToken(session);
  const tokenHash = hashToken(token);
  const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    ip,
    userAgent,
    expiresAt: exp,
  });

  return token;
}

/**
 * Resolve the current account from the ghs_session cookie.
 * No Supabase Auth involved — identity comes from our own signed cookie,
 * authority comes from public.users.
 */
export const resolveAccount = cache(async (): Promise<AccountState> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { state: "anonymous" };

  const parsed = verifySessionToken(token);
  if (!parsed) return { state: "anonymous" };

  const tokenHash = hashToken(token);
  const [sessionRow] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!sessionRow || sessionRow.revokedAt || sessionRow.expiresAt < new Date()) {
    return { state: "anonymous" };
  }

  const [user] = await db.select().from(users).where(eq(users.id, sessionRow.userId)).limit(1);

  if (!user) return { state: "anonymous" };
  if (!user.isActive) return { state: "inactive", email: user.email };

  return {
    state: "active",
    session: {
      sub: user.id,
      id: user.id,
      role: user.role,
      name: user.fullName,
      staffId: user.ghsStaffId,
      email: user.email,
      region: user.region,
      directorate: user.directorate,
      cadre: user.cadre,
      unitHead: user.isUnitHead,
    },
  };
});

export async function getSession(): Promise<Session | null> {
  const account = await resolveAccount();
  return account.state === "active" ? account.session : null;
}

/** Set the signed session cookie + persist in DB. */
export async function setSessionCookie(session: Session, maxAgeSeconds: number) {
  const token = createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: "/",
  });

  const tokenHash = hashToken(token);
  const exp = new Date(Date.now() + maxAgeSeconds * 1000);
  await db.insert(sessions).values({
    userId: session.sub,
    tokenHash,
    expiresAt: exp,
  });
}

/** Clear the session cookie + revoke the DB row. */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
  }
  cookieStore.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}
