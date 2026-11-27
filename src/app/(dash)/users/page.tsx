import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { inputClass, labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { Stat } from "@/components/ui/stat";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserRowActions } from "@/components/users/user-row-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { isStaffRole, staffRoleOf, STAFF_ROLE_VALUES } from "@/lib/rbac/capabilities";
import {
  DIRECTORY_PAGE_SIZE,
  type DirectorySummary,
  getDirectorySummary,
  listAccessGrants,
  listDirectory,
  type DirectoryGroup,
  type DirectoryStatus,
} from "@/lib/server/directory-queries";
import { listProgrammeFieldOptions } from "@/lib/server/taxonomy-queries";
import { requireRole } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users" };

function pageHref(params: {
  q: string;
  role: string | null;
  status: string | null;
  group: string | null;
  page: number;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.group) search.set("group", params.group);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/users?${suffix}` : "/users";
}

const GROUPS: { key: DirectoryGroup | null; label: string; count: (summary: DirectorySummary) => number }[] = [
  { key: null, label: "Everyone", count: (summary) => summary.total },
  { key: "staff", label: "Staff", count: (summary) => summary.learners },
  { key: "facilitators", label: "Facilitators", count: (summary) => summary.facilitators },
  { key: "unit-heads", label: "Unit heads", count: (summary) => summary.unitHeads },
  { key: "admins", label: "Admins", count: (summary) => summary.admins },
];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; group?: string; page?: string }>;
}) {
  const session = await requireRole(["SYSTEM_ADMIN"]);
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 120);
  // A role choice, not a stored role: Unit head is a facilitator carrying the duty.
  const role = isStaffRole(params.role) ? params.role : null;
  const status: DirectoryStatus | null = params.status === "active" || params.status === "inactive" ? params.status : null;
  const group: DirectoryGroup | null =
    params.group === "staff" || params.group === "facilitators" || params.group === "unit-heads" || params.group === "admins"
      ? params.group
      : null;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const loaded = await withDeadline("users", () =>
    mapLimit([
      () => listDirectory({ query, role, status, group, page: Number.isFinite(requestedPage) ? requestedPage : 1 }),
      getDirectorySummary,
      () => listProgrammeFieldOptions(),
    ]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The staff directory did not load"
        description="The directory could not be read in time. No account was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [directory, summary, fieldOptions] = loaded.data;
  // What each visible person already holds, so the access overlay opens on their
  // current grants instead of an empty form that would wipe them on save.
  const grants = await listAccessGrants(directory.items.map((row) => row.id));

  const filtered = query.length > 0 || role !== null || status !== null || group !== null;
  const firstOnPage = directory.total === 0 ? 0 : (directory.page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const lastOnPage = (directory.page - 1) * DIRECTORY_PAGE_SIZE + directory.items.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Who may sign in and what they may do. The role is chosen from four: staff, facilitator, unit head and system administrator. Every change here is capability-checked on the server and written to the audit trail."
        actions={
          <Link href="/insights" className={buttonClass({ variant: "ghost" })}>
            Service insights
          </Link>
        }
      />

      <nav aria-label="Manage by group" className="flex flex-wrap items-center gap-2">
        {GROUPS.map((entry) => {
          const active = group === entry.key;
          const href = (() => {
            const search = new URLSearchParams();
            if (entry.key) search.set("group", entry.key);
            if (query) search.set("q", query);
            if (status) search.set("status", status);
            const suffix = search.toString();
            return suffix ? `/users?${suffix}` : "/users";
          })();
          return (
            <Link
              key={entry.key ?? "everyone"}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
              }`}
            >
              {entry.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  active ? "bg-primary-ink/20 text-primary-ink" : "bg-surface-2 text-ink-muted"
                }`}
              >
                {entry.count(summary)}
              </span>
            </Link>
          );
        })}
      </nav>

      <section
        aria-label="Directory totals"
        className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <Stat value={summary.total} label="People in the directory" />
        <Stat value={summary.learners} label="Active staff" />
        <Stat value={summary.facilitators} label="Active facilitators" />
        <Stat value={summary.unitHeads} label="Active unit heads" />
        <Stat value={summary.admins} label="Active administrators" />
        <Stat value={summary.neverSignedIn} label="Never signed in" />
      </section>

      <CreateUserForm />

      {summary.learners === 0 && (
        <section
          aria-labelledby="staff-import-heading"
          className="rounded-card border border-warn/40 bg-warn/10 p-5 shadow-panel"
        >
          <h2 id="staff-import-heading" className="text-sm font-bold text-warn">
            No staff accounts yet — the seed does not create people
          </h2>
          <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-ink">
            <code className="rounded bg-surface px-1 py-0.5 text-xs">npm run db:seed</code> writes regions, districts,
            facilities and the programme taxonomy from this repository. The people come from the GHS staff sheet,
            which is personal data and is never committed — so it is a separate, explicit step:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-control border border-hairline bg-surface px-4 py-3 text-xs leading-relaxed text-ink">
{`npm run staff:import -- --file "C:\\path\\to\\Staff Data.csv" --dry-run
npm run staff:import -- --file "C:\\path\\to\\Staff Data.csv"
npm run staff:status`}
          </pre>
          <p className="mt-2 text-xs text-ink-muted">
            Every imported person arrives with the Staff role and chooses a password at first sign-in. Check the
            result with <code className="rounded bg-surface px-1 py-0.5">npm run staff:status</code>.
          </p>
        </section>
      )}

      <form action="/users" method="get" role="search" className="grid gap-3 rounded-card border border-hairline bg-surface p-4 md:grid-cols-[1fr_200px_180px_auto] md:items-end">
        {/* Searching inside a group keeps you inside it. */}
        {group && <input type="hidden" name="group" value={group} />}
        <div>
          <label htmlFor="user-q" className={labelClass}>
            Search
          </label>
          <input id="user-q" name="q" type="search" defaultValue={query} placeholder="Name, e-mail or staff ID" className={inputClass} />
        </div>
        <div>
          <label htmlFor="user-role" className={labelClass}>
            Role
          </label>
          <Select
            id="user-role"
            name="role"
            defaultValue={role ?? ""}
            options={[
              { value: "", label: "All roles" },
              ...STAFF_ROLE_VALUES.map((value) => ({ value, label: STAFF_ROLE_LABELS[value] })),
            ]}
          />
        </div>
        <div>
          <label htmlFor="user-status" className={labelClass}>
            Status
          </label>
          <Select
            id="user-status"
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "All accounts" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Deactivated" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className={buttonClass({ variant: "secondary" })}>
            Filter
          </button>
          {filtered && (
            <Link href="/users" className={buttonClass({ variant: "ghost" })}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {directory.items.length === 0 ? (
        <ListEmptyState
          title={filtered ? "No one matches that search" : "The directory is empty"}
          description={
            filtered
              ? "Try the staff ID instead of the name, or clear the filters to see everyone."
              : "Add the first staff member above. Nothing can be published until someone can sign in."
          }
          actionText={filtered ? undefined : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-hairline bg-surface shadow-panel">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <caption className="sr-only">
              Staff directory, {firstOnPage}–{lastOnPage} of {directory.total}
            </caption>
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-[0.14em] text-ink-muted">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Person
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Posting
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {directory.items.map((row) => {
                const isSelf = row.id === session.sub;
                return (
                  <tr key={row.id} className="border-b border-hairline/60 align-top last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-ink">{row.fullName}</p>
                      <p className="text-xs text-ink-muted">{row.email}</p>
                      <p className="mt-1 text-xs text-ink-muted">{row.staffId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-ink">{STAFF_ROLE_LABELS[staffRoleOf({ role: row.role, unitHead: row.isUnitHead })]}</p>
                      <p className="text-xs text-ink-muted">
                        {[row.directorate, row.facility, row.region].filter(Boolean).join(" · ") || "No posting recorded"}
                      </p>
                      {row.grade && <p className="text-xs text-ink-muted">{row.grade}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={row.isActive ? "success" : "danger"}>{row.isActive ? "Active" : "Deactivated"}</Badge>
                      <p className="mt-2 text-xs text-ink-muted">
                        {row.lastLoginAt ? `Last signed in ${formatDateTime(row.lastLoginAt)}` : `Added ${formatDate(row.createdAt)} · never signed in`}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <UserRowActions
                        userId={row.id}
                        fullName={row.fullName}
                        email={row.email ?? ""}
                        role={row.role}
                        region={row.region}
                        grade={row.grade}
                        facility={row.facility}
                        isActive={row.isActive}
                        isUnitHead={row.isUnitHead}
                        isSelf={isSelf}
                        fields={fieldOptions}
                        grants={grants.get(row.id) ?? { fieldIds: [], areaIds: [] }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
        <p>
          Showing {firstOnPage}–{lastOnPage} of {directory.total}
          {filtered ? " matching" : ""} · page {directory.page} of {directory.pageCount}
        </p>
        <div className="flex gap-2">
          {directory.page > 1 && (
            <Link
              href={pageHref({ q: query, role, status, group, page: directory.page - 1 })}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Previous
            </Link>
          )}
          {directory.page < directory.pageCount && (
            <Link
              href={pageHref({ q: query, role, status, group, page: directory.page + 1 })}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Next
            </Link>
          )}
        </div>
      </div>

      <p className="rounded-card border border-hairline bg-surface-2 p-5 text-sm leading-relaxed text-ink-muted">
        Accounts are closed, never deleted: the audit trail has to keep naming the person behind past changes. A
        deactivated account keeps its role, its record and its history, and can be reactivated here.
      </p>
    </div>
  );
}
