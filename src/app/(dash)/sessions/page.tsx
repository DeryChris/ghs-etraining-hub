import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { SessionForm, type ProgrammeOption } from "@/components/sessions/session-form";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/server/rbac";
import { getSessionSummary, listSessionGeography, listSessionProgrammes, listSessions } from "@/lib/server/session-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sessions" };

function buildProgrammeOptions(
  rows: { categoryId: string; categoryName: string; spaceId: string | null; spaceTitle: string | null }[],
): ProgrammeOption[] {
  const map = new Map<string, ProgrammeOption>();
  for (const row of rows) {
    const programme = map.get(row.categoryId) ?? { categoryId: row.categoryId, categoryName: row.categoryName, spaces: [] };
    if (row.spaceId && row.spaceTitle) programme.spaces.push({ id: row.spaceId, title: row.spaceTitle });
    map.set(row.categoryId, programme);
  }
  return [...map.values()];
}

export default async function SessionsPage() {
  const session = await requireRole(["SYSTEM_ADMIN", "FACILITATOR"]);
  const [sessions, summary, geography, programmeRows] = await Promise.all([
    listSessions(session),
    getSessionSummary(session),
    listSessionGeography(),
    listSessionProgrammes(session),
  ]);

  const programmes = buildProgrammeOptions(programmeRows);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Field record"
        title="Training sessions"
        description="Every training that ran, under the programme that organised it, with where it was held. This is the record the insights charts count — sessions, attendance and the material each one produced."
        actions={
          <Link href="/insights" className={buttonClass({ variant: "ghost" })}>
            Open insights
          </Link>
        }
      />

      <section aria-label="Session totals" className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4">
        <Stat value={summary.total} label="Sessions recorded" />
        <Stat value={summary.last90Days} label="In the last 90 days" />
        <Stat value={summary.attendees} label="People reached" />
        <Stat value={summary.programmes} label="Programmes running sessions" />
      </section>

      {programmes.length === 0 ? (
        <ListEmptyState
          title="No programme to file a session under"
          description="A session needs a programme. Ask an administrator to assign you to one, or to create the programme first."
          actionText="See programmes"
          actionHref="/directorates"
        />
      ) : (
        <SessionForm programmes={programmes} geography={geography} />
      )}

      <section aria-labelledby="session-list-heading" className="space-y-4">
        <div>
          <h2 id="session-list-heading" className="text-lg font-bold text-ink">
            Recent sessions
          </h2>
          <p className="text-sm text-ink-muted">
            Newest first, limited to the programmes you facilitate. Anything older stays in the record.
          </p>
        </div>

        {sessions.length === 0 ? (
          <ListEmptyState
            title="No sessions recorded yet"
            description="Record the first one above. Every session you log becomes a point on the insights charts."
            art="folder"
          />
        ) : (
          <ul className="space-y-3">
            {sessions.map((row) => (
              <li key={row.id} className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      {row.categoryName}
                      {row.spaceTitle ? ` · ${row.spaceTitle}` : ""}
                    </p>
                    <h3 className="text-base font-bold text-ink">{row.title}</h3>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(row.organisedOn)}
                      </span>
                      {(row.facilityName || row.districtName) && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {[row.facilityName, row.subDistrictName, row.districtName, row.regionName].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {row.attendeeCount !== null && <Badge variant="outline">{row.attendeeCount} attended</Badge>}
                    {row.facilitatorName && <Badge variant="outline">Led by {row.facilitatorName}</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
