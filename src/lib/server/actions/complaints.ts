"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { complaints, users } from "@/db/schema";
import { displayOrigin } from "@/lib/app-url";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { complaintsForStaffId } from "@/lib/server/complaint-queries";
import { log } from "@/lib/server/logger";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { createSupabaseServerClient } from "@/lib/server/supabase-server";
import { requireRole } from "@/lib/server/rbac";
import { consumeRateLimit, rateLimitKey, retryAfterText } from "@/lib/server/rate-limit";
import { clientAddress } from "@/lib/server/request-context";

/*
 * Complaints: the public side of the help desk, and the two things an
 * administrator does about one — answer it, and reset somebody's access.
 *
 * The public actions are the only unauthenticated writes in the product besides
 * sign-in, so both are rate-limited and both store nothing they were not given.
 * The reference is random rather than sequential: it is quoted over the phone and
 * must not reveal how many complaints exist.
 */

export interface ComplaintState {
  ok: boolean;
  message: string | null;
  /** Set when a complaint was lodged, so the page can show the reference to quote. */
  reference?: string | null;
  /** Set when access was reset, so the administrator can pass it on. Shown once. */
  credentials?: { email: string; password: string } | null;
}

const ISSUE_TYPES = ["PERSONAL_DETAILS", "COURSE_RELATED", "LOGIN_ACCESS", "OTHERS"] as const;

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** CMP-XXXXXX. Ambiguous characters are left out: this gets read down a phone. */
function newReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `CMP-${Array.from(bytes, (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join("")}`;
}

/** A password a person can read aloud: no ambiguous characters, one group of four. */
function temporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

const submitInput = z
  .object({
    staffId: z
      .string()
      .trim()
      .max(16)
      .optional()
      .transform((value) => (value ? value : null)),
    fullName: z.string().trim().min(3, "Give the name the complaint should be filed under.").max(120),
    email: z.string().trim().toLowerCase().email("Use an email address we can reply to."),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((value) => (value ? value : null)),
    issueType: z.enum(ISSUE_TYPES),
    subject: z.string().trim().min(5, "Say in a few words what the problem is.").max(140),
    description: z
      .string()
      .trim()
      .min(20, "Add a sentence or two so the person handling it knows what happened.")
      .max(4000),
  })
  .strict();

/**
 * Lodges a complaint. Anyone may do this — the point is that somebody locked out
 * of their account can still reach a human — so the only guard is the rate limit
 * and a short, validated body.
 */
