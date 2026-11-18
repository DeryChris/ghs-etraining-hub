import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Bell, ClipboardCheck, Download, Eye, ShieldAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PriorityChip } from "@/components/ui/priority-chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate, formatDateTime, formatMinutes } from "@/lib/format";
import { safeAppLink } from "@/lib/links";
import { MATERIAL_TYPE_LABELS, ROLE_LABELS, notificationTypeLabel } from "@/lib/labels";
import { firstNameOf } from "@/lib/names";
import { getInsights, getTrafficSeries } from "@/lib/server/insights-queries";
import { getTrainingCounts } from "@/lib/server/insights-queries";
import { getLearnerDashboard } from "@/lib/server/learning-queries";
import { listNotifications } from "@/lib/server/notification-queries";
import { requireSession } from "@/lib/server/rbac";
import { isStaffRole } from "@/lib/viewer";

const NOTICES: Record<string, string> = {
  forbidden: "That page is not available for your role.",
  "password-updated": "Your password has been updated.",
};

function greetingFor(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", hour: "numeric", hour12: false }).format(now)) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "success";
}) {
  const valueClass = tone === "warn" ? "text-warn" : tone === "success" ? "text-primary" : "text-ink";
  const iconClass = tone === "warn" ? "bg-warn/12 text-warn" : "bg-primary/10 text-primary";
  return (
    <div className="surface-card group p-5 transition-transform duration-base ease-out-quint hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-control ${iconClass}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-extrabold tabular-nums ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await requireSession();
  const { notice } = await searchParams;
  const now = new Date();

  const staff = isStaffRole(session.role);
  const [dashboard, announcements, insights, traffic, sessionRecord] = await Promise.all([
    getLearnerDashboard(session),
    listNotifications(session, 4),
    staff ? getInsights(session) : Promise.resolve(null),
    staff ? getTrafficSeries(session, 4) : Promise.resolve(null),
    staff ? getTrainingCounts(session) : Promise.resolve(null),
  ]);


  const outstanding = dashboard.mandatoryOutstanding;
  const noticeText = notice ? NOTICES[notice] : undefined;
  const nextUp = dashboard.continueLearning[0] ?? outstanding[0] ?? null;

  return (
    <div className="space-y-10">
      {noticeText && (
        <p role="status" className="rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          {noticeText}
        </p>
      )}

      {/* Hero */}
      <section aria-labelledby="dash-title" className="surface-card hero-glow relative overflow-hidden p-7 sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {ROLE_LABELS[session.role]} · {formatDate(now)}
            </p>
            <h1 id="dash-title" className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
              {greetingFor(now)}, {firstNameOf(session.name)}.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-ink-muted">
              {outstanding.length > 0
                ? `${outstanding.length} mandatory ${outstanding.length === 1 ? "protocol needs" : "protocols need"} your attention. Start with the first one.`
                : "Nothing mandatory is waiting for you. The material from your last training is in the library."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {nextUp ? (
                <Link href={`/materials/${nextUp.id}`} className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
                  {dashboard.continueLearning[0] ? "Continue learning" : "Open the next protocol"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
              <Link href="/library" className={buttonClass({ variant: "secondary", className: "h-12 rounded-[var(--radius-pill)] px-6" })}>
                Browse library
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Stats */}
      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          icon={ShieldAlert}
          label="Mandatory to do"
          value={String(outstanding.length)}
          hint={dashboard.mandatoryTotal === 0 ? "None assigned" : `of ${dashboard.mandatoryTotal} mandatory protocols`}
          tone={outstanding.length > 0 ? "warn" : "success"}
        />
        <StatTile icon={BookOpen} label="In progress" value={String(dashboard.inProgressCount)} hint="Materials you have started" />
        <StatTile icon={BadgeCheck} label="Completed" value={String(dashboard.completedCount)} hint="Recorded on your transcript" />
      </section>

      {insights && traffic && sessionRecord && (
        <section aria-labelledby="insights-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="insights-heading" className="text-lg font-bold text-ink">
                Library at a glance
              </h2>
              <p className="text-sm text-ink-muted">
                {insights.scope === "all"
                  ? "Traffic and output across every programme. The detail is on Insights."
                  : "Traffic and output in the programmes you run. The detail is on Insights."}
              </p>
            </div>
            <Link href="/insights" className={buttonClass({ variant: "ghost", size: "sm" })}>
              All insights
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={Eye}
              label="Opens · 4 weeks"
              value={String(traffic.totals.views)}
              hint={`${insights.catalogue.published} materials published`}
            />
            <StatTile
              icon={Download}
              label="Downloads · 4 weeks"
              value={String(traffic.totals.downloads)}
              hint="From the audit trail"
            />
            <StatTile
              icon={ClipboardCheck}
              label="Trainings · 90 days"
              value={String(sessionRecord.last90Days)}
              hint={`${sessionRecord.total} on record`}
            />
            <StatTile
              icon={BookOpen}
              label="Awaiting review"
              value={String(insights.catalogue.inReview)}
              hint={insights.catalogue.inReview > 0 ? "Waiting for a decision" : "The queue is clear"}
              tone={insights.catalogue.inReview > 0 ? "warn" : "success"}
            />
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-labelledby="mandatory-heading" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="mandatory-heading" className="text-lg font-bold text-ink">
                  Mandatory protocols
                </h2>
                <p className="text-sm text-ink-muted">Acknowledge and complete these to keep your record current.</p>
              </div>
            </div>
            {outstanding.length === 0 ? (
              <ListEmptyState
                art="folder"
                title="You are up to date"
                description="No mandatory protocols are waiting for you. New ones appear here as soon as they are published."
              />
            ) : (
              <ul className="space-y-3">
                {outstanding.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/materials/${item.id}`}
                      className="group surface-card flex flex-col gap-4 p-5 transition-[transform,border-color] duration-base ease-out-quint hover:-translate-y-0.5 hover:border-primary/40 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityChip priority={item.priority} />
                          {item.reacknowledgementRequired && <span className="text-xs font-semibold text-warn">New version: acknowledge again</span>}
                        </div>
                        <p className="font-semibold text-ink group-hover:text-primary">{item.title}</p>
                        <p className="text-xs text-ink-muted">
                          {item.areaName}
                          {item.estimatedMinutes !== null ? ` · ${formatMinutes(item.estimatedMinutes)}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                        Open
                        <ArrowRight className="h-4 w-4 transition-transform duration-base group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="continue-heading" className="space-y-4">
            <h2 id="continue-heading" className="text-lg font-bold text-ink">
              Continue where you left off
            </h2>
            {dashboard.continueLearning.length === 0 ? (
              <ListEmptyState
                art="search"
                title="Nothing in progress"
                description="Open the library to start a material. Your progress is saved as you go."
                actionText="Browse the library"
                actionHref="/library"
              />
            ) : (
              <ul className="surface-card divide-y divide-hairline overflow-hidden">
                {dashboard.continueLearning.map((item) => (
                  <li key={item.id}>
                    <Link href={`/materials/${item.id}`} className="block p-5 transition-colors duration-fast hover:bg-surface-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                        {MATERIAL_TYPE_LABELS[item.type]} · {item.areaName}
                      </p>
                      <p className="mt-1 font-semibold text-ink">{item.title}</p>
                      <div className="mt-3">
                        <ProgressBar value={item.watchedPercent} label={`Progress on ${item.title}`} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside aria-labelledby="announcements-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="announcements-heading" className="text-lg font-bold text-ink">
              Announcements
            </h2>
            <Bell className="h-4 w-4 text-ink-muted" aria-hidden />
          </div>
          {announcements.length === 0 ? (
            <ListEmptyState art="bell" title="No announcements" description="Notices from your directorate appear here." />
          ) : (
            <ul className="space-y-3">
              {announcements.map((notice) => {
                const link = safeAppLink(notice.linkUrl);
                return (
                  <li key={notice.id} className="surface-card p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {!notice.isRead && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
                      {!notice.isRead && <span className="sr-only">Unread:</span>}
                      {notificationTypeLabel(notice.type)}
                    </p>
                    <p className="mt-2 font-semibold leading-snug text-ink">{notice.title}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{notice.body}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <time className="text-xs text-ink-muted" dateTime={notice.publishedAt.toISOString()}>
                        {formatDateTime(notice.publishedAt)}
                      </time>
                      {link && (
                        <Link href={link} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                          Open
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/notifications" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            All notifications
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  );
}
