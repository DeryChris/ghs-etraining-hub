import Link from "next/link";
import { AlertTriangle, ClipboardCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { getInsights, type Insights } from "@/lib/server/insights-queries";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Insights" };

function ProgrammeTable({ insights }: { insights: Insights }) {
  const busiest = Math.max(1, ...insights.programmes.map((programme) => programme.published));
  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-panel">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <caption className="sr-only">Published and in-review material by programme</caption>
        <thead>
          <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.14em] text-ink-muted">
            <th scope="col" className="px-4 py-3 font-semibold">
              Programme
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Published
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              In review
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Spaces
            </th>
          </tr>
        </thead>
        <tbody>
          {insights.programmes.map((programme) => (
            <tr key={programme.id} className="border-b border-hairline/60 last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                {programme.name}
                <span className="ml-2 text-xs font-normal text-ink-muted">{programme.code}</span>
              </th>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((programme.published / busiest) * 100)}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-ink">{programme.published}</span>
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums text-ink-muted">{programme.inReview}</td>
              <td className="px-4 py-3 tabular-nums text-ink-muted">{programme.spaces}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function InsightsPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const insights = await getInsights(session);
  const admin = session.role === "SYSTEM_ADMIN";
  const nothingPublished = insights.catalogue.published === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title={admin ? "Service insights" : "Programme insights"}
        description={
          admin
            ? "What the library holds, what is waiting for review, and what staff have completed — across every directorate."
            : "What the programmes you are assigned to hold, what is waiting for your review, and what staff have completed in them."
        }
        actions={
          <>
            <Link href="/review" className={buttonClass({ variant: "secondary" })}>
              Review queue {insights.catalogue.inReview > 0 ? `(${insights.catalogue.inReview})` : ""}
            </Link>
            <Link href="/users" className={buttonClass({ variant: "ghost", className: admin ? "" : "hidden" })}>
              Manage users
            </Link>
          </>
        }
      />

      <section aria-label="Headline numbers" className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={insights.catalogue.published} label="Published materials" />
        <Stat value={insights.catalogue.inReview} label="Awaiting review" />
        <Stat value={insights.learning.completionsInWindow} label={`Completions · last ${insights.windowDays} days`} />
        <Stat
          value={insights.learning.certificatesInWindow}
          label={`Certificates issued · last ${insights.windowDays} days`}
        />
      </section>

      {nothingPublished ? (
        <ListEmptyState
          title="Nothing published yet"
          description={
            admin
              ? "Once a facilitator publishes a material, coverage per programme appears here."
              : "Once a material is published in a programme you run, it appears here."
          }
          actionText="Go to my materials"
          actionHref={admin ? "/directorates" : "/authoring"}
          art="folder"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-labelledby="programmes-heading" className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 id="programmes-heading" className="text-lg font-bold text-ink">
                  Coverage by programme
                </h2>
                <p className="text-sm text-ink-muted">
                  Published material, the review backlog behind it, and how many spaces each programme runs.
                </p>
              </div>
              <TrendingUp className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            </div>
            <ProgrammeTable insights={insights} />
            {insights.programmes.length === 0 && (
              <p className="text-sm text-ink-muted">No programme in your scope has a space yet.</p>
            )}
          </section>

          <div className="space-y-6">
            <section aria-labelledby="gaps-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-5 shadow-panel">
              <h2 id="gaps-heading" className="flex items-center gap-2 text-base font-bold text-ink">
                <AlertTriangle className="h-4 w-4 text-primary" aria-hidden />
                Nothing published
              </h2>
              {insights.gaps.length === 0 ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  Every programme in scope has at least one published material.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {insights.gaps.slice(0, 8).map((gap) => (
                    <li key={gap.id} className="flex items-center gap-2 text-ink">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      {gap.name}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs leading-relaxed text-ink-muted">
                A programme with no published material is where the library is thinnest: staff in it have nothing to open.
              </p>
            </section>

            <section aria-labelledby="catalogue-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-5 shadow-panel">
              <h2 id="catalogue-heading" className="flex items-center gap-2 text-base font-bold text-ink">
                <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
                Catalogue health
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Programmes in scope</dt>
                  <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.programmes}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Spaces</dt>
                  <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.spaces}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Drafts</dt>
                  <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.draft}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Archived</dt>
                  <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.archived}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Certificates issued (all time)</dt>
                  <dd className="tabular-nums font-semibold text-ink">{insights.learning.certificatesTotal}</dd>
                </div>
                {insights.learning.verifications !== null && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-muted">Certificate look-ups</dt>
                    <dd className="tabular-nums font-semibold text-ink">{insights.learning.verifications}</dd>
                  </div>
                )}
              </dl>
            </section>

            {insights.people && (
              <section aria-labelledby="people-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-5 shadow-panel">
                <h2 id="people-heading" className="text-base font-bold text-ink">
                  Active staff
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{insights.people.total} accounts</Badge>
                  <Badge variant="outline">{insights.people.facilitators} facilitators</Badge>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">Learners</span>
                    <span className="tabular-nums font-semibold text-ink">{insights.people.learners}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">Facilitators</span>
                    <span className="tabular-nums font-semibold text-ink">{insights.people.facilitators}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-ink-muted">System administrators</span>
                    <span className="tabular-nums font-semibold text-ink">{insights.people.admins}</span>
                  </li>
                </ul>
                <Link href="/users" className={buttonClass({ variant: "ghost", size: "sm" })}>
                  Open the user directory
                </Link>
              </section>
            )}
          </div>
        </div>
      )}

      <p className="rounded-card border border-hairline bg-surface-2 p-5 text-sm leading-relaxed text-ink-muted">
        Downloads per material, per-region reach and time-to-completion are not measured yet — the audit trail records
        every download, so those figures can be added without changing how the platform records them.
      </p>
    </div>
  );
}
