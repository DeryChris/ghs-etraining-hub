import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { BroadcastForm } from "@/components/notices/broadcast-form";
import { formatDateTime } from "@/lib/format";
import { notificationTypeLabel } from "@/lib/labels";
import { listAuthoringSpaces } from "@/lib/server/authoring-queries";
import { listSentNotices } from "@/lib/server/notification-queries";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const [spaces, sent] = await Promise.all([listAuthoringSpaces(session), listSentNotices(10)]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Official notices"
        title="Send a notice"
        description="Tell a cohort about a changed protocol, a planned outage or a new requirement. Notices appear in their bell and on their notifications page."
      />

      <div className="flex flex-wrap gap-3">
        <Link href="/notifications" className={buttonClass({ variant: "secondary" })}>
          What people see
        </Link>
        <Link href="/authoring" className={buttonClass({ variant: "ghost" })}>
          My materials
        </Link>
      </div>

      <section aria-labelledby="compose-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
        <h2 id="compose-heading" className="text-base font-bold text-ink">
          Compose
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-muted">
          A notice is an instruction to staff, so the sender, audience and text are recorded in the audit trail.
        </p>
        <BroadcastForm spaces={spaces} canAddressEveryone={session.role === "SYSTEM_ADMIN"} />
      </section>

      <section aria-labelledby="sent-heading" className="space-y-4">
        <h2 id="sent-heading" className="text-base font-bold text-ink">
          Recently sent
        </h2>
        {sent.length === 0 ? (
          <p className="rounded-control border border-dashed border-hairline bg-surface/60 px-4 py-8 text-center text-sm text-ink-muted">
            No notices have been sent yet.
          </p>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
            {sent.map((notice) => (
              <li key={notice.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
                <span className="text-sm font-semibold text-ink">{notice.title}</span>
                <Badge variant="outline">{notificationTypeLabel(notice.type)}</Badge>
                <span className="text-xs text-ink-muted">{notice.audienceLabel}</span>
                <span className="text-xs text-ink-muted">
                  sent {formatDateTime(notice.publishedAt)}
                  {notice.expiresAt ? ` · expires ${formatDateTime(notice.expiresAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
