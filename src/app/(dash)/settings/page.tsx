import Link from "next/link";
import { desc } from "drizzle-orm";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/db/index";
import { auditLogs } from "@/db/schema";
import { displayOrigin } from "@/lib/app-url";
import { formatDateTime } from "@/lib/format";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { staffRoleOf } from "@/lib/rbac/capabilities";
import { getDirectorySummary } from "@/lib/server/directory-queries";
import { requireRole } from "@/lib/server/rbac";
import { SITE } from "@/lib/site";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline/60 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-muted">{term}</dt>
      <dd className="text-sm font-semibold text-ink sm:text-right">{children}</dd>
    </div>
  );
}

function Planned({ done, children }: { done: boolean; children: React.ReactNode }) {
  const Icon = done ? CheckCircle2 : CircleDashed;
  return (
    <li className="flex items-start gap-3 text-sm">
      <Icon className={done ? "mt-0.5 h-4 w-4 shrink-0 text-primary" : "mt-0.5 h-4 w-4 shrink-0 text-ink-muted"} aria-hidden />
      <span className={done ? "text-ink" : "text-ink-muted"}>{children}</span>
    </li>
  );
}

/**
 * Settings today is a read-only statement of how the platform is configured,
 * because every setting that exists is either an environment variable or a
 * server policy. Editing controls are listed as still to build rather than
 * rendered as switches that do nothing.
 */
export default async function SettingsPage() {
  const session = await requireRole(["SYSTEM_ADMIN"]);
  const loaded = await withDeadline("settings", () =>
    mapLimit([
      () => getDirectorySummary(),
      () =>
        db
          .select({ action: auditLogs.action, entity: auditLogs.entity, createdAt: auditLogs.createdAt })
          .from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(1),
    ]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Settings did not load"
        description="Directory summary and audit log could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [summary, latestAudit] = loaded.data;

  const origin = displayOrigin();
  const lastAudit = latestAudit[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="How this deployment is configured, and what still has to be set outside the application. Nothing here can change policy that the audit trail depends on."
        actions={
          <Link href="/users" className={buttonClass({ variant: "ghost" })}>
            Manage users
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="platform-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
          <h2 id="platform-heading" className="text-lg font-bold text-ink">
            Platform
          </h2>
          <dl>
            <Fact term="Service">
              {SITE.fullName} <span className="font-normal text-ink-muted">({SITE.code})</span>
            </Fact>
            <Fact term="Public address">
              {origin ? (
                <span className="font-mono text-xs">{origin}</span>
              ) : (
                <span className="text-warn">NEXT_PUBLIC_APP_URL is not set</span>
              )}
            </Fact>
            <Fact term="Regional scope">{SITE.regionName}</Fact>
            <Fact term="Support e-mail">{SITE.supportEmail ?? <span className="text-ink-muted">Not configured</span>}</Fact>
            <Fact term="Support phone">{SITE.supportPhone ?? <span className="text-ink-muted">Not configured</span>}</Fact>
            <Fact term="Policies last updated">{SITE.policyUpdated}</Fact>
            <Fact term="Health probe">
              <a href="/api/health" className="text-primary underline-offset-4 hover:underline">
                /api/health
              </a>
            </Fact>
          </dl>
        </section>

        <section aria-labelledby="account-heading" className="space-y-3 rounded-card border border-hairline bg-surface p-6 shadow-panel">
          <h2 id="account-heading" className="text-lg font-bold text-ink">
            Your account
          </h2>
          <dl>
            <Fact term="Name">{session.name}</Fact>
            <Fact term="Staff ID">{session.staffId}</Fact>
            <Fact term="E-mail">
              <span className="font-mono text-xs">{session.email}</span>
            </Fact>
            <Fact term="Role">
              <Badge variant="outline">{STAFF_ROLE_LABELS[staffRoleOf({ role: session.role, unitHead: session.unitHead })]}</Badge>
            </Fact>
            <Fact term="People in the directory">{summary.total}</Fact>
            <Fact term="Active administrators">
              {summary.admins} <span className="font-normal text-ink-muted">(the last one cannot be removed)</span>
            </Fact>
          </dl>
          <p className="text-xs leading-relaxed text-ink-muted">
            Your password is stored as a hash on your staff record and checked by this application — no third-party
            sign-in service is involved. To change it, ask an administrator for a one-time reset link (see “Forgot
            password” on the sign-in page).
          </p>
        </section>
      </div>

      <section aria-labelledby="policy-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-6 shadow-panel">
        <div>
          <h2 id="policy-heading" className="text-lg font-bold text-ink">
            Policies in force
          </h2>
          <p className="text-sm text-ink-muted">
            These are enforced in code and covered by tests. They are listed here so nobody has to read the source to
            know what the platform will and will not do.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          <Planned done>Two people to publish: the uploader cannot approve their own version.</Planned>
          <Planned done>Material is archived, never deleted; superseded versions stay readable.</Planned>
          <Planned done>Every privileged action is written to a hash-chained audit trail.</Planned>
          <Planned done>Staff are deactivated rather than deleted, so past changes keep their author.</Planned>
          <Planned done>Accounts are issued from the directory; there is no public sign-up.</Planned>
          <Planned done>Downloads of controlled material are recorded.</Planned>
        </ul>
        {lastAudit && (
          <p className="text-xs text-ink-muted">
            Latest audit entry: <span className="font-mono">{lastAudit.action}</span> on {lastAudit.entity} ·{" "}
            {formatDateTime(lastAudit.createdAt)}
          </p>
        )}
      </section>

      <section aria-labelledby="todo-heading" className="space-y-4 rounded-card border border-hairline bg-surface p-6 shadow-panel">
        <div>
          <h2 id="todo-heading" className="text-lg font-bold text-ink">
            Not configurable from here yet
          </h2>
          <p className="text-sm text-ink-muted">
            Each of these is a deliberate gap, not a hidden control. Where it is configured today is written beside it.
          </p>
        </div>
        <ul className="space-y-3">
          <Planned done={false}>
            <strong className="font-semibold text-ink">Programme areas and fields</strong> — created with the seeder
            and SQL today; a create/edit screen is the next administration surface.
          </Planned>
          <Planned done={false}>
            <strong className="font-semibold text-ink">Maintenance banner</strong> — the capability exists
            (<span className="font-mono text-xs">maintenance_banner.manage</span>) but there is no banner table yet.
          </Planned>
          <Planned done={false}>
            <strong className="font-semibold text-ink">Retention and rate limits</strong> — set in code
            (<span className="font-mono text-xs">rate_limit_windows</span>, 7-year audit retention) rather than tuned
            per deployment.
          </Planned>
          <Planned done={false}>
            <strong className="font-semibold text-ink">Audit log viewer</strong> — the trail is written and verified by{" "}
            <span className="font-mono text-xs">npm run db:verify-chain</span>; browsing it in the UI is still to build.
          </Planned>
          <Planned done={false}>
            <strong className="font-semibold text-ink">Outgoing e-mail</strong> — the pilot sends none: reset links are
            handed over by an administrator. A mail provider is the next step, not a setting.
          </Planned>
        </ul>
      </section>
    </div>
  );
}
