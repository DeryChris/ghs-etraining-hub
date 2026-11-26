import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  ClipboardCheck,
  Download,
  Eye,
  History,
  Layers,
  PenLine,
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
import { firstNameOf } from "@/lib/names";
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
import { classifyLoadFailure } from "@/lib/load-failure";
import { DeadlineError, within, withinOr } from "@/lib/server/deadline";
import { log } from "@/lib/server/logger";
import { getLearnerDashboard } from "@/lib/server/learning-queries";
import { listNotifications } from "@/lib/server/notification-queries";
import { requireSession } from "@/lib/server/rbac";
import { isStaffRole } from "@/lib/viewer";

const NOTICES: Record<string, string> = {
  forbidden: "That page is not available for your role.",
  "password-updated": "Your password has been updated.",
};

function greetingFor(now: Date): string {
  const hour =
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Accra",
        hour: "numeric",
        hour12: false,
      }).format(now),
    ) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Shown when the data the page is built from does not arrive in time. It is a
 * real page, not a spinner: the visitor can act on it, and it says what to do
 * next instead of leaving the skeleton up.
 */
function DashboardRetry({ hint }: { hint?: "drift" | "database" | "timeout" }) {
  return (
    <div className="space-y-6">
      <div className="surface-card p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warn">
          {hint === "drift" ? "This page and the database disagree" : "Taking too long"}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          The dashboard could not load its data.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          {hint === "drift" ? (
            <>
              Nothing was changed. The database has been updated but this deployment has not — the
              site and its database are out of step, so the queries this page makes no longer
              match. Open{" "}
              <a href="/api/health" className="font-semibold text-primary underline underline-offset-4">
                /api/health
              </a>{" "}
              to see which side is behind, then redeploy the site (or run{" "}
              <code className="font-mono text-xs">npm run db:migrate</code> if the database is the
              side that is behind).
            </>
          ) : (
            <>
              Nothing was changed. The training library is busy or the connection dropped — try
              again in a moment. If it keeps happening, quote the time in your message to the ICT
              helpdesk.
            </>
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className={buttonClass({ className: "h-11 px-5" })}
          >
            Try again
          </Link>
          <Link
            href="/catalogue"
            className={buttonClass({
              variant: "secondary",
              className: "h-11 px-5",
            })}
          >
            Go to the library
          </Link>
        </div>
      </div>
    </div>
  );
}

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
   * Every section has a deadline. The two the page cannot do without are
   * awaited together and fail to a retry card; the staff statistics are
   * optional, so a slow one drops out and the rest of the page still renders.
   * Without this a stalled query left the skeleton on screen indefinitely.
   */
  let dashboard: Awaited<ReturnType<typeof getLearnerDashboard>>;
  try {
    dashboard = await within("dashboard.learner", getLearnerDashboard(session), 6_000);
  } catch (error) {
    const failure = classifyLoadFailure(error);
    log.error({
      event: "dashboard.essential_failed",
      userId: session.sub,
      label: error instanceof DeadlineError ? error.label : undefined,
      failure: failure.kind,
      code: failure.code,
      error,
    });
    return <DashboardRetry hint={failure.hint} />;
  }

  // The notices are a sidebar of the page, not the page: a slow bell falls back
  // to an empty list rather than taking the greeting down with it.
  const [announcements, insights, traffic, sessionRecord, trainings, typeMix, programmeTraffic] =
    await Promise.all([
      withinOr("dashboard.notifications", listNotifications(session, 4), []),
      staff ? withinOr("dashboard.insights", getInsights(session), null) : null,
      staff ? withinOr("dashboard.traffic", getTrafficSeries(session, 12), null) : null,
      staff ? withinOr("dashboard.training_counts", getTrainingCounts(session), null) : null,
      staff ? withinOr("dashboard.training_series", getTrainingSeries(session, 12), null) : null,
      staff ? withinOr("dashboard.type_mix", getTypeMix(session), []) : [],
      staff ? withinOr("dashboard.programme_traffic", getProgrammeTraffic(session, 30), []) : [],
    ]);

  const noticeText = notice ? NOTICES[notice] : undefined;
  const nextUp = dashboard.recentlyOpened[0] ?? null;

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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {STAFF_ROLE_LABELS[staffRoleOf({ role: session.role, unitHead: session.unitHead })]} · {formatDate(now)}
            </p>
            <h1
              id="dash-title"
              className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
            >
              {greetingFor(now)}, {firstNameOf(session.name)}.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-ink-muted">
              {dashboard.mandatoryOutstanding.length > 0
                ? `${dashboard.mandatoryOutstanding.length} ${dashboard.mandatoryOutstanding.length === 1 ? "protocol is" : "protocols are"} still waiting for your signature. Everything else is in the library whenever you need it.`
                : "Everything GHS has published for your programmes is in the library, filed under the field and area it belongs to."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {nextUp ? (
                <Link
                  href={`/materials/${nextUp.id}`}
                  className={buttonClass({
                    className: "h-12 rounded-[var(--radius-pill)] px-6",
                  })}
                >
                  Pick up where you left off
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
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

      {/* Overview analytics: the numbers, then the shapes behind them. */}
      {staff && traffic && insights && sessionRecord ? (
        <>
          <KpiGrid>
            <KpiCard
              icon={Eye}
              label="Material opens · 12 weeks"
              value={traffic.totals.views}
              hint={`${insights.catalogue.published} materials published`}
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
              hint={`${sessionRecord.total} on the register`}
              spark={trainings?.counts ?? []}
              color="var(--chart-5)"
            />
            <KpiCard
              icon={ClipboardCheck}
              label="Awaiting review"
              value={insights.catalogue.inReview}
              hint={insights.catalogue.inReview > 0 ? "Waiting for a decision" : "The queue is clear"}
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
              title="Busiest programme areas"
              description="Opens in the last 30 days, by the area the material is filed under."
              table={{
                head: ["Programme area", "Opens"],
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
            icon={PenLine}
            label="Protocols to sign"
            value={dashboard.mandatoryOutstanding.length}
            hint={
              dashboard.mandatoryTotal > 0
                ? `of ${dashboard.mandatoryTotal} that ask for a signature`
                : "Nothing published asks for one"
            }
            color="var(--chart-4)"
          />
          <KpiCard
            icon={History}
            label="Opened recently"
            value={dashboard.recentlyOpened.length}
            hint="Pick one up again below"
            color="var(--chart-1)"
          />
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
          <section aria-labelledby="recent-heading" className="space-y-4">
            <h2 id="recent-heading" className="text-lg font-bold text-ink">
              Recently opened
            </h2>
            {dashboard.recentlyOpened.length === 0 ? (
              <ListEmptyState
                art="search"
                title="Nothing opened yet"
                description="Everything published for your programmes is in the library. What you open shows up here."
                actionText="Browse the library"
                actionHref="/catalogue"
              />
            ) : (
              <ul className="surface-card divide-y divide-hairline overflow-hidden">
                {dashboard.recentlyOpened.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/materials/${item.id}`}
                      className="block p-5 transition-colors duration-fast hover:bg-surface-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        {MATERIAL_TYPE_LABELS[item.type]} · {item.areaName}
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">Last opened {formatDateTime(item.lastViewedAt)}</p>
                    </Link>
                  </li>
                ))}
                <li className="p-4">
                  <Link href="/analytics" className="text-sm font-semibold text-primary hover:underline">
                    See all of your activity
                  </Link>
                </li>
              </ul>
            )}
          </section>
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
              art="bell"
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
