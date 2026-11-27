import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { complaintMessages, complaints } from "@/db/schema";
import type { ComplaintIssue } from "@/lib/labels";

/**
 * Reads for the Complaint Hub. The public read is deliberately narrow: a staff ID
 * shows the complaints lodged under it, and each one shows its status, its dates,
 * the subject and the answer — never the phone number, the email or the other
 * complaints' detail.
 */

export interface PublicComplaint {
  reference: string;
  issueType: ComplaintIssue;
  /** Set when the complaint is about a file on a particular training. */
  trainingTitle: string | null;
  subject: string;
  status: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED";
  response: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export async function complaintsForStaffId(staffId: string): Promise<PublicComplaint[]> {
  return db
    .select({
      reference: complaints.reference,
      issueType: complaints.issueType,
      trainingTitle: complaints.trainingTitle,
      subject: complaints.subject,
      status: complaints.status,
      response: complaints.response,
      createdAt: complaints.createdAt,
      resolvedAt: complaints.resolvedAt,
    })
    .from(complaints)
    .where(sql`lower(${complaints.staffId}) = ${staffId.trim().toLowerCase()}`)
    .orderBy(desc(complaints.createdAt))
    .limit(10);
}

export interface AdminComplaint extends PublicComplaint {
  id: string;
  staffId: string | null;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  region: string | null;
  facility: string | null;
  description: string;
}

/** The whole queue, newest first. Administrators read the contact details here. */
export async function listComplaints(status?: "OPEN" | "RESOLVED" | "ALL"): Promise<AdminComplaint[]> {
  const where =
    status === "RESOLVED"
      ? sql`${complaints.status} = 'RESOLVED'`
      : status === "ALL" || status === undefined
        ? undefined
        : sql`${complaints.status} <> 'RESOLVED'`;

  return db
    .select({
      id: complaints.id,
      reference: complaints.reference,
      staffId: complaints.staffId,
      userId: complaints.userId,
      fullName: complaints.fullName,
      email: complaints.email,
      phone: complaints.phone,
      region: complaints.region,
      facility: complaints.facility,
      issueType: complaints.issueType,
      trainingTitle: complaints.trainingTitle,
      subject: complaints.subject,
      description: complaints.description,
      status: complaints.status,
      response: complaints.response,
      createdAt: complaints.createdAt,
      resolvedAt: complaints.resolvedAt,
    })
    .from(complaints)
    .where(where)
    .orderBy(desc(complaints.createdAt))
    .limit(200);
}

export async function openComplaintCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(complaints)
    .where(sql`${complaints.status} <> 'RESOLVED'`);
  return row?.n ?? 0;
}

/* ── The thread ─────────────────────────────────────────────────────────────── */

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  authorRole: "STAFF" | "DESK";
  authorName: string;
  body: string;
  createdAt: Date;
}

/** All messages for a set of complaints, grouped by complaint, oldest first. */
export async function messagesByComplaint(ids: string[]): Promise<Map<string, ComplaintMessage[]>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({
      id: complaintMessages.id,
      complaintId: complaintMessages.complaintId,
      authorRole: complaintMessages.authorRole,
      authorName: complaintMessages.authorName,
      body: complaintMessages.body,
      createdAt: complaintMessages.createdAt,
    })
    .from(complaintMessages)
    .where(inArray(complaintMessages.complaintId, ids))
    .orderBy(asc(complaintMessages.createdAt));

  const grouped = new Map<string, ComplaintMessage[]>();
  for (const row of rows) {
    const list = grouped.get(row.complaintId) ?? [];
    list.push({ ...row, authorRole: row.authorRole === "STAFF" ? "STAFF" : "DESK" });
    grouped.set(row.complaintId, list);
  }
  return grouped;
}

/** The thread a staff member sees on the public status page. */
export async function threadForReference(reference: string, staffId: string): Promise<ComplaintMessage[]> {
  const [row] = await db
    .select({ id: complaints.id })
    .from(complaints)
    .where(and(eq(complaints.reference, reference.trim().toUpperCase()), sql`lower(${complaints.staffId}) = ${staffId.trim().toLowerCase()}`))
    .limit(1);
  if (!row) return [];
  const grouped = await messagesByComplaint([row.id]);
  return grouped.get(row.id) ?? [];
}
