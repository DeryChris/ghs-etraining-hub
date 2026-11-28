import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { complaintMessages, complaints } from "@/db/schema";
import { redactLegacyTemporaryPassword } from "@/lib/complaint-response";
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
  const rows = await db
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

  // Credentials from responses written by earlier reset flows are never safe to
  // return through this unauthenticated Staff-ID lookup.
  return rows.map((row) => ({ ...row, response: redactLegacyTemporaryPassword(row.response) }));
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
/**
 * The complaints desk.
 *
 * `districtId` is the District HR boundary: their queue is the complaints filed
 * in their district and no others. `null` means "this person holds no district",
 * which cannot be satisfied — the honest result is an empty queue, not the whole
 * country. `undefined` is an administrator, who sees everything, including the
 * complaints with no district at all.
 */
export async function listComplaints(
  status?: "OPEN" | "RESOLVED" | "ALL",
  districtId?: string | null,
): Promise<AdminComplaint[]> {
  const byStatus =
    status === "RESOLVED"
      ? sql`${complaints.status} = 'RESOLVED'`
      : status === "ALL" || status === undefined
        ? undefined
        : sql`${complaints.status} <> 'RESOLVED'`;
  const byDistrict =
    districtId === undefined ? undefined : districtId === null ? sql`false` : eq(complaints.districtId, districtId);
  const where = and(byStatus, byDistrict);

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

/** Same boundary as `listComplaints`: the badge must not count other districts' work. */
export async function openComplaintCount(districtId?: string | null): Promise<number> {
  const byDistrict =
    districtId === undefined ? undefined : districtId === null ? sql`false` : eq(complaints.districtId, districtId);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(complaints)
    .where(and(sql`${complaints.status} <> 'RESOLVED'`, byDistrict));
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
