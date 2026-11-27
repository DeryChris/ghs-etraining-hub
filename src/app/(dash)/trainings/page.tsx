import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { NewTrainingDialog } from "@/components/trainings/new-training-dialog";
import { Stat } from "@/components/ui/stat";
import { formatDate } from "@/lib/format";
import { TRAINING_STATUSES, TRAINING_STATUS_LABELS, isTrainingStatus } from "@/lib/labels";
import { can } from "@/lib/rbac/capabilities";
import { requireSession } from "@/lib/server/rbac";
import { listGeography, listProgrammeFieldOptions } from "@/lib/server/taxonomy-queries";
import {
  TRAININGS_PAGE_SIZE,
  getTrainingFilterOptions,
  getTrainingSummary,
  listTrainings,
} from "@/lib/server/training-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Trainings" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(value: string | undefined): string | null {
  return value && UUID.test(value) ? value : null;
}

function yearOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) && year >= 2000 && year <= 2100 ? year : null;
}

interface Query {
  q: string;
  year: number | null;
  field: string | null;
  area: string | null;
  region: string | null;
  district: string | null;
  status: string | null;
  review: string | null;
  page: number;
}

function pageHref(params: Query, page: number): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.year) search.set("year", String(params.year));
  if (params.field) search.set("field", params.field);
  if (params.area) search.set("area", params.area);
  if (params.region) search.set("region", params.region);
  if (params.district) search.set("district", params.district);
  if (params.status) search.set("status", params.status);
  if (params.review) search.set("review", params.review);
  if (page > 1) search.set("page", String(page));
  const suffix = search.toString();
  return suffix ? `/trainings?${suffix}` : "/trainings";
}

const REVIEW_STATES = ["PENDING", "PUBLISHED", "REJECTED"];

/** Chips above the list: the review queue is one click, not a filter hunt. */
const REVIEW_CHIPS = [
  { key: "", label: "Everything" },
  { key: "PENDING", label: "Pending review" },
  { key: "PUBLISHED", label: "Live" },
  { key: "REJECTED", label: "Returned" },
] as const;

const REVIEW_BADGE = {
  PENDING: { label: "Pending review", variant: "outline" },
  PUBLISHED: { label: "Live", variant: "success" },
  REJECTED: { label: "Returned for correction", variant: "danger" },
} as const;

