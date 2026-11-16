import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PageHeader } from "@/components/ui/page-header";
import { KindLabel } from "@/components/ui/kind-label";
import { ListEmptyState } from "@/components/ui/empty-state";
import { CPD_CYCLE_TARGET_POINTS, pointsFromCreditsX10 } from "@/lib/cpd";
import { formatCredits, formatDate } from "@/lib/format";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { getLearnerDashboard, listCompletions } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";

const MONTHS = 6;
/** The transcript renders the most recent completions; the rest stay in the record. */
const TRANSCRIPT_ROWS = 25;

function monthBuckets(now: Date) {
  return Array.from({ length: MONTHS }, (_, index) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - index), 1));
    return {
      key: `${start.getUTCFullYear()}-${start.getUTCMonth()}`,
      label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(start),
      count: 0,
    };
  });
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

export default async function AnalyticsPage() {
  const session = await requireSession();
  const now = new Date();
  const [dashboard, completions] = await Promise.all([getLearnerDashboard(session), listCompletions(session.sub)]);

  const buckets = monthBuckets(now);
  for (const completion of completions) {
    if (!completion.completedAt) continue;
    const bucket = buckets.find((b) => b.key === monthKey(completion.completedAt as Date));
    if (bucket) bucket.count += 1;
  }
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const byType = MATERIAL_TYPES.map((type) => ({
    type,
    count: completions.filter((c) => c.type === type).length,
  }));
  const totalCompletions = completions.length;

  const transcript = completions.slice(0, TRANSCRIPT_ROWS);
  const points = pointsFromCreditsX10(dashboard.creditsX10);
  const pointsPercent = (points / CPD_CYCLE_TARGET_POINTS) * 100;
  const mandatoryDone = dashboard.mandatoryTotal - dashboard.mandatoryOutstanding.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Personal CPD record"
        title="Analytics"
        description="Your points, completions and progress against this cycle's target. Only you can see this page."
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">CPD points</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">
            {points.toFixed(1)} <span className="text-base font-semibold text-ink-muted">of {CPD_CYCLE_TARGET_POINTS}</span>
          </p>
          <div className="mt-4">
            <ProgressBar value={pointsPercent} label="CPD points against the cycle target" />
          </div>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Completed</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{dashboard.completedCount}</p>
          <p className="mt-1 text-xs text-ink-muted">Recorded on your transcript</p>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Mandatory</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">
            {mandatoryDone} <span className="text-base font-semibold text-ink-muted">of {dashboard.mandatoryTotal}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">Protocols acknowledged</p>
        </div>
        <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">In progress</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-ink">{dashboard.inProgressCount}</p>
          <p className="mt-1 text-xs text-ink-muted">Materials you have started</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="monthly-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-5 shadow-panel lg:col-span-2">
          <div>
            <h2 id="monthly-heading" className="text-base font-bold text-ink">
              Completions, last {MONTHS} months
            </h2>
            <p className="text-sm text-ink-muted">Materials completed each month.</p>
          </div>
          <ol className="flex h-44 items-stretch gap-3" aria-label="Completions per month">
            {buckets.map((bucket) => (
              <li key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-ink">{bucket.count}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    aria-hidden
                    className="w-full rounded-t-control bg-primary/70"
                    style={{ height: `${(bucket.count / maxCount) * 100}%`, minHeight: bucket.count > 0 ? "4px" : "0" }}
                  />
                </div>
                <span className="text-[11px] text-ink-muted">{bucket.label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="types-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <div>
            <h2 id="types-heading" className="text-base font-bold text-ink">
              By material type
            </h2>
            <p className="text-sm text-ink-muted">Share of your {totalCompletions} completions.</p>
          </div>
          <ul className="space-y-4">
            {byType.map((row) => (
              <li key={row.type} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <KindLabel type={row.type} />
                    {MATERIAL_TYPE_LABELS[row.type]}
                  </span>
                  <span className="tabular-nums text-ink-muted">{row.count}</span>
                </div>
                <ProgressBar
                  value={totalCompletions > 0 ? (row.count / totalCompletions) * 100 : 0}
                  label={`${MATERIAL_TYPE_LABELS[row.type]} share of completions`}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="transcript-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="transcript-heading" className="text-lg font-bold text-ink">
              CPD transcript
            </h2>
            <p className="text-sm text-ink-muted">
              Each completed material, with the points it earned.
              {completions.length > TRANSCRIPT_ROWS
                ? ` Showing the ${TRANSCRIPT_ROWS} most recent of ${completions.length}.`
                : ""}
            </p>
          </div>
        </div>

        {completions.length === 0 ? (
          <ListEmptyState
            title="No completions yet"
            description="Completed materials appear here with their CPD points. Start with a mandatory protocol in the library."
          />
        ) : (
          <>
            <ul className="space-y-3 sm:hidden">
              {transcript.map((row) => (
                <li key={row.materialId} className="rounded-card border border-hairline bg-surface p-4">
                  <Link href={`/materials/${row.materialId}`} className="font-semibold text-ink hover:text-primary">
                    {row.title}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    {row.spaceTitle} · {formatDate(row.completedAt)}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold text-primary">
                    {formatCredits(row.creditsX10)}
                    {row.certificateCode && (
                      <Link href={`/certificates/${row.certificateCode}`} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                        Certificate
                      </Link>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-card border border-hairline bg-surface sm:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Completed materials and CPD points</caption>
                <thead className="bg-surface-2 text-xs uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Completed</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Material</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Space</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Certificate</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">CPD points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {transcript.map((row) => (
                    <tr key={row.materialId} className="hover:bg-surface-2/60">
                      <td className="px-4 py-3 text-ink-muted">{formatDate(row.completedAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/materials/${row.materialId}`} className="font-semibold text-ink hover:text-primary">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{row.spaceTitle}</td>
                      <td className="px-4 py-3">
                        {row.certificateCode ? (
                          <Link
                            href={`/certificates/${row.certificateCode}`}
                            className="font-mono text-xs font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {row.certificateCode}
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-muted">Not issued</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">{formatCredits(row.creditsX10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