export async function submitComplaintAction(
  _previous: ComplaintState,
  formData: FormData,
): Promise<ComplaintState> {
  const limiter = await consumeRateLimit(
    rateLimitKey("complaint", await clientAddress()),
    5,
    10 * 60,
  ).catch((error: unknown) => {
    log.error({ event: "complaint.rate_limiter_unavailable", err: String(error) });
    return null;
  });
  if (limiter && !limiter.allowed) {
    return {
      ok: false,
      message: `That is several complaints from this connection in a short time. ${retryAfterText(limiter.retryAfterSeconds)}`,
    };
  }

  const parsed = submitInput.safeParse({
    staffId: field(formData, "staffId") ?? undefined,
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    phone: field(formData, "phone") ?? undefined,
    issueType: field(formData, "issueType") ?? "OTHERS",
    subject: field(formData, "subject"),
    description: field(formData, "description"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const input = parsed.data;

  // A matching directory row links the complaint to the account, which is what
  // makes "reset my access" a one-click answer instead of a search.
  let matchedUserId: string | null = null;
  let region: string | null = null;
  let facility: string | null = null;
  if (input.staffId) {
    const [match] = await db
      .select({ id: users.id, region: users.region, facility: users.facility })
      .from(users)
      .where(sql`lower(${users.ghsStaffId}) = ${input.staffId.toLowerCase()}`)
      .limit(1);
    if (match) {
      matchedUserId = match.id;
      region = match.region;
      facility = match.facility;
    }
  }

  try {
    const reference = newReference();
    await db.insert(complaints).values({
      reference,
      staffId: input.staffId,
      userId: matchedUserId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      region,
      facility,
      issueType: input.issueType,
      subject: input.subject,
      description: input.description,
    });
    log.info({ event: "complaint.lodged", issueType: input.issueType, matched: matchedUserId !== null });
    revalidatePath("/complaints");
    return {
      ok: true,
      reference,
      message: `Your complaint is lodged. Quote ${reference} if you call, and keep it to check the status here.`,
    };
  } catch (error) {
    log.error({ event: "complaint.insert_failed", err: String(error) });
    return {
      ok: false,
      message: "The complaint was not saved. Try again in a moment, or call the ICT helpdesk.",
    };
  }
}

/** The public "Look up" button on the report form: fill in what the directory already knows. */
export interface StaffLookupState {
  ok: boolean;
  message: string | null;
  person?: { fullName: string; region: string | null; facility: string | null } | null;
}

export async function lookupStaffAction(_previous: StaffLookupState, formData: FormData): Promise<StaffLookupState> {
  const staffId = (field(formData, "staffId") ?? "").trim();
  if (!staffId) return { ok: false, message: "Type your Staff ID first, then look it up." };

  const limiter = await consumeRateLimit(rateLimitKey("staff-lookup", await clientAddress()), 30, 10 * 60).catch(
    () => null,
  );
  if (limiter && !limiter.allowed) {
    return { ok: false, message: "Too many look-ups. Wait a few minutes, then try again." };
  }

  const [row] = await db
    .select({ fullName: users.fullName, region: users.region, facility: users.facility })
    .from(users)
    .where(sql`lower(${users.ghsStaffId}) = ${staffId.toLowerCase()}`)
    .limit(1);

  if (!row) {
    return {
      ok: false,
      message: "That Staff ID is not in the directory. You can still lodge the complaint — fill in your name below.",
      person: null,
    };
  }
  return { ok: true, message: "Found you. Check the name below, then fill in the rest.", person: row };
}

/** Administrators answer a complaint. The answer is the record; the status follows it. */
export async function respondToComplaintAction(
  _previous: ComplaintState,
  formData: FormData,
): Promise<ComplaintState> {
  const session = await requireRole(["SYSTEM_ADMIN"]);
  const complaintId = field(formData, "complaintId") ?? "";
  const response = (field(formData, "response") ?? "").trim();
  const resolve = field(formData, "resolve") === "on";

  if (!complaintId) return { ok: false, message: "That complaint could not be identified. Reload the page." };
  if (response.length < 10) {
    return { ok: false, message: "Write the answer as you would say it — at least a sentence." };
  }

  const now = new Date();
  try {
    await db
      .update(complaints)
      .set({
        response,
        status: resolve ? "RESOLVED" : "IN_PROGRESS",
        respondedById: session.sub,
        respondedAt: now,
        resolvedAt: resolve ? now : null,
        updatedAt: now,
      })
      .where(eq(complaints.id, complaintId));

    await logAudit({
      actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
      action: resolve ? "COMPLAINT_RESOLVED" : "COMPLAINT_ANSWERED",
      entity: "complaint",
      entityId: complaintId,
      metadata: { length: response.length },
    });
  } catch (error) {
    log.error({ event: "complaint.respond_failed", err: String(error) });
    return { ok: false, message: "The answer was not saved. Try again in a moment." };
  }

  revalidatePath("/complaints");
  return { ok: true, message: resolve ? "Answered and closed. The person can read it with their Staff ID." : "Answer saved." };
}

/**
 * Resets a person's access from inside a complaint: a new temporary password, an
 * optional corrected email, and — when Supabase has SMTP configured — the usual
 * "choose your own password" link. The temporary password is returned once so the
 * administrator can read it down the phone; it is never stored in clear text.
 */
export async function resetAccessAction(_previous: ComplaintState, formData: FormData): Promise<ComplaintState> {
  const session = await requireRole(["SYSTEM_ADMIN"]);
  const complaintId = field(formData, "complaintId") ?? null;
  const emailRaw = (field(formData, "email") ?? "").trim();
  const staffIdRaw = (field(formData, "staffId") ?? "").trim();
  const note = (field(formData, "note") ?? "").trim();

  const email = z.string().email().safeParse(emailRaw.toLowerCase());
  if (!email.success) return { ok: false, message: "Enter the email address this person signs in with." };

  const [person] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, staffId: users.ghsStaffId })
    .from(users)
    .where(
      staffIdRaw
        ? sql`lower(${users.ghsStaffId}) = ${staffIdRaw.toLowerCase()}`
        : sql`lower(${users.email}) = ${email.data}`,
    )
    .limit(1);

  if (!person) {
    return {
      ok: false,
      message: "No directory record matches that staff ID or email. Check the details, or add them under Users first.",
    };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      message:
        "Access cannot be reset from here: SUPABASE_SERVICE_ROLE_KEY is not set. Run the password reset script on the server instead.",
    };
  }

  const password = temporaryPassword();

  // The auth user is matched by the directory email before it is changed, so a
  // corrected address moves the same identity rather than creating a second one.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) {
    log.error({ event: "complaint.reset_list_failed", err: listError.message });
    return { ok: false, message: "Supabase did not answer. Try again in a moment." };
  }
  const authUser = list.users.find((candidate) => candidate.email?.toLowerCase() === person.email.toLowerCase());

  if (!authUser) {
    return {
      ok: false,
      message: `${person.fullName} has a directory record but no sign-in yet. Create the login from Users, then reset.`,
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email: email.data !== person.email.toLowerCase() ? email.data : undefined,
    email_confirm: true,
  });
  if (updateError) {
    log.error({ event: "complaint.reset_failed", err: updateError.message });
    return { ok: false, message: `Supabase refused the change: ${updateError.message}` };
  }

  await db
    .update(users)
    .set({ email: email.data, updatedAt: new Date() })
    .where(eq(users.id, person.id));

  // A recovery link is the better experience when mail is configured; the
  // temporary password is the fallback that always works.
  const origin = displayOrigin();
  const supabase = await createSupabaseServerClient();
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: origin ? `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}` : undefined,
  });

  const detail = `Access reset. Temporary password: ${password}. Sign in with it and change it straight away.`;
  if (complaintId) {
    await db
      .update(complaints)
      .set({
        status: "RESOLVED",
        response: note ? `${note}\n\n${detail}` : detail,
        respondedById: session.sub,
        respondedAt: new Date(),
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, complaintId));
    revalidatePath("/complaints");
  }

  await logAudit({
    actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
    action: "ACCESS_RESET",
    entity: "user",
    entityId: person.id,
    metadata: { complaintId, emailChanged: email.data !== person.email.toLowerCase(), mailSent: !mailError },
  });

  return {
    ok: true,
    credentials: { email: email.data, password },
    message: mailError
      ? `${person.fullName}: ${detail} Read it to them — email is not configured, so nothing was sent.`
      : `${person.fullName}: a "choose a new password" email was sent to ${email.data}. The temporary password below works too, if they would rather be read it over the phone.`,
  };
}