const STATUS_BADGE = {
  PLANNED: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
} as const;

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const single = (key: string): string | undefined => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const query: Query = {
    q: (single("q") ?? "").trim().slice(0, 120),
    year: yearOrNull(single("year")),
    field: uuidOrNull(single("field")),
    area: uuidOrNull(single("area")),
    region: uuidOrNull(single("region")),
    district: uuidOrNull(single("district")),
    status: isTrainingStatus(single("status")) ? (single("status") as string) : null,
    review: REVIEW_STATES.includes(single("review") ?? "") ? (single("review") as string) : null,
    page: Math.max(1, Number.parseInt(single("page") ?? "1", 10) || 1),
  };

  // Administrators and the unit head for a field see the whole queue; everybody
  // else sees published rows plus whatever they wrote themselves.
  // A unit head needs the queue to work it; the per-row guard below still stops
  // them acting outside the fields they hold.
  const canSeeUnpublished = session.role === "SYSTEM_ADMIN" || session.unitHead === true;
  const loaded = await withDeadline("trainings", () =>
    mapLimit([
      () =>
        listTrainings({
          q: query.q || undefined,
          year: query.year ?? undefined,
          programmeFieldId: query.field ?? undefined,
          programmeAreaId: query.area ?? undefined,
          regionId: query.region ?? undefined,
          districtId: query.district ?? undefined,
          status: isTrainingStatus(query.status) ? query.status : undefined,
          review: (query.review as "PENDING" | "PUBLISHED" | "REJECTED" | null) ?? undefined,
          viewer: { userId: session.sub, seeAll: canSeeUnpublished },
          page: query.page,
        }),
      () => getTrainingSummary({ userId: session.sub, seeAll: canSeeUnpublished }),
      getTrainingFilterOptions,
      listProgrammeFieldOptions,
      listGeography,
    ]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Trainings did not load"
        description="The trainings list and its filters could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [list, summary, options, fields, geography] = loaded.data;

  const filtered =
    query.q.length > 0 ||
    query.year !== null ||
    query.field !== null ||
    query.area !== null ||
    query.region !== null ||
    query.district !== null ||
    query.status !== null;

  // Everything except the search box, which is always visible.
  const activeFilters = [query.year, query.field, query.area, query.region, query.district, query.status].filter(
    (value) => value !== null,
  ).length;

  const firstOnPage = list.total === 0 ? 0 : (list.page - 1) * TRAININGS_PAGE_SIZE + 1;
  const lastOnPage = (list.page - 1) * TRAININGS_PAGE_SIZE + list.items.length;
  const mayManage = can(session.role, "training.manage");
  const notice = single("notice");
  const error = single("error");

  return (
    <div className="space-y-8">
      <LiveRefresh label="trainings" />

      <PageHeader
        eyebrow="Trainings"
        title="Training register"
        description="Find Training Session records, including plans and records marked as held. Filter by Programme Area, Programme Field, year, location, status or review state. Training Materials live in the separate Library."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/catalogue" className={buttonClass({ variant: "ghost" })}>
              Browse the library
            </Link>
            {mayManage ? (
              <NewTrainingDialog fields={fields} geography={geography} label="Create new training" />
            ) : null}
          </div>
        }
      />

      <Notice notice={notice} error={error} />

      <section
        id="training-totals"
        aria-label="Training totals"
        className="scroll-mt-24 grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat value={summary.total} label="Training records" />
        <Stat value={summary.planned} label="Marked as planned" />
        <Stat value={summary.thisYear} label={`Records filed for ${new Date().getFullYear()}`} />
        <Stat value={summary.attendees.toLocaleString("en-GB")} label="Attendee counts recorded" />
      </section>

      <nav aria-label="Review queue" className="flex flex-wrap items-center gap-2">
        {REVIEW_CHIPS.map((chip) => {
          const active = (query.review ?? "") === chip.key;
          const href = (() => {
            const search = new URLSearchParams();
            if (chip.key) search.set("review", chip.key);
            if (query.q) search.set("q", query.q);
            if (query.year) search.set("year", String(query.year));
            if (query.field) search.set("field", query.field);
            if (query.status) search.set("status", query.status);
            const suffix = search.toString();
            return suffix ? `/trainings?${suffix}` : "/trainings";
          })();
          return (
            <Link
              key={chip.key || "all"}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
              }`}
            >
              {chip.label}
            </Link>
          );
        })}
      </nav>

      <FilterBar
        action="/trainings"
        label="Filter trainings"
        searchName="q"
        searchValue={query.q}
        searchPlaceholder="Search by title, target group or venue"
        activeCount={activeFilters}
        clearHref="/trainings"
        summary={
          list.total === 0
            ? "No matches"
            : `Showing ${firstOnPage}–${lastOnPage} of ${list.total} training${list.total === 1 ? "" : "s"}`
        }
      >
      <div>
        <label htmlFor="filter-year" className={labelClass}>
          Year
        </label>
        <Select
          id="filter-year"
          name="year"
          defaultValue={query.year ? String(query.year) : ""}
          options={[
            { value: "", label: "All years" },
            ...options.years.map((year) => ({ value: String(year), label: String(year) })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-status" className={labelClass}>
          Status
        </label>
        <Select
          id="filter-status"
          name="status"
          defaultValue={query.status ?? ""}
          options={[
            { value: "", label: "Any status" },
            ...TRAINING_STATUSES.map((status) => ({ value: status, label: TRAINING_STATUS_LABELS[status] })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-field" className={labelClass}>
          Programme Area
        </label>
        <Select
          id="filter-field"
          name="field"
          defaultValue={query.field ?? ""}
          options={[
            { value: "", label: "All Programme Areas" },
            ...fields.map((field) => ({ value: field.id, label: field.name })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-area" className={labelClass}>
          Programme Field
        </label>
        <Select
          id="filter-area"
          name="area"
          searchable
          defaultValue={query.area ?? ""}
          options={[
            { value: "", label: "All Programme Fields" },
            ...fields.flatMap((field) =>
              field.areas.map((area) => ({ value: area.id, label: area.name, group: field.name })),
            ),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-region" className={labelClass}>
          Region
        </label>
        <Select
          id="filter-region"
          name="region"
          defaultValue={query.region ?? ""}
          options={[
            { value: "", label: "All regions" },
            ...options.regions.map((region) => ({ value: region.id, label: region.name })),
          ]}
        />
      </div>

      <div>
        <label htmlFor="filter-district" className={labelClass}>
          District
        </label>
        <Select
          id="filter-district"
          name="district"
          searchable
          defaultValue={query.district ?? ""}
          options={[
            { value: "", label: "All districts" },
            ...options.regions.flatMap((region) =>
              options.districts
                .filter((district) => district.regionId === region.id)
                .map((district) => ({ value: district.id, label: district.name, group: region.name })),
            ),
          ]}
        />
      </div>
      </FilterBar>

      {list.items.length === 0 ? (
        <ListEmptyState
          title={filtered ? "Nothing matches those filters" : "No Training Session records yet"}
          description={
            filtered
              ? "Try a wider year, or clear the filters to see the records available to you."
              : mayManage
                ? "Create a record with a title, plan year, Programme Area and Programme Field. Add the date and location when known."
                : "Training Session records appear here after an administrator or facilitator files and publishes them."
          }
          actionText={filtered ? "Clear filters" : mayManage ? "New training" : undefined}
          actionHref={filtered ? "/trainings" : mayManage ? "/trainings/new" : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {list.items.map((training) => {
            const place = [training.facilityName ?? training.venue, training.subDistrictName, training.districtName, training.regionName]
              .filter(Boolean)
              .join(" · ");
            const dates =
              training.endsOn && training.endsOn !== training.startsOn
                ? `${formatDate(training.startsOn)} – ${formatDate(training.endsOn)}`
                : formatDate(training.startsOn);

            return (
              <li
                key={training.id}
                className="group relative rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-within:border-primary/60"
              >
                {/*
                 * One link per row, laid over the whole card and *above* the text:
                 * a row where only the title responded was a target the size of a
                 * sentence. The title keeps its own emphasis but is not a link.
                 */}
                <Link
                  href={`/trainings/${training.id}`}
                  aria-label={`Open ${training.title}`}
                  className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Programme Area: {training.fieldName ?? "Not recorded"}
                      {training.areaName ? ` · Programme Field: ${training.areaName}` : ""}
                    </p>
                    <h2 className="text-base font-bold text-ink transition-colors group-hover:text-primary">{training.title}</h2>
                    {training.targetGroup && <p className="text-sm text-ink-muted">For {training.targetGroup}</p>}
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {dates}
                        {training.durationText ? ` · ${training.durationText}` : ""}
                      </span>
                      {place && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {place}
                        </span>
                      )}
                      {training.attendeeCount !== null && training.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {training.attendeeCount.toLocaleString("en-GB")} attendees recorded
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="outline">{training.year}</Badge>
                    <Badge variant={STATUS_BADGE[training.status]}>{TRAINING_STATUS_LABELS[training.status]}</Badge>
                    {training.reviewState !== "PUBLISHED" && (
                      <Badge variant={REVIEW_BADGE[training.reviewState].variant}>
                        {REVIEW_BADGE[training.reviewState].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {list.pageCount > 1 && (
        <nav aria-label="Training pages" className="flex items-center justify-between gap-3">
          {list.page > 1 ? (
            <Link href={pageHref(query, list.page - 1)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className="text-xs text-ink-muted">
            Page {list.page} of {list.pageCount}
          </p>
          {list.page < list.pageCount ? (
            <Link href={pageHref(query, list.page + 1)} className={buttonClass({ variant: "secondary", size: "sm" })}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
