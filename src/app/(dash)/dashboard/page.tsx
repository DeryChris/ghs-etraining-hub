import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Download,
  Eye,
  FolderTree,
  Library,
  Sparkles,
  Undo2,
} from "lucide-react";
import { AreaChart } from "@/components/charts/area-chart";
import { ChartCard, EmptyChart } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { KpiCard, KpiGrid } from "@/components/charts/kpi-card";
import { RankBars } from "@/components/charts/rank-bars";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { safeAppLink } from "@/lib/links";
import {
  MATERIAL_TYPE_COLORS,
  MATERIAL_TYPE_LABELS,
  STAFF_ROLE_LABELS,
  notificationTypeLabel,
} from "@/lib/labels";
import { periodDelta, periodDeltaLabel } from "@/lib/period-delta";
import { staffRoleOf } from "@/lib/rbac/capabilities";
import {
  getInsights,
  getProgrammeTraffic,
  getTrainingCounts,
  getTrafficSeries,
  getTypeMix,
} from "@/lib/server/insights-queries";
import { isTrafficPeriod, TRAFFIC_PERIOD_OPTIONS } from "@/lib/traffic-periods";
import { withinOr } from "@/lib/server/deadline";
import { countReviewQueue } from "@/lib/server/authoring-queries";
import { listRecentOpens } from "@/lib/server/learning-queries";
import { listReturnedTrainings } from "@/lib/server/training-queries";
import { listNotifications } from "@/lib/server/notification-queries";
import { LearnerHome, greetingFor } from "./learner-home";
import { requireSession } from "@/lib/server/rbac";
import { isStaffRole } from "@/lib/viewer";

