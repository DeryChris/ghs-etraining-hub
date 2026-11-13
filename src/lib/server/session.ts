import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters");
}

export interface Session {
  sub: string;
  role: "SYSTEM_ADMIN" | "FACILITATOR" | "LEARNER";
  name: string;
  staffId: string;
  exp: number;
}

const COOKIE_NAME = "ghs_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHash("sha256")
    .update(`${payload}.${SESSION_SECRET}`)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): Session | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = createHash("sha256")
      .update(`${payload}.${SESSION_SECRET}`)
      .digest("hex");
    if (sig !== expected) return null;
    const session: Session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) throw new Error("UNAUTHENTICATED");
  const session = verifySessionToken(token);
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

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
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}
