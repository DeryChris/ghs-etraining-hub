import Link from "next/link";
import { Building2, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { Stat } from "@/components/ui/stat";
import { LIVE_REGION, isLiveRegion } from "@/lib/ghs-constants";
import {
  createDistrictAction,
  createFacilityAction,
  createRegionAction,
  createSubDistrictAction,
  deleteDistrictAction,
  deleteFacilityAction,
  deleteRegionAction,
  deleteSubDistrictAction,
  setFacilityActiveAction,
  updateDistrictAction,
  updateFacilityAction,
  updateRegionAction,
} from "@/lib/server/actions/geography";
import {
  DISTRICT_KINDS,
  DISTRICT_KIND_LABELS,
  FACILITY_OWNERSHIPS,
  FACILITY_OWNERSHIP_LABELS,
  FACILITY_TYPES,
  FACILITY_TYPE_LABELS,
} from "@/lib/labels";
import { requireRole } from "@/lib/server/rbac";
import { getReferenceTotals, listGeography } from "@/lib/server/taxonomy-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Geography and facilities" };

function first(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default async function GeographyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["SYSTEM_ADMIN"]);

  const query = await searchParams;
  const notice = first(query.notice);
  const error = first(query.error);
  const regionId = first(query.region);
  const districtId = first(query.district);

  const loaded = await withDeadline("geography", () => mapLimit([listGeography, getReferenceTotals]));
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Geography did not load"
        description="The regions, districts and facilities could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [geography, totals] = loaded.data;

  const region = geography.find((row) => row.id === regionId) ?? null;
  const district = region?.districts.find((row) => row.id === districtId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Geography and facilities"
        description="The places a training can be held: region → district → sub-district → facility. Everything a training form offers comes from here, so a district is spelled one way and a facility belongs to the right district."
      />

      <Notice notice={notice} error={error} />

      <section
        aria-label="Geography totals"
        className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat value={totals.regions} label="Regions" />
        <Stat value={totals.districts} label="Districts" />
        <Stat value={totals.subDistricts} label="Sub-districts" />
        <Stat value={totals.facilities} label="Facilities" />
      </section>

      <section aria-labelledby="regions-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="regions-heading" className="text-lg font-bold text-ink">
              Regions
            </h2>
            <p className="text-sm text-ink-muted">Choose a region to work on its districts and facilities.</p>
          </div>
          <details className="rounded-card border border-hairline bg-surface px-4 py-2 shadow-panel">
            <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink">
              <Plus className="h-3.5 w-3.5 text-primary" aria-hidden />
              Add a region
            </summary>
            <form action={createRegionAction} className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="new-region-name" className={labelClass}>
                  Name <span className="text-danger">*</span>
                </label>
                <input id="new-region-name" name="name" required minLength={2} maxLength={120} className={inputClass} />
              </div>
              <div>
                <label htmlFor="new-region-code" className={labelClass}>
                  Code
                </label>
                <input
                  id="new-region-code"
                  name="code"
                  maxLength={8}
                  placeholder="Generated"
                  className={`${inputClass} w-28`}
                />
              </div>
              <button type="submit" className={buttonClass()}>
                Add region
              </button>
            </form>
          </details>
        </div>

        <ul className="flex flex-wrap gap-2">
          {geography.map((row) => {
            const live = isLiveRegion(row.code, row.name);
            if (!live) {
              return (
                <li key={row.id}>
                  <span
                    title={`${row.name} Region — coming soon`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-control border border-dashed border-hairline bg-surface-2/60 px-3 text-sm font-semibold text-ink-muted"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {row.name}
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                      Coming soon
                    </span>
                  </span>
                </li>
              );
            }
            const active = row.id === regionId;
            return (
              <li key={row.id}>
                <Link
                  href={`/geography?region=${row.id}`}
                  aria-current={active ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-ink"
                      : "border-primary/40 bg-surface text-ink hover:border-primary"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {row.name}
                  <span className={`text-xs ${active ? "text-primary-ink/80" : "text-ink-muted"}`}>
                    {row.districts.length}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-ink-muted">
          The library is live in {LIVE_REGION.name} only. The other fifteen regions are seeded and
          read-only here until they are switched on — districts and facilities for a region are added
          when it goes live, so nothing has to be thrown away later.
        </p>
      </section>

      {region && !isLiveRegion(region.code, region.name) ? (
        <section className="rounded-card border border-dashed border-hairline bg-surface-2/60 p-6 text-center">
          <h2 className="text-lg font-bold text-ink">{region.name} Region is coming soon</h2>
          <p className="mx-auto mt-2 max-w-prose text-sm text-ink-muted">
            {LIVE_REGION.name} is the pilot region, so its districts and facilities are the ones that can
            be edited today. {region.name} is already seeded — choose {LIVE_REGION.name} above to work on
            the live geography.
          </p>
        </section>
      ) : !region ? (
        <ListEmptyState
          title={geography.length === 0 ? "No regions recorded" : "Choose a region"}
          description={
            geography.length === 0
              ? "Add the first region above. The seeder loads all sixteen, with Upper West's districts and facilities."
              : "Pick a region above to see and edit its districts, sub-districts and facilities."
          }
          art="folder"
        />
      ) : (
        <section aria-labelledby="region-heading" className="space-y-5 rounded-card border border-hairline bg-surface p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold tracking-wide text-ink-muted">{region.code}</p>
              <h2 id="region-heading" className="mt-1 text-lg font-bold text-ink">
                {region.name} Region
              </h2>
              <p className="text-sm text-ink-muted">
                {region.districts.length} district{region.districts.length === 1 ? "" : "s"} ·{" "}
                {region.districts.reduce((total, row) => total + row.subDistricts.length, 0)} sub-districts ·{" "}
                {region.districts.reduce((total, row) => total + row.facilities.length, 0)} facilities
              </p>
            </div>
            <form action={deleteRegionAction}>
              <input type="hidden" name="id" value={region.id} />
              <button type="submit" className={buttonClass({ variant: "danger", size: "sm" })}>
                Delete region
              </button>
            </form>
          </div>

          <details className="border-t border-hairline pt-3">
            <summary className="flex min-h-9 cursor-pointer items-center text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Edit region name and code
            </summary>
            <form action={updateRegionAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={region.id} />
              <div>
                <label htmlFor="region-name" className={labelClass}>
                  Name
                </label>
                <input
                  id="region-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={region.name}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="region-code" className={labelClass}>
                  Code
                </label>
                <input
                  id="region-code"
                  name="code"
                  maxLength={8}
                  defaultValue={region.code}
                  className={`${inputClass} w-28`}
                />
              </div>
              <button type="submit" className={buttonClass({ variant: "secondary" })}>
                Save region
              </button>
            </form>
          </details>

          <div className="border-t border-hairline pt-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              Districts
            </h3>

            <details className="mt-2">
              <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-hairline px-3 text-xs font-semibold text-ink-muted">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add a district
              </summary>
              <form action={createDistrictAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_170px_1fr_auto] md:items-end">
                <input type="hidden" name="regionId" value={region.id} />
                <div>
                  <label htmlFor="new-district-name" className={labelClass}>
                    Name <span className="text-danger">*</span>
                  </label>
                  <input id="new-district-name" name="name" required minLength={2} maxLength={120} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="new-district-kind" className={labelClass}>
                    Kind
                  </label>
                  <select id="new-district-kind" name="kind" defaultValue="DISTRICT" className={inputClass}>
                    {DISTRICT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {DISTRICT_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-district-capital" className={labelClass}>
                    Capital
                  </label>
                  <input id="new-district-capital" name="capital" maxLength={120} className={inputClass} />
                </div>
                <button type="submit" className={buttonClass()}>
                  Add district
                </button>
              </form>
            </details>

            {region.districts.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No districts recorded for {region.name} yet. Add the first one above — a training can still be
                filed at region level until you do.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {region.districts.map((row) => {
                  const active = row.id === districtId;
                  return (
                    <li
                      key={row.id}
                      className={`rounded-control border px-3 py-2 ${
                        active ? "border-primary/50 bg-primary/5" : "border-hairline bg-surface-2/40"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                            {row.name}
                            <Badge variant="outline">{DISTRICT_KIND_LABELS[row.kind]}</Badge>
                          </p>
                          <p className="text-xs text-ink-muted">
                            {row.capital ? `Capital: ${row.capital} · ` : ""}
                            {row.subDistricts.length} sub-district{row.subDistricts.length === 1 ? "" : "s"} ·{" "}
                            {row.facilities.length} facilit{row.facilities.length === 1 ? "y" : "ies"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Link
                            href={`/geography?region=${region.id}&district=${row.id}`}
                            className={buttonClass({ variant: active ? "primary" : "secondary", size: "sm" })}
                          >
                            Open
                          </Link>
                          <form action={deleteDistrictAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="regionId" value={region.id} />
                            <button type="submit" className={buttonClass({ variant: "danger", size: "sm" })}>
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>

                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Edit</summary>
                        <form action={updateDistrictAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_150px_1fr_auto] sm:items-end">
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="regionId" value={region.id} />
                          <div>
                            <label htmlFor={`district-name-${row.id}`} className={labelClass}>
                              Name
                            </label>
                            <input
                              id={`district-name-${row.id}`}
                              name="name"
                              required
                              minLength={2}
                              maxLength={120}
                              defaultValue={row.name}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor={`district-kind-${row.id}`} className={labelClass}>
                              Kind
                            </label>
                            <select
                              id={`district-kind-${row.id}`}
                              name="kind"
                              defaultValue={row.kind}
                              className={inputClass}
                            >
                              {DISTRICT_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {DISTRICT_KIND_LABELS[kind]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`district-capital-${row.id}`} className={labelClass}>
                              Capital
                            </label>
                            <input
                              id={`district-capital-${row.id}`}
                              name="capital"
                              maxLength={120}
                              defaultValue={row.capital ?? ""}
                              className={inputClass}
                            />
                          </div>
                          <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                            Save
                          </button>
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {district && (
            <div className="space-y-5 border-t border-hairline pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{district.name}</h3>
                <p className="text-xs text-ink-muted">
                  Sub-districts and facilities below belong to this district only.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Sub-districts</h4>
                <details className="mt-2">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-hairline px-3 text-xs font-semibold text-ink-muted">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add a sub-district
                  </summary>
                  <form action={createSubDistrictAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="districtId" value={district.id} />
                    <input type="hidden" name="regionId" value={region.id} />
                    <div>
                      <label htmlFor="new-subdistrict-name" className={labelClass}>
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="new-subdistrict-name"
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        className={inputClass}
                      />
                    </div>
                    <button type="submit" className={buttonClass()}>
                      Add sub-district
                    </button>
                  </form>
                </details>

                {district.subDistricts.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">None recorded. They are optional on a training.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {district.subDistricts.map((sub) => (
                      <li
                        key={sub.id}
                        className="inline-flex items-center gap-2 rounded-control border border-hairline bg-surface-2/40 px-3 py-1.5"
                      >
                        <span className="text-sm text-ink">{sub.name}</span>
                        <form action={deleteSubDistrictAction}>
                          <input type="hidden" name="id" value={sub.id} />
                          <input type="hidden" name="districtId" value={district.id} />
                          <input type="hidden" name="regionId" value={region.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-danger hover:underline"
                            aria-label={`Delete ${sub.name}`}
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Facilities</h4>
                <details className="mt-2">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-hairline px-3 text-xs font-semibold text-ink-muted">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add a facility
                  </summary>
                  <form
                    action={createFacilityAction}
                    className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_150px_170px_auto] md:items-end"
                  >
                    <input type="hidden" name="districtId" value={district.id} />
                    <input type="hidden" name="regionId" value={region.id} />
                    <div>
                      <label htmlFor="new-facility-name" className={labelClass}>
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="new-facility-name"
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="new-facility-type" className={labelClass}>
                        Type
                      </label>
                      <select id="new-facility-type" name="type" defaultValue="HEALTH_CENTRE" className={inputClass}>
                        {FACILITY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {FACILITY_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="new-facility-ownership" className={labelClass}>
                        Ownership
                      </label>
                      <select id="new-facility-ownership" name="ownership" defaultValue="GHS" className={inputClass}>
                        {FACILITY_OWNERSHIPS.map((ownership) => (
                          <option key={ownership} value={ownership}>
                            {FACILITY_OWNERSHIP_LABELS[ownership]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="new-facility-subdistrict" className={labelClass}>
                        Sub-district
                      </label>
                      <select id="new-facility-subdistrict" name="subDistrictId" defaultValue="" className={inputClass}>
                        <option value="">— optional —</option>
                        {district.subDistricts.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className={buttonClass()}>
                      Add facility
                    </button>
                  </form>
                </details>

                {district.facilities.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">
                    No facilities recorded for {district.name}. A training can still name a venue in words.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {district.facilities.map((facility) => (
                      <li key={facility.id} className="rounded-control border border-hairline bg-surface-2/40 px-3 py-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                              {facility.name}
                              {!facility.isActive && <Badge variant="warn">Inactive</Badge>}
                            </p>
                            <p className="text-xs text-ink-muted">
                              {FACILITY_TYPE_LABELS[facility.type]} · {FACILITY_OWNERSHIP_LABELS[facility.ownership]}
                              {facility.subDistrictId
                                ? ` · ${district.subDistricts.find((sub) => sub.id === facility.subDistrictId)?.name ?? "sub-district"}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <form action={setFacilityActiveAction}>
                              <input type="hidden" name="id" value={facility.id} />
                              <input type="hidden" name="regionId" value={region.id} />
                              <input type="hidden" name="districtId" value={district.id} />
                              <input type="hidden" name="isActive" value={facility.isActive ? "false" : "true"} />
                              <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                                {facility.isActive ? "Deactivate" : "Reactivate"}
                              </button>
                            </form>
                            <form action={deleteFacilityAction}>
                              <input type="hidden" name="id" value={facility.id} />
                              <input type="hidden" name="regionId" value={region.id} />
                              <input type="hidden" name="districtId" value={district.id} />
                              <button type="submit" className={buttonClass({ variant: "danger", size: "sm" })}>
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>

                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Edit</summary>
                          <form
                            action={updateFacilityAction}
                            className="mt-2 grid gap-2 sm:grid-cols-[1fr_160px_140px_160px_auto] sm:items-end"
                          >
                            <input type="hidden" name="id" value={facility.id} />
                            <input type="hidden" name="districtId" value={district.id} />
                            <input type="hidden" name="regionId" value={region.id} />
                            <div>
                              <label htmlFor={`facility-name-${facility.id}`} className={labelClass}>
                                Name
                              </label>
                              <input
                                id={`facility-name-${facility.id}`}
                                name="name"
                                required
                                minLength={2}
                                maxLength={120}
                                defaultValue={facility.name}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label htmlFor={`facility-type-${facility.id}`} className={labelClass}>
                                Type
                              </label>
                              <select
                                id={`facility-type-${facility.id}`}
                                name="type"
                                defaultValue={facility.type}
                                className={inputClass}
                              >
                                {FACILITY_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {FACILITY_TYPE_LABELS[type]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`facility-ownership-${facility.id}`} className={labelClass}>
                                Ownership
                              </label>
                              <select
                                id={`facility-ownership-${facility.id}`}
                                name="ownership"
                                defaultValue={facility.ownership}
                                className={inputClass}
                              >
                                {FACILITY_OWNERSHIPS.map((ownership) => (
                                  <option key={ownership} value={ownership}>
                                    {FACILITY_OWNERSHIP_LABELS[ownership]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`facility-subdistrict-${facility.id}`} className={labelClass}>
                                Sub-district
                              </label>
                              <select
                                id={`facility-subdistrict-${facility.id}`}
                                name="subDistrictId"
                                defaultValue={facility.subDistrictId ?? ""}
                                className={inputClass}
                              >
                                <option value="">— none —</option>
                                {district.subDistricts.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input type="hidden" name="isActive" value={String(facility.isActive)} />
                            <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
                              Save
                            </button>
                          </form>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {!district && region.districts.length > 0 && (
            <p className={hintClass}>
              Open a district to manage its sub-districts and facilities. Deleting a region or district is refused
              while something still belongs to it.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
