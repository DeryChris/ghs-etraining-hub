import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import {
  listComplaints,
  messagesByComplaint,
  openComplaintCount,
  type ComplaintMessage,
} from "@/lib/server/complaint-queries";
import { withDeadline } from "@/lib/server/page-data";
import { requireRole } from "@/lib/server/rbac";

export const metadata: Metadata = { title: "Complaints" };
export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" },
] as const;

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // A working desk, not an administrator-only archive: facilitators and unit
  // heads answer what they are assigned; resetting access stays administrator-only.
  await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const params = await searchParams;
  const filter = FILTERS.some((entry) => entry.key === params.status)
    ? (params.status as "OPEN" | "RESOLVED" | "ALL")
    : "OPEN";

  const loaded = await withDeadline(
    "complaints",
    Promise.all([listComplaints(filter), openComplaintCount()]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The complaint desk did not load"
        description="The complaint list could not be read in time. Nothing was changed and no complaint was answered."
        requestId={loaded.requestId}
      />
    );
  }
  const [rows, openCount] = loaded.data;
  // The thread is a nicety: if it cannot be read, the complaint still shows.
  const threads = await messagesByComplaint(rows.map((row) => row.id)).catch(
    (): Map<string, ComplaintMessage[]> => new Map(),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Complaint Hub"
        title="Complaints"
        description="What staff have reported, newest first. Answer in writing, or reset somebody's access details from the complaint itself — the answer and the reset stay on the record with your name against them."
      />

      <div className="flex flex-wrap items-end gap-8">
        <Stat value={openCount} label={openCount === 1 ? "Open complaint" : "Open complaints"} />
        <Stat value={rows.length} label={filter === "OPEN" ? "Shown here" : `Shown (${filter.toLowerCase()})`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <Link
            key={entry.key}
            href={`/complaints?status=${entry.key}`}
            aria-current={filter === entry.key ? "true" : undefined}
            className={
              filter === entry.key
                ? "inline-flex min-h-10 items-center rounded-control border border-primary bg-primary px-3 text-sm font-semibold text-primary-ink"
                : "inline-flex min-h-10 items-center rounded-control border border-hairline bg-surface px-3 text-sm font-semibold text-ink-muted hover:border-primary/40 hover:text-ink"
            }
          >
            {entry.label}
          </Link>
        ))}
        <Link href="/help/report" className={buttonClass({ variant: "ghost", size: "sm", className: "ml-auto" })}>
          <Inbox className="h-4 w-4" aria-hidden />
          See the public form
        </Link>
      </div>

      {rows.length === 0 ? (
        <ListEmptyState
          title={filter === "OPEN" ? "Nothing waiting" : "Nothing here yet"}
          description={
            filter === "OPEN"
              ? "Every complaint lodged so far has been answered and closed. New ones appear here the moment they are lodged."
              : "Complaints lodged from the public Complaint Hub are filed here, with the answer that was given."
          }
          art="inbox"
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <ComplaintCard
              key={row.id}
              complaint={{
                id: row.id,
                reference: row.reference,
                staffId: row.staffId,
                fullName: row.fullName,
                email: row.email,
                phone: row.phone,
                region: row.region,
                facility: row.facility,
                issueType: row.issueType,
                subject: row.subject,
                description: row.description,
                status: row.status,
                response: row.response,
                createdAt: row.createdAt.toISOString(),
                resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
                messages: (threads.get(row.id) ?? []).map((message) => ({
                  id: message.id,
                  authorRole: message.authorRole,
                  authorName: message.authorName,
                  body: message.body,
                  createdAt: message.createdAt.toISOString(),
                })),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
