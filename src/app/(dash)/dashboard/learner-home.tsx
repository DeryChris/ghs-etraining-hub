import Link from "next/link";
import { ArrowRight, Bell, BookOpen, Sparkles } from "lucide-react";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { ListEmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { notificationTypeLabel } from "@/lib/labels";
import { firstNameOf } from "@/lib/names";
import { fieldHref, safeAppLink } from "@/lib/links";
import { withinOr } from "@/lib/server/deadline";
import { listFields } from "@/lib/server/learning-queries";
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


export async function LearnerHome({ session }: { session: Session }) {
  const now = new Date();

  /*
   * None of these is the page. A slow reading record must not take the greeting
   * down with it, so each has a deadline and an honest empty result.
   */
  const [announcements, fields] = await Promise.all([
    withinOr("dashboard.notices", listNotifications(session, 4), []),
    withinOr("dashboard.fields", listFields(session), []),
  ]);

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
              Every training GHS held for your Programme Areas and Programme Fields is on record here — what it
              covered, who ran it, and the slides, attendance sheet and report that came with it.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/trainings"
                className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                See the trainings
              </Link>
              <Link
                href="/catalogue"
                className={buttonClass({
                  variant: "secondary",
                  className: "h-12 rounded-[var(--radius-pill)] px-6",
                })}
              >
                Browse by programme
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Announcements ───────────────────────────────────────────────── */}
      <div className="grid gap-8">
        <aside aria-labelledby="announcements-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="announcements-heading" className="text-xl font-extrabold tracking-tight text-ink">
              Announcements
            </h2>
            <Bell className="h-4 w-4 text-ink-muted" aria-hidden />
          </div>
          {announcements.length === 0 ? (
            <ListEmptyState
              title="No announcements"
              description="Notices sent to your staff account appear here."
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
              Browse Programme Areas and the Programme Fields within each one.
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
