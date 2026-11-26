import Link from "next/link";
import { History } from "lucide-react";
import { KindLabel } from "@/components/ui/kind-label";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { formatDateTime } from "@/lib/format";
import { MATERIAL_TYPE_LABELS } from "@/lib/labels";
import { getMyTraffic } from "@/lib/server/insights-queries";
import { listRecentOpens } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "My activity" };

/** The list shows the last handful of opens; the totals cover the whole window. */
const RECENT_ROWS = 25;

export default async function ActivityPage() {
  const session = await requireSession();
  const loaded = await withDeadline("analytics", () =>
    mapLimit([() => listRecentOpens(session.sub, RECENT_ROWS + 1), () => getMyTraffic(session.sub)]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Your activity did not load"
        description="Your reading history and traffic could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
        hint={loaded.hint}
      />
    );
  }
  const [opens, traffic] = loaded.data;

  const recent = opens.slice(0, RECENT_ROWS);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My record"
        title="My activity"
        description="What you have opened and downloaded. The library keeps this so you can find your way back to the material from a training you attended — it is a record of use, not a score."
        actions={
          <Link href="/library" className={buttonClass({ variant: "secondary" })}>
            Browse the library
          </Link>
        }
      />

      <section
        aria-label="Your activity"
        className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-3"
      >
        <Stat value={traffic.opens} label={`Material opens · last ${traffic.days} days`} />
        <Stat value={traffic.materials} label={`Different materials opened · last ${traffic.days} days`} />
        <Stat value={traffic.downloads} label={`Downloads · last ${traffic.days} days`} />
      </section>

      <section aria-labelledby="recent-heading" className="space-y-4">
        <div>
          <h2 id="recent-heading" className="flex items-center gap-2 text-lg font-bold text-ink">
            <History className="h-5 w-5 text-primary" aria-hidden />
            Recently opened
          </h2>
          <p className="text-sm text-ink-muted">Newest first. Nothing here is a completion — it is where you have been.</p>
        </div>

        {recent.length === 0 ? (
          <ListEmptyState
            title="Nothing opened yet"
            description="Open a material from the library and it will appear here, so you can pick it up again."
            actionText="Browse the library"
            actionHref="/library"
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-panel">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <caption className="sr-only">Materials you have opened recently</caption>
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.14em] text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Material
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Programme area
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Last opened
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((open) => (
                  <tr key={open.id} className="border-b border-hairline/60 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/materials/${open.id}`}
                        className="inline-flex items-center gap-2 font-semibold text-ink hover:text-primary"
                      >
                        <KindLabel type={open.type} />
                        {open.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">{MATERIAL_TYPE_LABELS[open.type]}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{open.areaName}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDateTime(open.lastViewedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {opens.length > RECENT_ROWS && (
          <p className="text-sm text-ink-muted">
            Showing the {RECENT_ROWS} most recent. Older opens stay in the record and are counted in the totals above.
          </p>
        )}
      </section>
    </div>
  );
}
