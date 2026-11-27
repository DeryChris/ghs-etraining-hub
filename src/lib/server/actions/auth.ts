"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/safe-redirect";
import { authenticateUser, type AuthResult } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { getSession, clearSessionCookie, setSessionCookie } from "@/lib/server/session";

export async function signOutAction(): Promise<void> {
  const session = await getSession();

  if (session) {
    await logAudit({
      actor: {
        sub: session.sub,
        role: session.role,
        name: session.name,
        staffId: session.staffId,
      },
      action: "AUTH_SIGNED_OUT",
      entity: "Session",
      entityId: session.sub,
    });
  }

  await clearSessionCookie();
  redirect("/login");
}

/* ── Sign in ──────────────────────────────────────────────────────────────── */

export interface SignInState {
  error: string | null;
  /** Echoed back so the form keeps what the visitor typed. */
  identifier?: string;
}

/** 30 days when "Remember me" is ticked, otherwise a browser-session cookie. */
const REMEMBER_SECONDS = 60 * 60 * 24 * 30;
const SESSION_SECONDS = 60 * 60 * 12;

/**
 * Employee number (or e-mail) and password against `public.users`, then a
 * signed session cookie.
 *
 * This replaced Supabase Auth on main's "neon db migrate" branch, and the login
 * form was still calling `supabase.auth.signInWithPassword` — which meant a
 * successful sign-in produced a Supabase cookie that nothing on the server read.
 * The password never leaves this process: bcrypt compares against
 * `users.password_hash`, and identity afterwards is our own `ghs_session` cookie.
 */
export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!identifier || !password) {
    return { error: "Enter your staff ID and password.", identifier };
  }

  let attempt: AuthResult;
  try {
    attempt = await authenticateUser(identifier, password);
  } catch (error) {
    log.error({ event: "auth.sign_in_failed", identifier, error: String(error) });
    return { error: "The server could not reach the staff directory. Try again in a moment.", identifier };
  }

  if (!attempt.ok) {
    return {
      error:
        attempt.message === "Invalid email or password."
          ? "That staff ID and password do not match. Check both and try again."
          : attempt.message,
      identifier,
    };
  }

  const { user } = attempt;
  try {
    await setSessionCookie(
      {
        sub: user.id,
        id: user.id,
        role: user.role,
        name: user.name,
        staffId: user.staffId,
        email: user.email,
        region: user.region ?? null,
        directorate: user.directorate ?? null,
        grade: user.grade ?? null,
        unitHead: user.unitHead ?? false,
        mustChange: user.mustChangePassword,
      },
      remember ? REMEMBER_SECONDS : SESSION_SECONDS,
    );
  } catch (error) {
    // The password was right; the session could not be established. Two causes,
    // and they need different sentences: a missing/short SESSION_SECRET, or a
    // database that would not accept the session row.
    const message = error instanceof Error ? error.message : String(error);
    const keyProblem = !message.startsWith("session-row-not-recorded");
    log.error({ event: "auth.session_cookie_failed", identifier, cause: keyProblem ? "signing-key" : "session-row", error: message });

    // Locally there is no ICT to tell, so the operator gets the actual reason.
    const detail = process.env.NODE_ENV === "production" ? null : message;
    return {
      error: keyProblem
        ? `Sign-in is not configured correctly on the server. ${
            detail ?? "Tell ICT the session key is missing."
          }`
        : `Your password is correct, but the session could not be recorded. ${
            detail ?? "Try again in a moment."
          }`,
      identifier,
    };
  }

  // A password somebody else chose does not get to open the workspace: the new
  // session is only good for choosing a new one.
  if (user.mustChangePassword) redirect("/change-password");

  redirect(next);
}
