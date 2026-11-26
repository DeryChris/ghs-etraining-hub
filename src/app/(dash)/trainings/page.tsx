import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { inputClass, labelClass } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { NewTrainingDialog } from "@/components/trainings/new-training-dialog";
import { FieldTileIcon } from "@/components/ui/field-tile-icon";
import { Stat } from "@/components/ui/stat";
import { formatDate } from "@/lib/format";
import { TRAINING_STATUSES, TRAINING_STATUS_LABELS, isTrainingStatus } from "@/lib/labels";
import { can } from "@/lib/rbac/capabilities";
import { fieldHref } from "@/lib/links";
import { listFields } from "@/lib/server/learning-queries";
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

/** Chips above the register: the review queue is one click, not a filter hunt. */
const REVIEW_CHIPS = [
  { key: "", label: "Everything" },
  { key: "PENDING", label: "Pending review" },
  { key: "PUBLISHED", label: "Live" },
  { key: "REJECTED", label: "Sent back" },
] as const;

const REVIEW_BADGE = {
  PENDING: { label: "Pending review", variant: "outline" },
  PUBLISHED: { label: "Live", variant: "success" },
  REJECTED: { label: "Sent back", variant: "danger" },
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
      getTrainingSummary,
      getTrainingFilterOptions,
      listProgrammeFieldOptions,
      listGeography,
      () => listFields(session),
    ]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The training register did not load"
        description="The register and the programme catalogue could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [list, summary, options, fields, geography, catalogue] = loaded.data;

  const filtered =
    query.q.length > 0 ||
    query.year !== null ||
    query.field !== null ||
    query.area !== null ||
    query.region !== null ||
    query.district !== null ||
    query.status !== null;

  const firstOnPage = list.total === 0 ? 0 : (list.page - 1) * TRAININGS_PAGE_SIZE + 1;
  const lastOnPage = (list.page - 1) * TRAININGS_PAGE_SIZE + list.items.length;
  const mayManage = can(session.role, "training.manage");
  const notice = single("notice");
  const error = single("error");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Training register"
        title="Trainings"
        description="Every training GHS has planned or run: what it covers, who it was for, and where it happened. Filed under a programme field and the area inside it, so coverage can be counted by programme rather than by memory."
        actions={
          mayManage ? (
            <NewTrainingDialog
              fields={fields}
              geography={geography}
              label="Create new training"
            />
          ) : undefined
        }
      />

      <Notice notice={notice} error={error} />

      {/* The programme catalogue, on the same screen as the register it files into. */}
      <section id="catalogue" aria-labelledby="catalogue-heading" className="space-y-4 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="catalogue-heading" className="text-lg font-bold text-ink">
              Programme catalogue
            </h2>
            <p className="text-sm text-ink-muted">
              Every programme field GHS trains in, with the areas inside it. Pick one to see its materials and the
              trainings recorded against it.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {catalogue.length} {catalogue.length === 1 ? "programme field" : "programme fields"}
          </span>
        </div>

        {catalogue.length === 0 ? (
          <ListEmptyState
            title="The programme taxonomy is empty"
            description="An administrator maintains the fields and areas at Programme fields. They appear here as soon as they are published."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalogue.map((field) => (
              <li key={field.id}>
                <div className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <FieldTileIcon code={field.code} size={52} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
                    <span className="font-mono text-xs font-semibold tracking-wide text-ink-muted">{field.code}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
                    {/* Filters the register in place — the catalogue is part of
                        this screen, not a page you leave to reach. */}
                    <Link
                      href={`/trainings?field=${field.id}#register`}
                      className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {field.name}
                    </Link>
                  </h3>
                  {field.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{field.description}</p>}
                  <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs font-semibold text-ink-muted">
                    <span>
                      {field.areaCount} {field.areaCount === 1 ? "programme area" : "programme areas"} · {field.materialCount}{" "}
                      {field.materialCount === 1 ? "material" : "materials"}
                    </span>
                    <Link
                      href={fieldHref(field.code)}
                      className="text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Areas &amp; materials
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>


      <section
        id="register"
        aria-label="Register totals"
        className="scroll-mt-24 grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat value={summary.total} label="Trainings on the register" />
        <Stat value={summary.planned} label="Planned or upcoming" />
        <Stat value={summary.thisYear} label={`Filed under ${new Date().getFullYear()}`} />
        <Stat value={summary.attendees.toLocaleString("en-GB")} label="People trained (recorded)" />
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

      <form
        action="/trainings"
        method="get"
        role="search"
        aria-label="Filter trainings"
        className="grid gap-3 rounded-card border border-hairline bg-surface p-4 shadow-panel md:grid-cols-2 xl:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label htmlFor="training-q" className={labelClass}>
            Search
          </label>
          <input
            id="training-q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="Title, target group or venue"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="filter-year" className={labelClass}>
            Year
          </label>
          <select id="filter-year" name="year" defaultValue={query.year ? String(query.year) : ""} className={inputClass}>
            <option value="">All years</option>
            {options.years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-status" className={labelClass}>
            Status
          </label>
          <select id="filter-status" name="status" defaultValue={query.status ?? ""} className={inputClass}>
            <option value="">Any status</option>
            {TRAINING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TRAINING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-field" className={labelClass}>
            Programme field
          </label>
          <select id="filter-field" name="field" defaultValue={query.field ?? ""} className={inputClass}>
            <option value="">All fields</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-area" className={labelClass}>
            Programme area
          </label>
          <select id="filter-area" name="area" defaultValue={query.area ?? ""} className={inputClass}>
            <option value="">All areas</option>
            {fields.map((field) => (
              <optgroup key={field.id} label={field.name}>
                {field.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-region" className={labelClass}>
            Region
          </label>
          <select id="filter-region" name="region" defaultValue={query.region ?? ""} className={inputClass}>
            <option value="">All regions</option>
            {options.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-district" className={labelClass}>
            District
          </label>
          <select id="filter-district" name="district" defaultValue={query.district ?? ""} className={inputClass}>
            <option value="">All districts</option>
            {options.regions.map((region) => {
              const districts = options.districts.filter((district) => district.regionId === region.id);
              if (districts.length === 0) return null;
              return (
                <optgroup key={region.id} label={region.name}>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2 md:col-span-2 xl:col-span-4">
          <button type="submit" className={buttonClass({ variant: "secondary" })}>
            Apply filters
          </button>
          {filtered && (
            <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
              Clear
            </Link>
          )}
          <p className="ml-auto text-xs text-ink-muted" aria-live="polite">
            {list.total === 0
              ? "No matches"
              : `Showing ${firstOnPage}–${lastOnPage} of ${list.total} training${list.total === 1 ? "" : "s"}`}
          </p>
        </div>
      </form>

      {list.items.length === 0 ? (
        <ListEmptyState
          title={filtered ? "Nothing matches those filters" : "The register is empty"}
          description={
            filtered
              ? "Try a wider year, or clear the filters to see every training on the register."
              : mayManage
                ? "Create the first training: the programme field and its area are the only things that must be right on day one."
                : "Trainings appear here once the ICT team files them. Check back after the next planning cycle."
          }
          actionText={filtered ? "Clear filters" : mayManage ? "New training" : undefined}
          actionHref={filtered ? "/trainings" : mayManage ? "/trainings/new" : undefined}
          art="folder"
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
              <li key={training.id} className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      {training.fieldName ?? "Programme field not recorded"}
                      {training.areaName ? ` · ${training.areaName}` : ""}
                    </p>
                    <h2 className="text-base font-bold text-ink">
                      <Link href={`/trainings/${training.id}`} className="hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        {training.title}
                      </Link>
                    </h2>
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
                      {training.attendeeCount !== null && (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {training.attendeeCount.toLocaleString("en-GB")} trained
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
