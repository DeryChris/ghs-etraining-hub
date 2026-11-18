import Link from "next/link";
import { BookOpen, Download, Eye } from "lucide-react";
import { KindLabel } from "@/components/ui/kind-label";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { getMyTraffic } from "@/lib/server/insights-queries";
import { listCompletions } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "My activity" };

/** The transcript shows the most recent completions; the rest stay in the record. */
const TRANSCRIPT_ROWS = 25;

export default async function ActivityPage() {
  const session = await requireSession();
  const [completions, traffic] = await Promise.all([listCompletions(session.sub), getMyTraffic(session.sub)]);

  const recent = completions.slice(0, TRANSCRIPT_ROWS);
  const issuedCertificates = completions.filter((completion) => completion.certificateCode !== null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My record"
        title="My activity"
        description="What you have opened, downloaded and marked as finished. The library records this so you can find your way back to the material from a training you attended."
        actions={
          <Link href="/library" className={buttonClass({ variant: "secondary" })}>
            Browse the library
          </Link>
        }
      />

      <section aria-label="Your activity" className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-3">
        <Stat value={traffic.opens} label={`Material opens · last ${traffic.days} days`} />
        <Stat value={traffic.downloads} label={`Downloads · last ${traffic.days} days`} />
        <Stat value={completions.length} label="Marked as finished" />
      </section>

      <section aria-labelledby="transcript-heading" className="space-y-4">
        <div>
          <h2 id="transcript-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            What you have finished
          </h2>
          <p className="text-sm text-ink-muted">
            Newest first. A completion records the version you read, so a replaced protocol does not rewrite your history.
          </p>
        </div>

        {recent.length === 0 ? (
          <ListEmptyState
            title="Nothing marked as finished yet"
            description="Open a material from the library and mark it complete when you are done. It will appear here."
            actionText="Browse the library"
            actionHref="/library"
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-panel">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">Materials you have marked as finished</caption>
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Material
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Module
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Finished
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((completion) => (
                  <tr key={`${completion.materialId}-${completion.completedAt?.toISOString() ?? ""}`} className="border-b border-hairline/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/materials/${completion.materialId}`} className="inline-flex items-center gap-2 font-semibold text-ink hover:text-primary">
                        <KindLabel type={completion.type} />
                        {completion.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">{MATERIAL_TYPE_LABELS[completion.type]}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{completion.areaName}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(completion.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {completions.length > TRANSCRIPT_ROWS && (
          <p className="text-sm text-ink-muted">
            Showing the {TRANSCRIPT_ROWS} most recent of {completions.length}. Older completions stay in the record.
          </p>
        )}
      </section>

      <section aria-labelledby="certificates-heading" className="space-y-3 rounded-card border border-hairline bg-surface-2 p-5">
        <h2 id="certificates-heading" className="flex items-center gap-2 text-base font-bold text-ink">
          <Eye className="h-4 w-4 text-primary" aria-hidden />
          Certificates already issued
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">
          The library no longer awards certificates — material is here to be read, not to be scored. Any certificate
          issued before that change remains valid and can still be checked on the{" "}
          <Link href="/verify" className="font-semibold text-primary underline-offset-4 hover:underline">
            verification page
          </Link>
          .
        </p>
        {issuedCertificates.length > 0 && (
          <ul className="space-y-1 text-sm">
            {issuedCertificates.slice(0, 5).map((completion) => (
              <li key={completion.certificateCode}>
                <Link
                  href={`/certificates/${completion.certificateCode}`}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  {completion.certificateCode}
                </Link>
                <span className="ml-2 text-ink-muted">{completion.title}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Download className="h-3.5 w-3.5" aria-hidden />
          Downloads are recorded for controlled material, so the record shows what left the platform.
        </p>
      </section>
    </div>
  );
}
