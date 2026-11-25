import { ChevronRight, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/empty-state";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { Stat } from "@/components/ui/stat";
import {
  assignAreaFacilitatorAction,
  createProgrammeAreaAction,
  createProgrammeFieldAction,
  deleteProgrammeAreaAction,
  deleteProgrammeFieldAction,
  setProgrammeAreaArchivedAction,
  setProgrammeFieldArchivedAction,
  unassignAreaFacilitatorAction,
  updateProgrammeAreaAction,
  updateProgrammeFieldAction,
} from "@/lib/server/actions/taxonomy";
import { requireRole } from "@/lib/server/rbac";
import {
  getReferenceTotals,
  listAssignableFacilitators,
  listProgrammeTaxonomy,
} from "@/lib/server/taxonomy-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Programme fields" };

function first(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default async function ProgrammeFieldsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["SYSTEM_ADMIN"]);

  const query = await searchParams;
  const notice = first(query.notice);
  const error = first(query.error);
  const focusField = first(query.field);

  const loaded = await withDeadline("programme-fields", () =>
    mapLimit([listProgrammeTaxonomy, getReferenceTotals, listAssignableFacilitators]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Programme fields did not load"
        description="The programme taxonomy could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [fields, totals, assignable] = loaded.data;
  const classified = fields.reduce(
    (total, field) => total + field.trainingCount,
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Programme fields"
        description="The vocabulary every training plan is written in: a programme field (Administration and Support Services) and the areas inside it (Biomedical Equipment). GHS supplied the first list; this page is where it is corrected. Fields and areas are archived rather than deleted once a training refers to them."
      />

      <Notice notice={notice} error={error} />

      <section
        aria-label="Taxonomy totals"
        className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat value={totals.fields} label="Programme fields" />
        <Stat value={totals.areas} label="Programme areas" />
        <Stat value={classified} label="Trainings classified" />
        <Stat
          value={fields.filter((field) => field.isArchived).length}
          label="Archived fields"
        />
      </section>

      <details className="rounded-card border border-hairline bg-surface shadow-panel">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-5 text-sm font-semibold text-ink">
          <Plus className="h-4 w-4 text-primary" aria-hidden />
          Add a programme field
        </summary>
        <form
          action={createProgrammeFieldAction}
          className="grid gap-3 border-t border-hairline p-5 md:grid-cols-[1fr_180px_1fr_auto] md:items-end"
        >
          <div>
            <label htmlFor="new-field-name" className={labelClass}>
              Name <span className="text-danger">*</span>
            </label>
            <input
              id="new-field-name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-field-code" className={labelClass}>
              Code
            </label>
            <input
              id="new-field-code"
              name="code"
              maxLength={24}
              placeholder="Generated"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-field-description" className={labelClass}>
              Description
            </label>
            <input
              id="new-field-description"
              name="description"
              maxLength={280}
              className={inputClass}
            />
          </div>
          <button type="submit" className={buttonClass()}>
            Add field
          </button>
        </form>
      </details>

      {fields.length === 0 ? (
        <ListEmptyState
          title="No programme fields yet"
          description="Add the first field above, or run the seeder to load the ten fields and forty-one areas GHS supplied."
          art="folder"
        />
      ) : (
        <ul className="space-y-4">
          {fields.map((field) => (
            <li key={field.id}>
              <article
                id={`field-${field.id}`}
                className={`rounded-card border bg-surface shadow-panel ${
                  focusField === field.id
                    ? "border-primary/50"
                    : "border-hairline"
                }`}
              >
                <header className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold tracking-wide text-ink-muted">
                      {field.code}
                    </p>
                    <h2 className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-ink">
                      {field.name}
                      {field.isArchived && (
                        <Badge variant="warn">Archived</Badge>
                      )}
                    </h2>
                    {field.description && (
                      <p className="mt-1 text-sm text-ink-muted">
                        {field.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-muted">
                      {field.areaCount} programme area
                      {field.areaCount === 1 ? "" : "s"} · {field.trainingCount}{" "}
                      training{field.trainingCount === 1 ? "" : "s"} filed here
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <form action={setProgrammeFieldArchivedAction}>
                      <input type="hidden" name="id" value={field.id} />
                      <input
                        type="hidden"
                        name="archived"
                        value={field.isArchived ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={buttonClass({
                          variant: "secondary",
                          size: "sm",
                        })}
                      >
                        {field.isArchived ? "Restore" : "Archive"}
                      </button>
                    </form>
                    <form action={deleteProgrammeFieldAction}>
                      <input type="hidden" name="id" value={field.id} />
                      <button
                        type="submit"
                        className={buttonClass({
                          variant: "danger",
                          size: "sm",
                        })}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </header>

                <details className="border-t border-hairline px-5 py-3">
                  <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    Edit this field
                  </summary>
                  <form
                    action={updateProgrammeFieldAction}
                    className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                  >
                    <input type="hidden" name="id" value={field.id} />
                    <div>
                      <label
                        htmlFor={`field-name-${field.id}`}
                        className={labelClass}
                      >
                        Name
                      </label>
                      <input
                        id={`field-name-${field.id}`}
                        name="name"
                        required
                        minLength={2}
                        maxLength={120}
                        defaultValue={field.name}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`field-description-${field.id}`}
                        className={labelClass}
                      >
                        Description
                      </label>
                      <input
                        id={`field-description-${field.id}`}
                        name="description"
                        maxLength={280}
                        defaultValue={field.description ?? ""}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      className={buttonClass({ variant: "secondary" })}
                    >
                      Save field
                    </button>
                  </form>
                  <p className={hintClass}>
                    The code <span className="font-mono">{field.code}</span> is
                    stable and cannot be edited: it appears in exports and in
                    the seeder&apos;s natural key.
                  </p>
                </details>

                <div className="border-t border-hairline p-5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <Layers className="h-3.5 w-3.5" aria-hidden />
                    Programme areas
                  </h3>

                  {field.areas.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">
                      No areas in this field yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {field.areas.map((area) => (
                        <li
                          key={area.id}
                          className="rounded-control border border-hairline bg-surface-2/40 px-3 py-2"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                                {area.name}
                                {area.isArchived && (
                                  <Badge variant="warn">Archived</Badge>
                                )}
                              </p>
                              <p className="text-xs text-ink-muted">
                                <span className="font-mono">{area.code}</span> ·{" "}
                                {area.trainingCount} training
                                {area.trainingCount === 1 ? "" : "s"} ·{" "}
                                {area.materialCount} material
                                {area.materialCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <details>
                                <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-control border border-hairline px-3 text-xs font-semibold text-ink">
                                  Edit
                                </summary>
                                <form
                                  action={updateProgrammeAreaAction}
                                  className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                                >
                                  <input
                                    type="hidden"
                                    name="id"
                                    value={area.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="fieldId"
                                    value={field.id}
                                  />
                                  <div>
                                    <label
                                      htmlFor={`area-name-${area.id}`}
                                      className={labelClass}
                                    >
                                      Name
                                    </label>
                                    <input
                                      id={`area-name-${area.id}`}
                                      name="name"
                                      required
                                      minLength={2}
                                      maxLength={120}
                                      defaultValue={area.name}
                                      className={inputClass}
                                    />
                                  </div>
                                  <div>
                                    <label
                                      htmlFor={`area-description-${area.id}`}
                                      className={labelClass}
                                    >
                                      Description
                                    </label>
                                    <input
                                      id={`area-description-${area.id}`}
                                      name="description"
                                      maxLength={280}
                                      defaultValue={area.description ?? ""}
                                      className={inputClass}
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    className={buttonClass({
                                      variant: "secondary",
                                      size: "sm",
                                    })}
                                  >
                                    Save area
                                  </button>
                                </form>
                              </details>
                              <details>
                                <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-control border border-hairline px-3 text-xs font-semibold text-ink">
                                  People ({area.facilitators.length})
                                </summary>
                                <div className="mt-2 w-full min-w-56 space-y-2">
                                  {area.facilitators.length > 0 && (
                                    <ul className="space-y-1">
                                      {area.facilitators.map((person) => (
                                        <li
                                          key={person.id}
                                          className="flex items-center justify-between gap-2 text-xs"
                                        >
                                          <span className="min-w-0 truncate text-ink">
                                            {person.fullName}{" "}
                                            <span className="font-mono text-ink-muted">
                                              {person.staffId}
                                            </span>
                                          </span>
                                          <form
                                            action={
                                              unassignAreaFacilitatorAction
                                            }
                                          >
                                            <input
                                              type="hidden"
                                              name="id"
                                              value={person.id}
                                            />
                                            <input
                                              type="hidden"
                                              name="fieldId"
                                              value={field.id}
                                            />
                                            <button
                                              type="submit"
                                              className="rounded px-1.5 py-0.5 text-xs font-semibold text-danger"
                                            >
                                              Remove
                                            </button>
                                          </form>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <form
                                    action={assignAreaFacilitatorAction}
                                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                                  >
                                    <input
                                      type="hidden"
                                      name="areaId"
                                      value={area.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="fieldId"
                                      value={field.id}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <label
                                        htmlFor={`area-person-${area.id}`}
                                        className={labelClass}
                                      >
                                        Give someone this area
                                      </label>
                                      <select
                                        id={`area-person-${area.id}`}
                                        name="userId"
                                        required
                                        className={inputClass}
                                      >
                                        <option value="">
                                          Choose a person…
                                        </option>
                                        {assignable.map((person) => (
                                          <option
                                            key={person.id}
                                            value={person.id}
                                          >
                                            {person.fullName} · {person.staffId}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      type="submit"
                                      className={buttonClass({
                                        variant: "secondary",
                                        size: "sm",
                                      })}
                                    >
                                      Assign
                                    </button>
                                  </form>
                                  <p className={hintClass}>
                                    Assigned people can author material and run
                                    trainings in this area only.
                                  </p>
                                </div>
                              </details>
                              <form action={setProgrammeAreaArchivedAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={area.id}
                                />
                                <input
                                  type="hidden"
                                  name="fieldId"
                                  value={field.id}
                                />
                                <input
                                  type="hidden"
                                  name="archived"
                                  value={area.isArchived ? "false" : "true"}
                                />
                                <button
                                  type="submit"
                                  className={buttonClass({
                                    variant: "secondary",
                                    size: "sm",
                                  })}
                                >
                                  {area.isArchived ? "Restore" : "Archive"}
                                </button>
                              </form>
                              <form action={deleteProgrammeAreaAction}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={area.id}
                                />
                                <input
                                  type="hidden"
                                  name="fieldId"
                                  value={field.id}
                                />
                                <button
                                  type="submit"
                                  className={buttonClass({
                                    variant: "danger",
                                    size: "sm",
                                  })}
                                >
                                  Delete
                                </button>
                              </form>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <details className="mt-3">
                    <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-hairline px-3 text-xs font-semibold text-ink-muted">
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add an area to {field.name}
                    </summary>
                    <form
                      action={createProgrammeAreaAction}
                      className="mt-3 grid gap-3 md:grid-cols-[1fr_160px_1fr_auto] md:items-end"
                    >
                      <input type="hidden" name="fieldId" value={field.id} />
                      <div>
                        <label
                          htmlFor={`new-area-name-${field.id}`}
                          className={labelClass}
                        >
                          Area name <span className="text-danger">*</span>
                        </label>
                        <input
                          id={`new-area-name-${field.id}`}
                          name="name"
                          required
                          minLength={2}
                          maxLength={120}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`new-area-code-${field.id}`}
                          className={labelClass}
                        >
                          Code
                        </label>
                        <input
                          id={`new-area-code-${field.id}`}
                          name="code"
                          maxLength={24}
                          placeholder="Generated"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`new-area-description-${field.id}`}
                          className={labelClass}
                        >
                          Description
                        </label>
                        <input
                          id={`new-area-description-${field.id}`}
                          name="description"
                          maxLength={280}
                          className={inputClass}
                        />
                      </div>
                      <button
                        type="submit"
                        className={buttonClass({ variant: "secondary" })}
                      >
                        Add area
                      </button>
                    </form>
                  </details>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-muted">
        Archived fields and areas disappear from the training form but stay on
        the trainings already filed under them. Nothing here is deleted while a
        training refers to it.{" "}
        <Link
          href="/trainings"
          className="font-semibold text-primary hover:underline"
        >
          See the register
        </Link>
        .
      </p>
    </div>
  );
}