const NOTICES: Record<string, string> = {
  forbidden: "That page is not available for your role.",
  "password-updated": "Your password has been updated.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; period?: string }>;
}) {
  const session = await requireSession();

  /*
   * A district HR holds no programme grant, so every figure this page draws would
   * be zero — an empty dashboard reads as a broken one. Their work is the district
   * directory, so that is where "home" goes for them.
   */
  if (session.role === "DISTRICT_HR") redirect("/users");

  const { notice, period: requestedPeriod } = await searchParams;
  const now = new Date();
  const staff = isStaffRole(session.role);

  /* Members of staff on the roster get their reading home, not staff analytics. */
  if (!staff) return <LearnerHome session={session} />;

  const period = isTrafficPeriod(requestedPeriod) ? requestedPeriod : "12w";
  const periodLabel = TRAFFIC_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? "12 weeks";
  const periodUnit =
    period === "7d" || period === "30d" ? "day" : period === "6m" || period === "12m" ? "month" : "week";
  const reviewer = session.role === "SYSTEM_ADMIN" || session.unitHead === true;

  /*
   * Each section has its own deadline. A slow analytics query leaves an honest
   * unavailable state in that section instead of hiding the rest of the page.
   */
  const [notifications, recent, returned, insights, traffic, trainingCounts, reviewCount, typeMix, programmeTraffic] =
    await Promise.all([
      withinOr("dashboard.notifications", listNotifications(session, 4), null),
      withinOr("dashboard.recent", listRecentOpens(session.sub, 12), null),
      session.role === "FACILITATOR"
        ? withinOr("dashboard.returned", listReturnedTrainings(session.sub), null)
        : Promise.resolve([]),
      withinOr("dashboard.insights", getInsights(session), null),
      withinOr("dashboard.traffic", getTrafficSeries(session, period), null),
      withinOr("dashboard.training_counts", getTrainingCounts(session), null),
      reviewer ? withinOr("dashboard.review_count", countReviewQueue(session), null) : Promise.resolve(0),
      withinOr("dashboard.type_mix", getTypeMix(session), null),
      withinOr("dashboard.programme_traffic", getProgrammeTraffic(session, 30), null),
    ]);

  const noticeText = notice ? NOTICES[notice] : undefined;
  const partial =
    notifications === null ||
    recent === null ||
    (session.role === "FACILITATOR" && returned === null) ||
    insights === null ||
    traffic === null ||
    trainingCounts === null ||
    (reviewer && reviewCount === null) ||
    typeMix === null ||
    programmeTraffic === null;
  const reviewerCount = typeof reviewCount === "number" ? reviewCount : null;

  const primaryAction =
    reviewer && reviewerCount !== null && reviewerCount > 0
      ? { href: "/review", label: "Review queue", icon: ClipboardCheck }
      : session.role === "FACILITATOR"
        ? // A facilitator records trainings now; material is uploaded from the
          // training it belongs to, so there is no authoring workspace to open.
          { href: "/trainings/new", label: "Record a training", icon: Library }
        : { href: "/programme-fields", label: "Manage Programme Areas", icon: FolderTree };
  const PrimaryActionIcon = primaryAction.icon;

  const typeTotal = typeMix?.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const publishedTotal = insights?.library.published ?? null;
  const typeMixReconciles = publishedTotal !== null && typeTotal === publishedTotal;
  const duty = STAFF_ROLE_LABELS[staffRoleOf({ role: session.role, unitHead: session.unitHead })];

  const latestBucket = traffic?.buckets.at(-1);
  const latestOpens = traffic?.views.at(-1) ?? 0;
  const latestDownloads = traffic?.downloads.at(-1) ?? 0;

  return (
    <div className="space-y-8 pb-8 lg:space-y-10">
      {noticeText && (
        <p role="status" className="rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {noticeText}
        </p>
      )}
      {partial && (
        <p role="status" className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm leading-relaxed text-ink">
          Some dashboard figures could not be loaded. Available sections remain visible; try refreshing to reload the missing data.
        </p>
      )}

      {/* ── Welcome and role-aware actions ──────────────────────────────── */}
      <section aria-labelledby="dash-title" className="surface-card hero-glow relative overflow-hidden p-6 sm:p-8 xl:p-10">
        <svg
          aria-hidden="true"
          viewBox="0 0 560 220"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[52%] text-primary opacity-[0.13] md:block"
        >
          <path
            d="M0 124h96l24-25 33 58 45-111 52 91 30-31h64l18 20 30-42 24 51 25-33h86"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M0 174h560" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="349" cy="144" r="4" fill="currentColor" />
          <circle cx="456" cy="102" r="4" fill="currentColor" />
        </svg>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
          <div className="max-w-3xl">
            {/* Who you are, top-left, in the order a person would say it: the grade
                you hold, then where you work, then the duty and the date. The
                greeting below keeps the name, so "Good morning" is addressed to
                somebody with a role and not to a first name floating alone. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {session.grade && (
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/[0.10] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                  {session.grade}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-primary">
                <span className="flag-stripe h-1.5 w-7 rounded-full" aria-hidden="true" />
                Upper West Regional Health Directorate
              </span>
              <span className="text-xs font-semibold text-ink-muted">
                {duty} · {formatDate(now)}
              </span>
            </div>

            <h1 id="dash-title" className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl xl:text-5xl">
              {greetingFor(now)}, {duty} {session.name}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
              Welcome to your Training Library. Here is an overview of resource engagement and training activity in your authorised programme scope.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link href={primaryAction.href} className={buttonClass({ className: "min-h-11 rounded-[var(--radius-pill)] px-5" })}>
                <PrimaryActionIcon className="h-4 w-4" aria-hidden="true" />
                {primaryAction.label}
                {primaryAction.href === "/review" && reviewerCount !== null && (
                  <span className="rounded-full bg-primary-ink/15 px-2 py-0.5 text-xs tabular-nums">{reviewerCount}</span>
                )}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/catalogue" className={buttonClass({ variant: "secondary", className: "min-h-11 rounded-[var(--radius-pill)] px-5" })}>
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Browse Library
              </Link>
              <Link href="/trainings" className={buttonClass({ variant: "ghost", className: "min-h-11 rounded-[var(--radius-pill)] px-4" })}>
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Trainings
              </Link>
              {reviewer && primaryAction.href !== "/review" && (
                <Link href="/review" className={buttonClass({ variant: "ghost", className: "min-h-11 rounded-[var(--radius-pill)] px-4" })}>
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  Review queue{reviewerCount && reviewerCount > 0 ? ` · ${reviewerCount}` : ""}
                </Link>
              )}
              {session.role === "SYSTEM_ADMIN" && primaryAction.href !== "/programme-fields" && (
                <Link href="/programme-fields" className={buttonClass({ variant: "ghost", className: "min-h-11 rounded-[var(--radius-pill)] px-4" })}>
                  <FolderTree className="h-4 w-4" aria-hidden="true" />
                  Manage Programme Areas
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-card border border-primary/15 bg-surface/90 p-4 shadow-panel backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Reporting scope</p>
            <p className="mt-2 text-sm font-bold text-ink">
              {session.role === "SYSTEM_ADMIN" ? "Service-wide" : "Assigned programme scope"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Figures follow your current permissions for Programme Areas and Programme Fields.
            </p>
          </div>
        </div>
      </section>

      {/* ── Returned items: a task, not a statistic ─────────────────────── */}
      {session.role === "FACILITATOR" && returned === null && (
        <p role="status" className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink">
          Returned Training Session records could not be loaded. Open Trainings to check for review notes.
        </p>
      )}
      {returned && returned.length > 0 && (
        <section aria-labelledby="returned-heading" className="rounded-card border border-danger/40 bg-danger/[0.05] p-5 shadow-panel sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id="returned-heading" className="flex items-center gap-2 text-base font-bold text-ink">
                <Undo2 className="h-4 w-4 text-danger" aria-hidden="true" />
                Returned for correction
              </h2>
              <p className="max-w-[70ch] text-sm leading-relaxed text-ink-muted">
                A unit head needs a change to {returned.length === 1 ? "this Training Session record" : "these Training Session records"} before it can be published.
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
                    {(training.fieldName || training.areaName) && (
                      <span className="text-xs text-ink-muted">
                        {training.fieldName ? `Programme Area: ${training.fieldName}` : ""}
                        {training.fieldName && training.areaName ? " · " : ""}
                        {training.areaName ? `Programme Field: ${training.areaName}` : ""}
                      </span>
                    )}
                  </span>
                  {training.reviewNote && (
                    <span className="text-[13px] leading-relaxed text-ink-muted">
                      <span className="font-semibold text-ink">What to correct: </span>
                      {training.reviewNote}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-danger">Open and correct →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <section aria-labelledby="overview-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Service overview</p>
            <h2 id="overview-heading" className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              The Library at a Glance
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              A quick view of published materials, engagement and recorded training activity in your authorised scope.
            </p>
          </div>
          <Link href="/insights" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            Detailed insights <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {(insights || traffic || trainingCounts || reviewer) ? (
          <KpiGrid className={reviewer ? "xl:grid-cols-5" : undefined}>
            {insights && (
              <KpiCard
                icon={Library}
                label="Published Materials"
                value={insights.library.published}
                hint="Currently marked published in your authorised scope"
                color="var(--chart-4)"
              />
            )}
            {traffic && (
              <KpiCard
                icon={Eye}
                label={`Material Opens · ${periodLabel}`}
                value={traffic.totals.views}
                hint="Counted once per person per day"
                delta={periodDelta(traffic.totals.views, traffic.previousTotals.views)}
                deltaLabel={periodDeltaLabel(traffic.totals.views, traffic.previousTotals.views)}
                spark={traffic.views}
                color="var(--chart-1)"
              />
            )}
            {traffic && (
              <KpiCard
                icon={Download}
                label={`Downloads · ${periodLabel}`}
                value={traffic.totals.downloads}
                hint="Completed file issues from the audit trail"
                delta={periodDelta(traffic.totals.downloads, traffic.previousTotals.downloads)}
                deltaLabel={periodDeltaLabel(traffic.totals.downloads, traffic.previousTotals.downloads)}
                spark={traffic.downloads}
                color="var(--chart-2)"
              />
            )}
            {trainingCounts && (
              <KpiCard
                icon={CalendarDays}
                label="Training records · 90 days"
                value={trainingCounts.last90Days}
                hint={`${trainingCounts.total.toLocaleString("en-GB")} unarchived records visible`}
                color="var(--chart-3)"
              />
            )}
            {reviewer && (
              <KpiCard
                icon={ClipboardCheck}
                label="Items awaiting review"
                value={reviewerCount ?? "—"}
                hint={reviewerCount === null ? "Review queue could not be loaded" : "Material versions and Training records in your review queue"}
                color="var(--chart-5)"
              />
            )}
          </KpiGrid>
        ) : (
          <p role="status" className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink">
            Headline figures could not be loaded. Your recent items and notifications remain available below where possible.
          </p>
        )}
      </section>

      {/* ── Primary, interactive engagement chart ───────────────────────── */}
      <section aria-labelledby="engagement-heading" className="space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Resource engagement</p>
          <h2 id="engagement-heading" className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Opens and downloads over time
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">
            Compare material opens with completed file downloads. The chart groups short periods by day, the 12-week view by week and longer periods by month.
          </p>
        </div>

        <ChartCard
          title="Material Opens vs Downloads"
          description={`Activity within your authorised scope, grouped by ${periodUnit} over the selected ${periodLabel.toLowerCase()}.`}
          className="border-primary/15 p-5 sm:p-6"
          table={{
            head: [periodUnit === "day" ? "Date" : periodUnit === "month" ? "Month" : "Week beginning", "Material opens", "Downloads"],
            rows: traffic?.buckets.map((bucket, index) => [bucket.label, traffic.views[index] ?? 0, traffic.downloads[index] ?? 0]) ?? [],
          }}
          actions={
            <form action="/dashboard" method="get" aria-label="Choose a reporting period" className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {notice && <input type="hidden" name="notice" value={notice} />}
              <label htmlFor="traffic-period" className="sr-only">Reporting period</label>
              <select
                id="traffic-period"
                name="period"
                defaultValue={period}
                className="min-h-10 rounded-control border border-hairline bg-surface px-3 text-sm font-medium text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {TRAFFIC_PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button type="submit" className={buttonClass({ variant: "secondary", size: "sm", className: "min-h-10" })}>
                Apply
              </button>
            </form>
          }
        >
          {traffic === null ? (
            <EmptyChart message="Traffic data could not be loaded. Refresh to try again; other dashboard figures are unaffected." />
          ) : traffic.totals.views + traffic.totals.downloads > 0 ? (
            <AreaChart
              labels={traffic.buckets.map((bucket) => bucket.label)}
              series={[
                { label: "Material opens", color: "var(--chart-1)", values: traffic.views },
                { label: "Downloads", color: "var(--chart-2)", values: traffic.downloads },
              ]}
              height={310}
            />
          ) : (
            <EmptyChart message={`No material opens or downloads were recorded in the selected ${periodLabel.toLowerCase()}. The chart will fill as activity is recorded.`} />
          )}

          {traffic && (
            <p className="mt-4 flex items-start gap-3 rounded-control border border-primary/10 bg-primary/[0.045] px-4 py-3 text-sm leading-relaxed text-ink-muted">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <span>
                {latestBucket ? (
                  <>
                    <strong className="font-semibold text-ink">Latest {periodUnit} · {latestBucket.label}:</strong>
                    {` ${latestOpens.toLocaleString("en-GB")} material opens and ${latestDownloads.toLocaleString("en-GB")} downloads.`}
                    {` Selected-period totals: ${traffic.totals.views.toLocaleString("en-GB")} opens and ${traffic.totals.downloads.toLocaleString("en-GB")} downloads.`}
                  </>
                ) : (
                  "No reporting buckets were available for this selection."
                )}
              </span>
            </p>
          )}
        </ChartCard>
      </section>

      {/* ── Secondary analysis ──────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Resource Composition"
          description="Published Training Materials by their recorded resource type. Categories use the same scope and publication rules as the headline total."
          table={{
            head: ["Resource type", "Published materials"],
            rows: typeMix?.map((entry) => [MATERIAL_TYPE_LABELS[entry.type], entry.count]) ?? [],
          }}
        >
          {typeMix === null ? (
            <EmptyChart message="Published-material classifications could not be loaded. Refresh to retry the type breakdown." />
          ) : publishedTotal === null ? (
            <EmptyChart message="The published-material total is unavailable, so this breakdown cannot be verified." />
          ) : publishedTotal === 0 ? (
            <EmptyChart message="No Training Materials are marked published in your authorised scope yet." />
          ) : !typeMixReconciles ? (
            <EmptyChart message={`Classification is incomplete: ${publishedTotal.toLocaleString("en-GB")} materials are marked published, but the type categories total ${typeTotal.toLocaleString("en-GB")}. No misleading donut is shown.`} />
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

        <ChartCard
          title="Most accessed Programme Fields"
          description="Material opens over the last 30 days, grouped by Programme Field and shown under its parent Programme Area."
          table={{
            head: ["Programme Area", "Programme Field", "Opens · 30 days"],
            rows: programmeTraffic?.map((row) => [row.parentLabel, row.label, row.value]) ?? [],
          }}
        >
          {programmeTraffic === null ? (
            <EmptyChart message="Programme Field traffic could not be loaded. Refresh to try again." />
          ) : programmeTraffic.length > 0 ? (
            <RankBars
              unit="opens"
              items={programmeTraffic.slice(0, 6).map((row, index) => ({
                label: row.label,
                hint: `Programme Area: ${row.parentLabel}`,
                value: row.value,
                color: `var(--chart-${(index % 7) + 1})`,
              }))}
            />
          ) : (
            <EmptyChart message="No material opens were recorded in the last 30 days." />
          )}
        </ChartCard>
      </div>

      {/* ── Notifications ──────────────────────────────────────────────────
          The reading record that used to sit beside this listed opened
          materials. Material belongs to its training now (ADR-0031), so there
          is nothing standing alone to list. */}
      <div className="grid gap-6">

        <aside aria-labelledby="notifications-heading" className="rounded-card border border-hairline bg-surface p-5 shadow-panel sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Official notices</p>
              <h2 id="notifications-heading" className="mt-1 flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
                Notifications &amp; updates
                <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
              </h2>
              <p className="mt-1 text-sm text-ink-muted">Notices, material updates and messages addressed to you.</p>
            </div>
            <Link href="/notifications" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {notifications === null ? (
            <div className="mt-5"><EmptyChart message="Notifications could not be loaded. Open the full list or refresh to try again." /></div>
          ) : notifications.length === 0 ? (
            <div className="mt-5">
              <ListEmptyState title="No notifications yet" description="Official notices and updates addressed to you will appear here." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-hairline/70">
              {notifications.map((item) => {
                const link = safeAppLink(item.linkUrl);
                return (
                  <li key={item.id} className="py-3 first:pt-1 last:pb-1">
                    <Link href={link ?? "/notifications"} className="group block rounded-control px-2 py-2 transition-colors hover:bg-surface-2">
                      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                        <span className={`h-2 w-2 rounded-full ${item.isRead ? "bg-hairline" : "bg-accent"}`} aria-hidden="true" />
                        {notificationTypeLabel(item.type)}
                        {!item.isRead && (
                          <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[9px] font-bold text-accent-ink">New</span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-ink group-hover:text-primary">{item.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-muted">{item.body}</span>
                      <time dateTime={item.publishedAt.toISOString()} className="mt-1.5 block text-[10px] text-ink-muted">
                        {formatDateTime(item.publishedAt)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <p className="flex flex-wrap items-center gap-2 rounded-card border border-hairline bg-surface-2 p-4 text-xs leading-relaxed text-ink-muted sm:p-5 sm:text-sm">
        <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Material opens are counted once per person per day and respect Do Not Track.
        <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Downloads come from completed file-issue audit entries.
        <Sparkles className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
        Reporting dates follow Africa/Accra time.
      </p>
    </div>
  );
}
