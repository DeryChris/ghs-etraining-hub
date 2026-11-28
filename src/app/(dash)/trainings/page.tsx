import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Users,
} from "lucide-react";
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
import { formatDate } from "@/lib/format";
import { TRAINING_STATUSES, TRAINING_STATUS_LABELS, isTrainingStatus } from "@/lib/labels";
import { can } from "@/lib/rbac/capabilities";
import { requireSession } from "@/lib/server/rbac";
import { programmeGrantsFor } from "@/lib/server/programme-scope";
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
  { key: "PENDING", label: "Pending Review" },
  { key: "PUBLISHED", label: "Live/Published" },
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
  /*
   * A facilitator's register is their programme: the fields they hold, plus the
   * whole areas they were given. An administrator is unrestricted, and a learner's
   * limit is publication rather than grants — so `grants` stays undefined for both.
   */
  const grants = session.role === "FACILITATOR" ? await programmeGrantsFor(session.sub) : undefined;
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
          viewer: { userId: session.sub, seeAll: canSeeUnpublished, grants },
          page: query.page,
        }),
      () => getTrainingSummary({ userId: session.sub, seeAll: canSeeUnpublished, grants }),
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
  const mayViewInsights = session.role === "SYSTEM_ADMIN" || session.role === "FACILITATOR";
  const notice = single("notice");
  const error = single("error");

  return (
    <div className="space-y-8">
      <LiveRefresh label="trainings" />

      <PageHeader
        eyebrow="Trainings"
        title="Training Register"
        description="Find Training Session records, including plans and records marked as held. Filter by Programme Area, Programme Field, year, location, status or review state. Open a training to see the files attached to it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {mayManage ? (
              <NewTrainingDialog fields={fields} geography={geography} label="Create New Training" />
            ) : null}
            <Link href="/catalogue" className={buttonClass({ variant: "ghost" })}>
              Browse the Library
            </Link>
          </div>
        }
      />

      <Notice notice={notice} error={error} />

      <section id="training-totals" aria-label="Training overview" className="scroll-mt-24 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Training Records",
              value: summary.total,
              icon: CalendarDays,
              washTone: "bg-ghs-green/10",
              iconTone: "bg-ghs-green/10 text-ghs-green",
            },
            {
              label: "Planned",
              value: summary.planned,
              icon: CalendarClock,
              washTone: "bg-ghs-gold/20",
              iconTone: "bg-ghs-gold/35 text-ghs-green",
            },
            {
              label: "Held",
              value: summary.completed,
              icon: CalendarCheck,
              washTone: "bg-ghs-green/10",
              iconTone: "bg-ghs-green/10 text-ghs-green",
            },
            {
              label: "Awaiting Review",
              value: summary.awaitingReview,
              icon: Clock3,
              washTone: "bg-ghs-red/10",
              iconTone: "bg-ghs-red/10 text-ghs-red",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="relative isolate flex min-h-28 items-center justify-between gap-4 overflow-hidden rounded-card border border-hairline bg-surface p-4 shadow-panel transition-[transform,box-shadow] duration-fast motion-safe:hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-8 -top-10 z-0 h-28 w-28 rotate-12 rounded-[42%_58%_67%_33%/55%_41%_59%_45%] blur-2xl ${card.washTone}`}
                />
                <div className="relative z-10 min-w-0">
                  <p className="text-sm font-semibold text-ink-muted">{card.label}</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">
                    {card.value.toLocaleString("en-GB")}
                  </p>
                </div>
                <span className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-control ${card.iconTone}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </article>
            );
          })}
        </div>
        {mayViewInsights && (
          <div className="flex justify-end">
            <Link
              href="/insights"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              View detailed insights
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
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
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.items.map((training) => {
            const place = [training.facilityName ?? training.venue, training.subDistrictName, training.districtName, training.regionName]
              .filter(Boolean)
              .join(" · ");
            const dates =
              training.endsOn && training.endsOn !== training.startsOn
                ? `${formatDate(training.startsOn)} – ${formatDate(training.endsOn)}`
                : formatDate(training.startsOn);

            return (
              <li key={training.id} className="min-w-0">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-panel transition-[transform,border-color,box-shadow] duration-fast motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift motion-reduce:transition-none focus-within:border-primary/60">
                  {/* One link covers the whole tile while preserving a single accessible target. */}
                  <Link
                    href={`/trainings/${training.id}`}
                    aria-label={`Open ${training.title}`}
                    className="absolute inset-0 z-10 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  />
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-[var(--radius-pill)] bg-ghs-green px-2.5 py-1.5 text-[11px] leading-snug text-white">
                          <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white/85">
                            Programme Area
                          </span>
                          <span className="min-w-0 break-words font-semibold">{training.fieldName ?? "Not recorded"}</span>
                        </span>
                        {training.areaName && (
                          <>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                            <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-[var(--radius-pill)] border border-ghs-green/20 bg-ghs-green/10 px-2.5 py-1.5 text-[11px] leading-snug text-ghs-green">
                              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                                Programme Field
                              </span>
                              <span className="min-w-0 break-words font-semibold">{training.areaName}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-ink transition-colors group-hover:text-primary">
                        {training.title}
                      </h2>
                      {training.targetGroup && <p className="text-sm leading-relaxed text-ink-muted">For {training.targetGroup}</p>}
                    </div>

                    <div className="mt-auto space-y-2.5">
                      <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-muted">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-control bg-ghs-green/10 text-ghs-green">
                          <CalendarDays className="h-4 w-4" aria-hidden />
                        </span>
                        <span>
                          {dates}
                          {training.durationText ? ` · ${training.durationText}` : ""}
                        </span>
                      </p>
                      {place && (
                        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-muted">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-control bg-ghs-red/10 text-ghs-red">
                            <MapPin className="h-4 w-4" aria-hidden />
                          </span>
                          <span>{place}</span>
                        </p>
                      )}
                      {training.attendeeCount !== null && training.status === "COMPLETED" && (
                        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-muted">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-control bg-ghs-gold/35 text-ghs-green">
                            <Users className="h-4 w-4" aria-hidden />
                          </span>
                          <span>{training.attendeeCount.toLocaleString("en-GB")} attendees recorded</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                      <Badge variant="outline">{training.year}</Badge>
                      <Badge variant={STATUS_BADGE[training.status]}>{TRAINING_STATUS_LABELS[training.status]}</Badge>
                      {training.reviewState !== "PUBLISHED" && (
                        <Badge variant={REVIEW_BADGE[training.reviewState].variant}>
                          {REVIEW_BADGE[training.reviewState].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </article>
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
