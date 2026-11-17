import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Download, Eye, TrendingUp } from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard, EmptyChart, chartColor } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { RankBars } from "@/components/charts/rank-bars";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/labels";
import {
  getInsights,
  getProgrammeTraffic,
  getSessionSeries,
  getTrafficSeries,
  getUploadSeries,
} from "@/lib/server/insights-queries";
import { getSessionSummary } from "@/lib/server/session-queries";
import { requireRole } from "@/lib/server/rbac";
import { db } from "@/db/index";
import { categories, materials, spaces } from "@/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { scopeFor } from "@/lib/server/scope";

export const dynamic = "force-dynamic";

export const metadata = { title: "Insights" };

const TYPE_ORDER: MaterialType[] = ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"];

async function publishedByType(viewer: { id: string; role: "SYSTEM_ADMIN" | "FACILITATOR" | "LEARNER"; region: string | null; directorate: string | null; cadre: string | null }) {
  const rows = await db
    .select({ type: materials.type, n: sql<number>`count(*)::int` })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .innerJoin(categories, eq(categories.id, spaces.categoryId))
    .where(and(scopeFor(viewer), eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"), isNotNull(materials.currentVersionId)))
    .groupBy(materials.type);
  const byType = new Map(rows.map((row) => [row.type, row.n]));
  return TYPE_ORDER.map((type) => ({ type, count: byType.get(type) ?? 0 }));
}

export default async function InsightsPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const admin = session.role === "SYSTEM_ADMIN";

  const [insights, traffic, uploads, sessions, programmeTraffic, sessionSummary, typeMix] = await Promise.all([
    getInsights(session),
    getTrafficSeries(session, 12),
    getUploadSeries(session, 12),
    getSessionSeries(session, 12),
    getProgrammeTraffic(session, 30),
    getSessionSummary(session),
    publishedByType(session),
  ]);

  const hasTraffic = traffic.totals.views + traffic.totals.downloads > 0;
  const hasUploads = uploads.total > 0;
  const hasSessions = sessions.total > 0;
  const typeTotal = typeMix.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="space-y-8">
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
            <Link href="/sessions" className={buttonClass({ variant: "secondary" })}>
              Record a session
            </Link>
            <Link href="/review" className={buttonClass({ variant: "ghost" })}>
              Review queue {insights.catalogue.inReview > 0 ? `(${insights.catalogue.inReview})` : ""}
            </Link>
          </>
        }
      />

      <section
        aria-label="Headline numbers"
        className="grid gap-5 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 xl:grid-cols-4"
      >
        <Stat value={traffic.totals.views} label="Material opens · last 12 weeks" />
        <Stat value={traffic.totals.downloads} label="Downloads · last 12 weeks" />
        <Stat value={sessionSummary.last90Days} label="Trainings run · last 90 days" />
        <Stat value={insights.catalogue.published} label="Published materials" />
      </section>

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
          description="Sessions recorded per month. This is the count of trainings that actually ran, not material that exists."
          table={{
            head: ["Month", "Sessions"],
            rows: sessions.buckets.map((bucket, index) => [bucket.label, sessions.counts[index] ?? 0]),
          }}
        >
          {hasSessions ? (
            <BarChart
              labels={sessions.buckets.map((bucket) => bucket.label)}
              series={[{ label: "Sessions", color: "var(--chart-2)", values: sessions.counts }]}
              height={230}
            />
          ) : (
            <EmptyChart message="No sessions recorded yet. Staff can add them from Sessions, one per training that ran." />
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
          title="Sessions by programme"
          description="Which programmes are actually running trainings in the last 12 months."
          table={{
            head: ["Programme", "Sessions"],
            rows: sessions.byProgramme.map((row) => [row.label, row.value]),
          }}
        >
          {sessions.byProgramme.length > 0 ? (
            <RankBars items={sessions.byProgramme.map((row, index) => ({ label: row.label, value: row.value, color: chartColor(index + 2) }))} unit="sessions" />
          ) : (
            <EmptyChart message="No sessions recorded in the last 12 months." />
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
              <dt className="text-ink-muted">Spaces / modules</dt>
              <dd className="tabular-nums font-semibold text-ink">{insights.catalogue.spaces}</dd>
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
              <dt className="text-ink-muted">Sessions on record</dt>
              <dd className="tabular-nums font-semibold text-ink">{sessionSummary.total}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">People reached in sessions</dt>
              <dd className="tabular-nums font-semibold text-ink">{sessionSummary.attendees}</dd>
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
