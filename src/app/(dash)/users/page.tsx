import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { inputClass, labelClass } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserRowActions } from "@/components/users/user-row-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { DIRECTORY_PAGE_SIZE, getDirectorySummary, listDirectory, type DirectoryStatus } from "@/lib/server/directory-queries";
import { requireRole } from "@/lib/server/rbac";
import { isRole } from "@/lib/rbac/capabilities";

export const dynamic = "force-dynamic";

export const metadata = { title: "Users" };

function pageHref(params: { q: string; role: string | null; status: string | null; page: number }): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.role) search.set("role", params.role);
  if (params.status) search.set("status", params.status);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/users?${suffix}` : "/users";
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const session = await requireRole(["SYSTEM_ADMIN"]);
  const params = await searchParams;

  const query = (params.q ?? "").trim().slice(0, 120);
  const role = isRole(params.role) ? params.role : null;
  const status: DirectoryStatus | null = params.status === "active" || params.status === "inactive" ? params.status : null;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const [directory, summary] = await Promise.all([
    listDirectory({ query, role, status, page: Number.isFinite(requestedPage) ? requestedPage : 1 }),
    getDirectorySummary(),
  ]);

  const filtered = query.length > 0 || role !== null || status !== null;
  const firstOnPage = directory.total === 0 ? 0 : (directory.page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const lastOnPage = (directory.page - 1) * DIRECTORY_PAGE_SIZE + directory.items.length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Who may sign in and what they may do. Every change here is capability-checked on the server and written to the audit trail."
        actions={
          <Link href="/insights" className={buttonClass({ variant: "ghost" })}>
            Service insights
          </Link>
        }
      />

      <section aria-label="Directory totals" className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-5">
        <Stat value={summary.total} label="People in the directory" />
        <Stat value={summary.learners} label="Active learners" />
        <Stat value={summary.facilitators} label="Active facilitators" />
        <Stat value={summary.admins} label="Active administrators" />
        <Stat value={summary.neverSignedIn} label="Never signed in" />
      </section>

      <CreateUserForm />

      <form action="/users" method="get" role="search" className="grid gap-3 rounded-card border border-hairline bg-surface p-4 md:grid-cols-[1fr_200px_180px_auto] md:items-end">
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
          <select id="user-role" name="role" defaultValue={role ?? ""} className={inputClass}>
            <option value="">All roles</option>
            <option value="LEARNER">Learner</option>
            <option value="FACILITATOR">Facilitator</option>
            <option value="SYSTEM_ADMIN">System administrator</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-status" className={labelClass}>
            Status
          </label>
          <select id="user-status" name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">All accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
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
                      <p className="text-ink">{ROLE_LABELS[row.role]}</p>
                      <p className="text-xs text-ink-muted">
                        {[row.directorate, row.facility, row.region].filter(Boolean).join(" · ") || "No posting recorded"}
                      </p>
                      {row.cadre && <p className="text-xs text-ink-muted">{row.cadre}</p>}
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
                        role={row.role}
                        isActive={row.isActive}
                        isSelf={isSelf}
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
              href={pageHref({ q: query, role, status, page: directory.page - 1 })}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              Previous
            </Link>
          )}
          {directory.page < directory.pageCount && (
            <Link
              href={pageHref({ q: query, role, status, page: directory.page + 1 })}
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