/* ── Checking a complaint's status ─────────────────────────────────────────── */

export interface StatusLookupState {
  ok: boolean;
  message: string | null;
  /** Which staff ID was searched, so the result can say "nothing under 1587583". */
  staffId?: string | null;
  results?: {
    reference: string;
    issueType: (typeof ISSUE_TYPES)[number];
    subject: string;
    status: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED";
    response: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }[];
}

/**
 * Looks a person's complaints up by staff ID — the one identifier every member of
 * staff knows by heart and can read down a phone. Rate-limited like the rest of
 * the public side; it returns the answer but never the contact details.
 */
export async function lookupComplaintsAction(
  _previous: StatusLookupState,
  formData: FormData,
): Promise<StatusLookupState> {
  const staffId = (field(formData, "staffId") ?? "").trim();
  if (!staffId) return { ok: false, message: "Type the Staff ID you lodged the complaint under." };

  const limiter = await consumeRateLimit(rateLimitKey("complaint-status", await clientAddress()), 30, 10 * 60).catch(
    () => null,
  );
  if (limiter && !limiter.allowed) {
    return { ok: false, message: "Too many checks from this connection. Wait a few minutes, then try again." };
  }

  const rows = await complaintsForStaffId(staffId);
  if (rows.length === 0) {
    return {
      ok: false,
      staffId,
      message: "Nothing is lodged under that Staff ID. Check the number, or lodge the complaint now.",
      results: [],
    };
  }

  return {
    ok: true,
    staffId,
    message: null,
    results: rows.map((row) => ({
      reference: row.reference,
      issueType: row.issueType,
      subject: row.subject,
      status: row.status,
      response: row.response,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    })),
  };
}
