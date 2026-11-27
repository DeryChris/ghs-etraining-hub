import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Download, Eye, History, Sparkles } from "lucide-react";
import { KindLabel } from "@/components/ui/kind-label";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { ListEmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { MATERIAL_TYPE_LABELS, notificationTypeLabel } from "@/lib/labels";
import { firstNameOf } from "@/lib/names";
import { DashboardRetry } from "./retry-card";
import { fieldHref, safeAppLink } from "@/lib/links";
import { withinOr } from "@/lib/server/deadline";
import { log } from "@/lib/server/logger";
import { listFields, listRecentOpens } from "@/lib/server/learning-queries";
import { getMyTraffic } from "@/lib/server/insights-queries";
import { listNotifications } from "@/lib/server/notification-queries";
import type { Session } from "@/lib/server/session";

/**
 * What a member of staff lands on.
 *
 * The shape is the one every learning platform settled on, because it answers
 * the three questions people actually arrive with, in this order:
 *
 *   1. *What was I doing?* — the hero names it and offers it back as one button.
 *   2. *What did I read?* — the reading record, folded into the page rather than
 *      kept on a tab of its own (ADR‑0027). Totals sit in the hero strip; the
 *      list of opens sits beside the announcements.
 *
 * There is nothing to sign here. The library is for reading, and reading leaves
 * a record of opens; it does not ask anyone to certify that they have read.
 *
 * Everything here is a link to material or to a training; there is no chart on
 * this page. Charts are for the people who run the programmes — they are on the
 * staff dashboard, which is a different page for a different job.
 */

export function greetingFor(now: Date): string {
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

/** One number in the hero strip. Small on purpose: it is context, not a dashboard. */
function HeroStat({ icon: Icon, value, label }: { icon: typeof Eye; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-extrabold leading-none text-ink">{value}</span>
        <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </span>
      </span>
    </div>
  );
}

export async function LearnerHome({ session }: { session: Session }) {
  const now = new Date();

  /*
   * None of these is the page. A slow reading record must not take the greeting
   * down with it, so each has a deadline and an honest empty result.
   */
  const [recent, traffic, announcements, fields] = await Promise.all([
    withinOr("dashboard.recent", listRecentOpens(session.sub, 12), []),
    withinOr("dashboard.traffic", getMyTraffic(session.sub), null),
    withinOr("dashboard.notices", listNotifications(session, 4), []),
    withinOr("dashboard.fields", listFields(session), []),
  ]);

  /*
   * The reading record is what this page is. If that read failed, the honest
   * answer is a retry card — three empty lists would claim the person has read
   * nothing, which is a different and untrue statement.
   */
  if (traffic === null) {
    log.error({ event: "dashboard.reads_failed", userId: session.sub });
    return <DashboardRetry hint="database" />;
  }

  const continueWith = recent[0] ?? null;
  const pickUp = recent.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby="home-title" className="surface-card hero-glow relative overflow-hidden p-6 sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {formatDate(now)}
            </p>
            <h1
              id="home-title"
              className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
            >
              {greetingFor(now)}, {firstNameOf(session.name)}.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-ink-muted">
              {continueWith ? (
                <>
                  You were reading <span className="font-semibold text-ink">{continueWith.title}</span> in{" "}
                  {continueWith.areaName}. It is still there — or open the library and start something new.
                </>
              ) : (
                "Everything GHS has published for your programmes is in the library, filed under the field and area it belongs to."
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {continueWith && (
                <Link
                  href={`/materials/${continueWith.id}`}
                  className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}
                >
                  Continue reading
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <Link
                href="/catalogue"
                className={buttonClass({
                  variant: continueWith ? "secondary" : "primary",
                  className: "h-12 rounded-[var(--radius-pill)] px-6",
                })}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Browse the library
              </Link>
            </div>
          </div>

          {/* The reading record, where it belongs: beside the greeting. */}
          {traffic && (
            <div className="grid shrink-0 grid-cols-3 gap-5 border-t border-hairline pt-6 sm:gap-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div>
                <HeroStat icon={Eye} value={traffic.opens} label={`Opened · ${traffic.days}d`} />
              </div>
              <div>
                <HeroStat icon={History} value={traffic.materials} label="Materials" />
              </div>
              <div>
                <HeroStat icon={Download} value={traffic.downloads} label={`Saved · ${traffic.days}d`} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Pick up where you left off ───────────────────────────────────── */}
      <section aria-labelledby="pickup-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="pickup-heading" className="text-xl font-extrabold tracking-tight text-ink">
              Pick up where you left off
            </h2>
            <p className="mt-1 text-sm text-ink-muted">The last things you opened, newest first.</p>
          </div>
          <Link
            href="/catalogue"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            All material
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {pickUp.length === 0 ? (
          <ListEmptyState
            art="search"
            title="Nothing opened yet"
            description="Everything published for your programmes is in the library. What you open shows up here, so you can find your way back to it."
            actionText="Browse the library"
            actionHref="/catalogue"
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pickUp.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/materials/${item.id}`}
                  className="group flex h-full flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors duration-fast hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    <KindLabel type={item.type} />
                    {MATERIAL_TYPE_LABELS[item.type]} · {item.areaName}
                  </span>
                  <p className="text-base font-bold leading-snug text-ink">{item.title}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-ink-muted">
                    Last opened {formatDateTime(item.lastViewedAt)}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-primary transition-transform duration-fast group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Your reading, beside the announcements ───────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="reading-heading" className="space-y-4 lg:col-span-2">
          <div>
            <h2 id="reading-heading" className="text-xl font-extrabold tracking-tight text-ink">
              Your reading
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {traffic
                ? `${traffic.materials} ${traffic.materials === 1 ? "material" : "materials"} in the last ${traffic.days} days. Nothing is marked or scored — this is a record of where you have been.`
                : "A record of where you have been, so you can find your way back."}
            </p>
          </div>

          {recent.length === 0 ? (
            <ListEmptyState
              title="Nothing opened yet"
              description="Open a material and it will appear here."
              actionText="Browse the library"
              actionHref="/catalogue"
            />
          ) : (
            <ul className="surface-card divide-y divide-hairline overflow-hidden p-0">
              {recent.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/materials/${item.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-2"
                  >
                    <KindLabel type={item.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{item.areaName}</span>
                    </span>
                    <time
                      className="shrink-0 text-xs text-ink-muted"
                      dateTime={item.lastViewedAt.toISOString()}
                    >
                      {formatDateTime(item.lastViewedAt)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="announcements-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="announcements-heading" className="text-xl font-extrabold tracking-tight text-ink">
              Announcements
            </h2>
            <Bell className="h-4 w-4 text-ink-muted" aria-hidden />
          </div>
          {announcements.length === 0 ? (
            <ListEmptyState
              art="bell"
              title="No announcements"
              description="Notices from your programme appear here."
            />
          ) : (
            <ul className="space-y-3">
              {announcements.map((notice) => {
                const link = safeAppLink(notice.linkUrl);
                return (
                  <li key={notice.id} className="surface-card p-4">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      {!notice.isRead && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
                      {!notice.isRead && <span className="sr-only">Unread:</span>}
                      {notificationTypeLabel(notice.type)}
                    </p>
                    <p className="mt-1.5 font-semibold leading-snug text-ink">{notice.title}</p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{notice.body}</p>
                    {link && (
                      <Link
                        href={link}
                        className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    )}
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

      {/* ── Explore ──────────────────────────────────────────────────────── */}
      {fields.length > 0 && (
        <section aria-labelledby="explore-heading" className="space-y-4">
          <div>
            <h2 id="explore-heading" className="text-xl font-extrabold tracking-tight text-ink">
              Explore the library
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Programmes are filed the way GHS runs them: a field, then the areas inside it.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.slice(0, 6).map((field) => (
              <li key={field.id}>
                <ProgrammeFieldTile field={field} href={fieldHref(field.code)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
