import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Download, Eye, TrendingUp } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard, EmptyChart, chartColor } from "@/components/charts/chart-card";
import { KpiCard, KpiGrid } from "@/components/charts/kpi-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { RankBars } from "@/components/charts/rank-bars";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { MATERIAL_TYPE_LABELS } from "@/lib/labels";
import {
  getInsights,
  getProgrammeTraffic,
  getTrainingCounts,
  getTrainingSeries,
  getTrafficSeries,
  getTypeMix,
  getUploadSeries,
  periodDelta,
} from "@/lib/server/insights-queries";

import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Insights" };

export default async function InsightsPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const admin = session.role === "SYSTEM_ADMIN";
  // The review queue is a sign-off duty: administrators and unit heads only.
  const reviewer = admin || session.unitHead === true;

  /*
   * Two classes of figure, loaded differently.
   *
   * The headline numbers are the page: without them there is nothing to show, so
   * they get the deadline and the retry card. The five charts underneath are
   * supporting detail — a slow chart under a cold Neon connection must not blank
   * a page whose totals did arrive, so each one falls back to an empty series and
   * the page says so quietly instead of failing.
   */
  const essential = await withDeadline("insights", () =>
    mapLimit([() => getInsights(session), () => getTrainingCounts(session)]),
  );
  if (!essential.ok) {
    return (
      <DataUnavailable
        title="Insights did not load"
        description="The traffic and catalogue figures could not be read in time. The numbers on this page are recomputed per request, so nothing is stale or lost."
        requestId={essential.requestId}
      />
    );
  }
  const [insights, trainingCounts] = essential.data;

  const optional = await withDeadline(
    "insights.series",
    () =>
      mapLimit(
        [
          () => getTrafficSeries(session, 12),
          () => getUploadSeries(session, 12),
          () => getTrainingSeries(session, 12),
          () => getProgrammeTraffic(session, 30),
          () => getTypeMix(session),
        ],
        4,
      ),
    8_000,
  );

  // Empty shapes rather than nulls: every chart below already knows how to draw
  // "nothing yet", and the page keeps its layout while the figures arrive.
  const traffic = optional.ok ? optional.data[0] : { buckets: [], views: [], downloads: [], totals: { views: 0, downloads: 0 } };
  const uploads = optional.ok ? optional.data[1] : { buckets: [], series: [], total: 0 };
  const sessions = optional.ok ? optional.data[2] : { buckets: [], counts: [], byProgramme: [], total: 0 };
  const programmeTraffic = optional.ok ? optional.data[3] : [];
  const typeMix = optional.ok
    ? optional.data[4]
    : (["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const).map((type) => ({ type, count: 0 }));
  const partial = !optional.ok;

  const hasTraffic = traffic.totals.views + traffic.totals.downloads > 0;
  const hasUploads = uploads.total > 0;
  const hasSessions = sessions.total > 0;
  const typeTotal = typeMix.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="space-y-8">
      {partial && (
        <p className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm leading-relaxed text-ink">
          The headline figures loaded, but the charts below did not answer in time. Refresh in a moment to fill them in
          — nothing has been lost.
        </p>
      )}

      <PageHeader
        eyebrow="Insights"
        title={admin ? "Service insights" : "Programme insights"}
        description={
          admin
            ? "Traffic, upload rate and the trainings that ran — across every programme. Views are counted once per person per day; downloads come from the audit trail."
            : "Traffic, upload rate and the trainings that ran in the programmes you are assigned to. Views are counted once per person per day."
        }
        actions={
          <>
            <Link href="/trainings" className={buttonClass({ variant: "secondary" })}>
              Open the register
            </Link>
            {reviewer && (
              <Link href="/review" className={buttonClass({ variant: "ghost" })}>
                Review queue {insights.catalogue.inReview > 0 ? `(${insights.catalogue.inReview})` : ""}
              </Link>
            )}
          </>
        }
      />

      <KpiGrid>
        <KpiCard
          icon={Eye}
          label="Material opens · 12 weeks"
          value={traffic.totals.views}
          hint="Once per person per day"
          delta={periodDelta(traffic.views)}
          spark={traffic.views}
          color="var(--chart-4)"
        />
        <KpiCard
          icon={Download}
          label="Downloads · 12 weeks"
          value={traffic.totals.downloads}
          hint="From the audit trail"
          delta={periodDelta(traffic.downloads)}
          spark={traffic.downloads}
          color="var(--chart-1)"
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Trainings · 90 days"
          value={trainingCounts.last90Days}
          hint={`${trainingCounts.total} on record`}
          spark={sessions.counts}
          color="var(--chart-5)"
        />
        <KpiCard
          icon={TrendingUp}
          label="Published materials"
          value={insights.catalogue.published}
          hint={`${insights.catalogue.inReview} awaiting review`}
          color="var(--chart-6)"
        />
      </KpiGrid>

      <ChartCard
        title="Traffic"
        description="Opens of published material against file downloads, by week. A quiet week in one programme is information, not a gap in the data."
        series={[
          { label: "Opens", color: "var(--chart-1)" },
          { label: "Downloads", color: "var(--chart-4)" },
        ]}
        table={{
          head: ["Week of", "Opens", "Downloads"],
          rows: traffic.buckets.map((bucket, index) => [bucket.label, traffic.views[index] ?? 0, traffic.downloads[index] ?? 0]),
        }}
      >
        {hasTraffic ? (
          <AreaChart
            labels={traffic.buckets.map((bucket) => bucket.label)}
            series={[
              { label: "Opens", color: "var(--chart-1)", values: traffic.views },
              { label: "Downloads", color: "var(--chart-4)", values: traffic.downloads },
            ]}
            unit="opens"
            height={240}
          />
        ) : (
          <EmptyChart message="No opens recorded yet. Views start counting from the first material someone opens after this deploy." />
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Upload rate"
          description="New versions filed per month, split by the programmes doing the uploading."
          series={uploads.series.map((item, index) => ({ label: item.label, color: chartColor(index) }))}
          table={{
            head: ["Month", ...uploads.series.map((item) => item.label)],
            rows: uploads.buckets.map((bucket, index) => [bucket.label, ...uploads.series.map((item) => item.values[index] ?? 0)]),
          }}
        >
          {hasUploads ? (
            <BarChart
              labels={uploads.buckets.map((bucket) => bucket.label)}
              series={uploads.series.map((item, index) => ({ label: item.label, color: chartColor(index), values: item.values }))}
              height={230}
            />
          ) : (
            <EmptyChart message="No versions uploaded in the last 12 months." />
          )}
        </ChartCard>

        <ChartCard
          title="Trainings organised"
          description="Trainings recorded per month. This is the count of trainings that actually ran, not material that exists."
          table={{
            head: ["Month", "Trainings"],
            rows: sessions.buckets.map((bucket, index) => [bucket.label, sessions.counts[index] ?? 0]),
          }}
        >
          {hasSessions ? (
            <BarChart
              labels={sessions.buckets.map((bucket) => bucket.label)}
              series={[{ label: "Trainings", color: "var(--chart-2)", values: sessions.counts }]}
              height={230}
            />
          ) : (
            <EmptyChart message="No trainings recorded yet. Staff add them from Trainings, one per training that ran." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartCard
          title="Where the traffic goes"
          description="Material opens per programme over the last 30 days. Traffic that never leaves one programme is worth knowing about."
          table={{
            head: ["Programme", "Opens · 30 days"],
            rows: programmeTraffic.map((row) => [row.label, row.value]),
          }}
          actions={
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              opens
            </span>
          }
        >
          {programmeTraffic.length > 0 ? (
            <RankBars
              items={programmeTraffic.map((row, index) => ({ label: row.label, value: row.value, color: chartColor(index) }))}
            />
          ) : (
            <EmptyChart message="No opens in the last 30 days." />
          )}
        </ChartCard>

        <ChartCard
          title="What the library holds"
          description="Published material by type."
          table={{
            head: ["Type", "Published"],
            rows: typeMix.map((entry) => [MATERIAL_TYPE_LABELS[entry.type], entry.count]),
          }}
        >
          {typeTotal > 0 ? (
            <DonutChart
              centreLabel="published"
              slices={typeMix.map((entry, index) => ({
                label: MATERIAL_TYPE_LABELS[entry.type],
                value: entry.count,
                color: chartColor(index),
              }))}
            />
          ) : (
            <EmptyChart message="Nothing published yet." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Trainings by programme field"
          description="Which programmes are actually running trainings in the last 12 months."
          table={{
            head: ["Programme field", "Trainings"],
            rows: sessions.byProgramme.map((row) => [row.label, row.value]),
          }}
        >
          {sessions.byProgramme.length > 0 ? (
            <RankBars items={sessions.byProgramme.map((row, index) => ({ label: row.label, value: row.value, color: chartColor(index + 2) }))} unit="trainings" />
          ) : (
            <EmptyChart message="No trainings recorded in the last 12 months." />
          )}
        </ChartCard>

        <section aria-labelledby="health-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <div>
            <h2 id="health-heading" className="flex items-center gap-2 text-base font-bold text-ink">
              <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
              Catalogue health
            </h2>
            <p className="mt-1 text-sm text-ink-muted">The numbers behind the charts, and what is still thin.</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Programmes in scope</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.programmes}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Programme areas</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.programmeAreas}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Awaiting review</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.inReview}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Drafts</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.draft}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Trainings on record</dt>
              <dd className="tabular-nums font-semibold text-ink">{trainingCounts.total}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">People reached in trainings</dt>
              <dd className="tabular-nums font-semibold text-ink">{trainingCounts.attendees}</dd>
            </div>
            {insights.people && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Active staff</dt>
                <dd className="tabular-nums font-semibold text-ink">{insights.people.total}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" aria-hidden />
              Nothing published
            </h3>
            {insights.gaps.length === 0 ? (
              <p className="text-sm text-ink-muted">Every programme in scope has at least one published material.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {insights.gaps.map((gap) => (
                  <li key={gap.id}>
                    <Badge variant="outline">{gap.name}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {insights.people && (
            <Link href="/users" className={buttonClass({ variant: "ghost", size: "sm" })}>
              Open the user directory
            </Link>
          )}
        </section>
      </div>

      <p className="flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-surface-2 p-5 text-sm leading-relaxed text-ink-muted">
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        Opens are recorded once per person per day and respect Do Not Track. Download counts come from the audit trail, so
        they cannot be lost or edited later. Per-region reach and time-to-publish are the next figures to add; both are
        derivable from what is already recorded.
        <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
      </p>
    </div>
  );
}
