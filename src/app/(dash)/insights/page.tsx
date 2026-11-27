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
import { MATERIAL_TYPE_COLORS, MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { periodDelta, periodDeltaLabel } from "@/lib/period-delta";
import {
  getInsights,
  getProgrammeTraffic,
  getTrainingCounts,
  getTrainingSeries,
  getTrafficSeries,
  getTypeMix,
  getUploadSeries,
} from "@/lib/server/insights-queries";

import { DataUnavailable } from "@/components/ui/data-unavailable";
import { countReviewQueue } from "@/lib/server/authoring-queries";
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
        description="The traffic and library figures could not be read in time. The numbers on this page are recomputed per request, so nothing is stale or lost."
        requestId={essential.requestId}
        hint={essential.hint}
      />
    );
  }
  const [insights, trainingCounts] = essential.data;
  const reviewCount = reviewer ? await withDeadline("insights.review-count", () => countReviewQueue(session)) : null;
  const visibleReviewCount = reviewCount && reviewCount.ok ? reviewCount.data : null;

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
  const traffic = optional.ok
    ? optional.data[0]
    : { buckets: [], views: [], downloads: [], totals: { views: 0, downloads: 0 }, previousTotals: { views: 0, downloads: 0 } };
  const uploads = optional.ok ? optional.data[1] : { buckets: [], series: [], total: 0 };
  const sessions = optional.ok ? optional.data[2] : { buckets: [], counts: [], byProgramme: [], total: 0 };
  const programmeTraffic = optional.ok ? optional.data[3] : [];
  const typeMix = optional.ok
    ? optional.data[4]
    : (["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const).map((type) => ({ type, count: 0 }));
  const partial = !optional.ok || (reviewer && visibleReviewCount === null);

  const hasTraffic = traffic.totals.views + traffic.totals.downloads > 0;
  const hasUploads = uploads.total > 0;
  const hasSessions = sessions.total > 0;
  const typeTotal = typeMix.reduce((sum, entry) => sum + entry.count, 0);
  const typeMixReconciles = typeTotal === insights.library.published;

  return (
    <div className="space-y-8">
      {partial && (
        <p className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm leading-relaxed text-ink">
          Some supporting figures did not load in time. Refresh in a moment to retrieve them; the values are recomputed from current records.
        </p>
      )}

      <PageHeader
        eyebrow="Insights"
        title={admin ? "Service insights" : "Programme insights"}
        description={
          admin
            ? "Material opens, downloads, uploaded versions and Training register records across the service. Opens are counted once per person per day; downloads come from the audit trail."
            : "Training Material activity within your assigned Programme Area and Programme Field scopes; Training register figures count records visible to you. Opens are counted once per person per day."
        }
        actions={
          <>
            <Link href="/trainings" className={buttonClass({ variant: "secondary" })}>
              Open Trainings
            </Link>
            {reviewer && (
              <Link href="/review" className={buttonClass({ variant: "ghost" })}>
                Review queue {visibleReviewCount !== null && visibleReviewCount > 0 ? `(${visibleReviewCount})` : ""}
              </Link>
            )}
          </>
        }
      />

      <KpiGrid>
        <KpiCard
          icon={Eye}
          label="Material opens · 12 weeks"
          value={optional.ok ? traffic.totals.views : "—"}
          hint={optional.ok ? "Once per person per day" : "Traffic figures could not be loaded"}
          delta={optional.ok ? periodDelta(traffic.totals.views, traffic.previousTotals.views) : null}
          deltaLabel={optional.ok ? periodDeltaLabel(traffic.totals.views, traffic.previousTotals.views) : null}
          spark={optional.ok ? traffic.views : []}
          color="var(--chart-1)"
        />
        <KpiCard
          icon={Download}
          label="Downloads · 12 weeks"
          value={optional.ok ? traffic.totals.downloads : "—"}
          hint={optional.ok ? "From the audit trail" : "Download figures could not be loaded"}
          delta={optional.ok ? periodDelta(traffic.totals.downloads, traffic.previousTotals.downloads) : null}
          deltaLabel={optional.ok ? periodDeltaLabel(traffic.totals.downloads, traffic.previousTotals.downloads) : null}
          spark={optional.ok ? traffic.downloads : []}
          color="var(--chart-2)"
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Training records · 90 days"
          value={trainingCounts.last90Days}
          hint={`${trainingCounts.total} unarchived records visible to you`}
          color="var(--chart-3)"
        />
        <KpiCard
          icon={TrendingUp}
          label="Published materials"
          value={insights.library.published}
          hint={`${insights.library.inReview} material records in review`}
          color="var(--chart-4)"
        />
      </KpiGrid>

      <ChartCard
        title="Material Opens vs Downloads"
        description="Material opens from the daily ledger against completed file downloads from the audit trail, grouped by week."
        className="border-primary/15 p-5 sm:p-6"
        table={{
          head: ["Week beginning", "Material opens", "Downloads"],
          rows: traffic.buckets.map((bucket, index) => [bucket.label, traffic.views[index] ?? 0, traffic.downloads[index] ?? 0]),
        }}
      >
        {!optional.ok ? (
          <EmptyChart message="Traffic details could not be loaded in time. The headline figures remain available above." />
        ) : hasTraffic ? (
          <AreaChart
            labels={traffic.buckets.map((bucket) => bucket.label)}
            series={[
              { label: "Material opens", color: "var(--chart-1)", values: traffic.views },
              { label: "Downloads", color: "var(--chart-2)", values: traffic.downloads },
            ]}
            height={300}
          />
        ) : (
          <EmptyChart message="No material opens or downloads were recorded in the last 12 weeks." />
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Upload rate"
          description="New versions filed per month, grouped by Programme Field under its parent Programme Area."
          series={uploads.series.map((item, index) => ({ label: item.label, color: chartColor(index) }))}
          table={{
            head: ["Month", ...uploads.series.map((item) => item.label)],
            rows: uploads.buckets.map((bucket, index) => [bucket.label, ...uploads.series.map((item) => item.values[index] ?? 0)]),
          }}
        >
          {!optional.ok ? (
            <EmptyChart message="Upload history could not be loaded in time. Refresh to try again." />
          ) : hasUploads ? (
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
          title="Training records by date"
          description="Training register records visible to you, grouped by recorded start date. Includes entries marked planned, held and cancelled."
          table={{
            head: ["Month", "Training records"],
            rows: sessions.buckets.map((bucket, index) => [bucket.label, sessions.counts[index] ?? 0]),
          }}
        >
          {!optional.ok ? (
            <EmptyChart message="Training record history could not be loaded in time. Refresh to try again." />
          ) : hasSessions ? (
            <BarChart
              labels={sessions.buckets.map((bucket) => bucket.label)}
              series={[{ label: "Training records", color: "var(--chart-3)", values: sessions.counts }]}
              height={230}
            />
          ) : (
            <EmptyChart message="No Training register records fall in this date range." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ChartCard
          title="Most accessed Programme Fields"
          description="Training Material opens over the last 30 days, grouped by child Programme Field under its parent Programme Area."
          table={{
            head: ["Programme Area", "Programme Field", "Opens · 30 days"],
            rows: programmeTraffic.map((row) => [row.parentLabel, row.label, row.value]),
          }}
          actions={
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              opens
            </span>
          }
        >
          {!optional.ok ? (
            <EmptyChart message="Programme Field traffic could not be loaded in time. Refresh to try again." />
          ) : programmeTraffic.length > 0 ? (
            <RankBars
              unit="opens"
              items={programmeTraffic.map((row, index) => ({
                label: row.label,
                hint: `Programme Area: ${row.parentLabel}`,
                value: row.value,
                color: chartColor(index),
              }))}
            />
          ) : (
            <EmptyChart message="No material opens were recorded in the last 30 days." />
          )}
        </ChartCard>

        <ChartCard
          title="Resource Composition"
          description="Published Training Materials by their recorded resource type."
          table={{
            head: ["Resource type", "Published materials"],
            rows: optional.ok ? typeMix.map((entry) => [MATERIAL_TYPE_LABELS[entry.type], entry.count]) : [],
          }}
        >
          {!optional.ok ? (
            <EmptyChart message="Published-material classifications could not be loaded in time. Refresh to retry the type breakdown." />
          ) : insights.library.published === 0 ? (
            <EmptyChart message="No Training Materials are marked published in your authorised scope yet." />
          ) : !typeMixReconciles ? (
            <EmptyChart message={`Classification is incomplete: ${insights.library.published.toLocaleString("en-GB")} materials are marked published, but the type categories total ${typeTotal.toLocaleString("en-GB")}. No misleading donut is shown.`} />
          ) : (
            <DonutChart
              centreLabel="published"
              slices={typeMix.filter((entry) => entry.count > 0).map((entry) => ({
                label: MATERIAL_TYPE_LABELS[entry.type],
                value: entry.count,
                color: MATERIAL_TYPE_COLORS[entry.type],
              }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Training records by Programme Field"
          description="Training register records visible to you over the last 12 months, shown under their parent Programme Areas."
          table={{
            head: ["Programme Area", "Programme Field", "Records"],
            rows: sessions.byProgramme.map((row) => [row.parentLabel, row.label, row.value]),
          }}
        >
          {!optional.ok ? (
            <EmptyChart message="Training Field breakdown could not be loaded in time. Refresh to try again." />
          ) : sessions.byProgramme.length > 0 ? (
            <RankBars
              unit="records"
              items={sessions.byProgramme.map((row, index) => ({
                label: row.label,
                hint: `Programme Area: ${row.parentLabel}`,
                value: row.value,
                color: chartColor(index + 2),
              }))}
            />
          ) : (
            <EmptyChart message="No Training register records fall in the last 12 months." />
          )}
        </ChartCard>

        <section aria-labelledby="health-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <div>
            <h2 id="health-heading" className="flex items-center gap-2 text-base font-bold text-ink">
              <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
              Library health
            </h2>
            <p className="mt-1 text-sm text-ink-muted">The numbers behind the charts, and what is still thin.</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Programme Areas</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.library.programmes}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Programme Fields</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.library.programmeAreas}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Training Materials marked In review</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.library.inReview}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Training Material drafts</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.library.draft}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Unarchived Training records visible to you</dt>
              <dd className="tabular-nums font-semibold text-ink">{trainingCounts.total}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Attendee-count total on held records</dt>
              <dd className="tabular-nums font-semibold text-ink">{trainingCounts.attendees}</dd>
            </div>
            {insights.people && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Active staff</dt>
                <dd className="tabular-nums font-semibold text-ink">{insights.people.total}</dd>
              </div>
            )}
          </dl>
          <p className="text-xs leading-relaxed text-ink-muted">
            Attendee-count totals are sums of optional counts entered on records marked Held; they are not unique-person or service-reach totals.
          </p>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="h-3.5 w-3.5 text-primary" aria-hidden />
              Nothing published
            </h3>
            {insights.gaps.length === 0 ? (
              <p className="text-sm text-ink-muted">Every Programme Area in scope has at least one published Training Material.</p>
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
        Opens are recorded once per person per day and respect Do Not Track; downloads are counted from audit entries.
        <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
      </p>
    </div>
  );
}
