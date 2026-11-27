import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  ClipboardCheck,
  Download,
  Eye,
  Layers,
  Undo2,
} from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { ChartCard, EmptyChart, chartColor } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { KpiCard, KpiGrid } from "@/components/charts/kpi-card";
import { RankBars } from "@/components/charts/rank-bars";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { safeAppLink } from "@/lib/links";
import {
  MATERIAL_TYPE_LABELS,
  STAFF_ROLE_LABELS,
  notificationTypeLabel,
} from "@/lib/labels";
import { staffRoleOf } from "@/lib/rbac/capabilities";
import {
  getInsights,
  getProgrammeTraffic,
  getTrainingCounts,
  getTrainingSeries,
  getTrafficSeries,
  getTypeMix,
  periodDelta,
} from "@/lib/server/insights-queries";
import { withinOr } from "@/lib/server/deadline";
import { listReturnedTrainings } from "@/lib/server/training-queries";
import { LearnerHome, greetingFor } from "./learner-home";
import { listNotifications } from "@/lib/server/notification-queries";
import { requireSession } from "@/lib/server/rbac";
import { isStaffRole } from "@/lib/viewer";

const NOTICES: Record<string, string> = {
  forbidden: "That page is not available for your role.",
  "password-updated": "Your password has been updated.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireSession();
  const { notice } = await searchParams;
  const now = new Date();

  const staff = isStaffRole(session.role);

  /*
   * Members of staff get the reading home, not this page: no charts, no review
   * counts, nothing that belongs to running the library (ADR‑0027).
   */
  if (!staff) return <LearnerHome session={session} />;

  /*
   * Every section has a deadline. None of them is the page: the greeting and the
   * links are drawn from the session, so a slow statistics query drops its own
   * section out and the rest still renders. Without this a stalled query left
   * the skeleton on screen indefinitely.
   */
  // The notices are a sidebar of the page, not the page: a slow bell falls back
  // to an empty list rather than taking the greeting down with it.
  const [
    announcements,
    returned,
    insights,
    traffic,
    sessionRecord,
    trainings,
    typeMix,
    programmeTraffic,
  ] = await Promise.all([
      withinOr("dashboard.notifications", listNotifications(session, 4), []),
      // A returned training is a task with somebody's name on it, not a row in a
      // list: it gets its own read and its own card.
      session.role === "FACILITATOR" ? withinOr("dashboard.returned", listReturnedTrainings(session.sub), []) : [],
      staff ? withinOr("dashboard.insights", getInsights(session), null) : null,
      staff ? withinOr("dashboard.traffic", getTrafficSeries(session, 12), null) : null,
      staff ? withinOr("dashboard.training_counts", getTrainingCounts(session), null) : null,
      staff ? withinOr("dashboard.training_series", getTrainingSeries(session, 12), null) : null,
      staff ? withinOr("dashboard.type_mix", getTypeMix(session), []) : [],
      staff ? withinOr("dashboard.programme_traffic", getProgrammeTraffic(session, 30), []) : [],
    ]);

  const noticeText = notice ? NOTICES[notice] : undefined;

  return (
    <div className="space-y-10">
      {noticeText && (
        <p
          role="status"
          className="rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
        >
          {noticeText}
        </p>
      )}

      {/* Hero */}
      <section
        aria-labelledby="dash-title"
        className="surface-card hero-glow relative overflow-hidden p-7 sm:p-10"
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            {/* Who you are, top-left, in the order a person would say it: the
                grade they hold, then the duty, then the date. The greeting below
                keeps the name, so "Good morning" is addressed to somebody with a
                role and not to a first name floating on its own. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {session.grade && (
                <span className="rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                  {session.grade}
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {STAFF_ROLE_LABELS[staffRoleOf({ role: session.role, unitHead: session.unitHead })]} · {formatDate(now)}
              </p>
            </div>
            <h1
              id="dash-title"
              className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
            >
              {greetingFor(now)},{" "}
              {STAFF_ROLE_LABELS[staffRoleOf({ role: session.role, unitHead: session.unitHead })]} {session.name}.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-ink-muted">
              Everything GHS has published for your programmes is in the library, filed under the area and
              field it belongs to.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/catalogue"
                className={buttonClass({
                  variant: "secondary",
                  className: "h-12 rounded-[var(--radius-pill)] px-6",
                })}
              >
                Browse library
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*
       * The one thing on this page that is a task rather than a statistic. A unit
       * head can return a training for correction; until now the author found out
       * only by opening the training and reading the banner, so corrections waited.
       */}
      {returned.length > 0 && (
        <section
          aria-labelledby="returned-heading"
          className="rounded-card border border-danger/40 bg-danger/[0.05] p-5 shadow-panel sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id="returned-heading" className="flex items-center gap-2 text-base font-bold text-ink">
                <Undo2 className="h-4 w-4 text-danger" aria-hidden />
                Returned for correction
              </h2>
              <p className="max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                A unit head read {returned.length === 1 ? "this training" : "these trainings"} and needs a change before
                it can go live. Correct it, save, and it goes straight back to them.
              </p>
            </div>
            <Link href="/trainings?review=REJECTED" className={buttonClass({ variant: "secondary", size: "sm" })}>
              See all returned
            </Link>
          </div>

          <ul className="mt-4 space-y-2">
            {returned.map((training) => (
              <li key={training.id}>
                <Link
                  href={`/trainings/${training.id}`}
                  className="group flex flex-col gap-1.5 rounded-control border border-danger/25 bg-surface px-4 py-3 transition-colors hover:border-danger/50"
                >
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-ink group-hover:text-danger">{training.title}</span>
                    {training.areaName && <span className="text-xs text-ink-muted">· {training.areaName}</span>}
                  </span>
                  {training.reviewNote && (
                    <span className="text-[13px] leading-relaxed text-ink-muted">
                      <span className="font-semibold text-ink">What to correct: </span>
                      {training.reviewNote}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">
                    Open and correct →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Overview analytics: the numbers, then the shapes behind them. */}
      {staff && traffic && insights && sessionRecord ? (
        <>
          <KpiGrid>
            <KpiCard
              icon={Eye}
              label="Material opens · 12 weeks"
              value={traffic.totals.views}
              hint={`${insights.library.published} materials published`}
              delta={periodDelta(traffic.views)}
              spark={traffic.views}
              color="var(--chart-4)"
            />
            <KpiCard
              icon={Download}
              label="Downloads · 12 weeks"
              value={traffic.totals.downloads}
              hint="Counted from the audit trail"
              delta={periodDelta(traffic.downloads)}
              spark={traffic.downloads}
              color="var(--chart-1)"
            />
            <KpiCard
              icon={CalendarCheck2}
              label="Trainings · 90 days"
              value={sessionRecord.last90Days}
              hint={`${sessionRecord.total} recorded`}
              spark={trainings?.counts ?? []}
              color="var(--chart-5)"
            />
            <KpiCard
              icon={ClipboardCheck}
              label="Awaiting review"
              value={insights.library.inReview}
              hint={insights.library.inReview > 0 ? "Waiting for a decision" : "The queue is clear"}
              color="var(--chart-2)"
            />
          </KpiGrid>

          <ChartCard
            title="Performance trend"
            description="Opens of published material against file downloads, week by week, across the programmes you can see."
            series={[
              { label: "Opens", color: "var(--chart-4)" },
              { label: "Downloads", color: "var(--chart-1)" },
            ]}
            table={{
              head: ["Week of", "Opens", "Downloads"],
              rows: traffic.buckets.map((bucket, index) => [
                bucket.label,
                traffic.views[index] ?? 0,
                traffic.downloads[index] ?? 0,
              ]),
            }}
            actions={
              <Link href="/insights" className={buttonClass({ variant: "ghost", size: "sm" })}>
                Detailed analytics
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            }
          >
            {traffic.totals.views + traffic.totals.downloads > 0 ? (
              <AreaChart
                labels={traffic.buckets.map((bucket) => bucket.label)}
                series={[
                  { label: "Opens", color: "var(--chart-4)", values: traffic.views },
                  { label: "Downloads", color: "var(--chart-1)", values: traffic.downloads },
                ]}
                unit="opens"
                height={280}
              />
            ) : (
              <EmptyChart message="No opens recorded yet. Traffic starts counting from the first material someone opens." />
            )}
          </ChartCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="Materials by type"
              description="What the library is made of, so a gap in video or practical content is visible rather than guessed at."
              table={{
                head: ["Type", "Materials"],
                rows: typeMix.map((entry) => [MATERIAL_TYPE_LABELS[entry.type], entry.count]),
              }}
            >
              {typeMix.some((entry) => entry.count > 0) ? (
                <DonutChart
                  centreLabel={`${typeMix.reduce((sum, entry) => sum + entry.count, 0)} published`}
                  slices={typeMix.map((entry, index) => ({
                    label: MATERIAL_TYPE_LABELS[entry.type],
                    value: entry.count,
                    color: chartColor(index),
                  }))}
                />
              ) : (
                <EmptyChart message="Nothing is published yet." />
              )}
            </ChartCard>

            <ChartCard
              title="Busiest programme fields"
              description="Opens in the last 30 days, by the programme field the material is filed under."
              table={{
                head: ["Programme field", "Opens"],
                rows: programmeTraffic.map((row) => [row.label, row.value]),
              }}
            >
              {programmeTraffic.length > 0 && programmeTraffic.some((row) => row.value > 0) ? (
                <RankBars
                  unit="opens"
                  items={programmeTraffic.slice(0, 6).map((row, index) => ({
                    label: row.label,
                    value: row.value,
                    color: chartColor(index),
                  }))}
                />
              ) : (
                <EmptyChart message="No opens recorded in the last 30 days." />
              )}
            </ChartCard>
          </div>
        </>
      ) : (
        <KpiGrid>
          <KpiCard
            icon={Layers}
            label="Open library"
            value="Browse"
            hint="Every published programme"
            color="var(--chart-5)"
          />
          <KpiCard
            icon={ClipboardCheck}
            label="Pre/post tests"
            value="Take one"
            hint="Attached to your trainings"
            color="var(--chart-2)"
          />
        </KpiGrid>
      )}

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
        </div>

        <aside aria-labelledby="announcements-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              id="announcements-heading"
              className="text-lg font-bold text-ink"
            >
              Announcements
            </h2>
            <Bell className="h-4 w-4 text-ink-muted" aria-hidden />
          </div>
          {announcements.length === 0 ? (
            <ListEmptyState
              title="No announcements"
              description="Notices from your directorate appear here."
            />
          ) : (
            <ul className="space-y-3">
              {announcements.map((notice) => {
                const link = safeAppLink(notice.linkUrl);
                return (
                  <li key={notice.id} className="surface-card p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {!notice.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                      {!notice.isRead && (
                        <span className="sr-only">Unread:</span>
                      )}
                      {notificationTypeLabel(notice.type)}
                    </p>
                    <p className="mt-2 font-semibold leading-snug text-ink">
                      {notice.title}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {notice.body}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <time
                        className="text-xs text-ink-muted"
                        dateTime={notice.publishedAt.toISOString()}
                      >
                        {formatDateTime(notice.publishedAt)}
                      </time>
                      {link && (
                        <Link
                          href={link}
                          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Open
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/notifications"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            All notifications
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
