"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { FormFeedback } from "@/components/ui/form-feedback";
import { FormSteps } from "@/components/ui/form-steps";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { TRAINING_STATUSES, TRAINING_STATUS_LABELS, type TrainingStatus } from "@/lib/labels";
import {
  createTrainingAction,
  updateTrainingAction,
  type TrainingActionState,
} from "@/lib/server/actions/trainings";
import type { GeographyRegion, ProgrammeFieldOption } from "@/lib/server/taxonomy-queries";
import { durationLabel } from "@/lib/training-dates";
import { isLiveRegion } from "@/lib/ghs-constants";

const INITIAL: TrainingActionState = { ok: false, message: null };

export interface TrainingFormValues {
  id?: string;
  title: string;
  year: string;
  programmeFieldId: string;
  programmeAreaId: string;
  targetGroup: string;
  regionId: string;
  districtId: string;
  subDistrictId: string;
  facilityId: string;
  startsOn: string;
  endsOn: string;
  durationText: string;
  venue: string;
  status: TrainingStatus;
  attendeeCount: string;
  notes: string;
}

const BLANK: TrainingFormValues = {
  title: "",
  year: String(new Date().getFullYear()),
  programmeFieldId: "",
  programmeAreaId: "",
  targetGroup: "",
  regionId: "",
  districtId: "",
  subDistrictId: "",
  facilityId: "",
  startsOn: "",
  endsOn: "",
  durationText: "",
  venue: "",
  status: "PLANNED",
  attendeeCount: "",
  notes: "",
};

/**
 * The New/Edit training form.
 *
 * Three cascades run in the browser — programme area follows programme field,
 * district follows region, and sub-district/facility follow district — so the
 * lists only ever offer combinations that exist. The Server Action re-checks
 * every one of them against the database anyway; this is for speed, not trust.
 *
 * Duration fills itself from the dates ("3 days") until somebody types in it,
 * because that is the value the reports want and retyping it invites a typo.
 */
export function TrainingForm({
  fields,
  geography,
  initial,
  mode,
}: {
  fields: ProgrammeFieldOption[];
  geography: GeographyRegion[];
  initial?: TrainingFormValues;
  mode: "create" | "update";
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createTrainingAction : updateTrainingAction,
    INITIAL,
  );

  const start = initial ?? BLANK;
  const [fieldId, setFieldId] = useState(start.programmeFieldId);
  const [areaId, setAreaId] = useState(start.programmeAreaId);
  const [regionId, setRegionId] = useState(start.regionId);
  const [districtId, setDistrictId] = useState(start.districtId);
  const [subDistrictId, setSubDistrictId] = useState(start.subDistrictId);
  const [startsOn, setStartsOn] = useState(start.startsOn);
  const [endsOn, setEndsOn] = useState(start.endsOn);
  const [durationTouched, setDurationTouched] = useState(start.durationText.length > 0);
  const [durationText, setDurationText] = useState(start.durationText);
  const [year, setYear] = useState(start.year);

  /*
   * The pilot runs in one region, so that is the only one a person can pick here.
   * A training already filed elsewhere keeps its own region in the list, otherwise
   * opening it to fix a date would silently move it to the first live region.
   */
  const regionChoices = useMemo(
    () => geography.filter((row) => isLiveRegion(row.code, row.name) || row.id === start.regionId),
    [geography, start.regionId],
  );

  const areas = useMemo(() => fields.find((field) => field.id === fieldId)?.areas ?? [], [fieldId, fields]);
  const region = useMemo(() => geography.find((row) => row.id === regionId), [geography, regionId]);
  const district = useMemo(() => region?.districts.find((row) => row.id === districtId), [region, districtId]);
  const facilities = useMemo(
    () => (district?.facilities ?? []).filter((facility) => facility.isActive),
    [district],
  );

  // A district can hold fifty units now that the whole establishment list is in
  // the database, most of them CHPS compounds. Once a sub-district is chosen its
  // own units come first and the rest of the district follows, so the list is
  // short at the top and still complete.
  const facilityGroups = useMemo(() => {
    if (!subDistrictId) return [{ key: "district", label: null as string | null, items: facilities }];
    const chosen = facilities.filter((facility) => facility.subDistrictId === subDistrictId);
    const rest = facilities.filter((facility) => facility.subDistrictId !== subDistrictId);
    const name = district?.subDistricts.find((row) => row.id === subDistrictId)?.name ?? "This sub-district";
    const groups: { key: string; label: string | null; items: typeof facilities }[] = [];
    if (chosen.length) groups.push({ key: "chosen", label: `In ${name}`, items: chosen });
    if (rest.length) groups.push({ key: "rest", label: `Elsewhere in ${district?.name ?? "the district"}`, items: rest });
    return groups.length ? groups : [{ key: "district", label: null, items: facilities }];
  }, [facilities, subDistrictId, district]);

  const suggestedDuration = durationLabel(startsOn, endsOn);

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5 rounded-card border border-hairline bg-surface p-5 shadow-panel md:p-6"
    >
      {mode === "update" && initial?.id && <input type="hidden" name="trainingId" value={initial.id} />}

      <div>
        <h2 className="text-base font-bold text-ink">
          {mode === "create" ? "New training" : "Edit training"}
        </h2>
        <p className="text-sm text-ink-muted">
          Three short steps. Title, plan year and programme field are the only things that must be there — place
          and date can be filled in later, because a plan is allowed to be provisional.
        </p>
      </div>

      <FormSteps
        steps={[
          {
            title: "The basics",
            blurb: "what it is and which programme area owns it — the only step with required fields.",
          },
          {
            title: "Where and when",
            blurb: "region, district and dates. Leave any of it blank if the plan is not fixed yet.",
          },
          {
            title: "The record",
            blurb: "status, how many people came, and the paragraph that will sit under the title.",
          },
        ]}
        panels={[
          <div key="basics" className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="training-title" className={labelClass}>
              Title of the training <span className="text-danger">*</span>
            </label>
            <input
              id="training-title"
              name="title"
              required
              minLength={4}
              maxLength={160}
              defaultValue={start.title}
              placeholder="e.g. Malaria case management refresher for district teams"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="training-year" className={labelClass}>
              Year <span className="text-danger">*</span>
            </label>
            <input
              id="training-year"
              name="year"
              required
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              onBlur={() => {
                // The plan year is the year the training starts unless it is set by hand.
                if (!year && startsOn) setYear(String(new Date(startsOn).getFullYear()));
              }}
              className={inputClass}
            />
            <p className={hintClass}>Usually the year it starts. Next year&apos;s plans are filed here too.</p>
          </div>
          <div>
            <label htmlFor="training-field" className={labelClass}>
              Programme field <span className="text-danger">*</span>
            </label>
            <select
              id="training-field"
              name="programmeFieldId"
              required
              value={fieldId}
              onChange={(event) => {
                setFieldId(event.target.value);
                setAreaId("");
              }}
              className={inputClass}
            >
              <option value="">— Select Programme field —</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-area" className={labelClass}>
              Programme area <span className="text-danger">*</span>
            </label>
            <select
              id="training-area"
              name="programmeAreaId"
              required
              value={areaId}
              disabled={!fieldId}
              onChange={(event) => setAreaId(event.target.value)}
              className={inputClass}
            >
              <option value="">{fieldId ? "— Select programme area —" : "— Select Programme field first —"}</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {fieldId && areas.length === 0 && (
              <p className={hintClass}>That field has no areas yet. Add one under Administration → Programme fields.</p>
            )}
          </div>
          <div>
            <label htmlFor="training-target" className={labelClass}>
              Target group
            </label>
            <input
              id="training-target"
              name="targetGroup"
              maxLength={160}
              defaultValue={start.targetGroup}
              placeholder="e.g. District health information officers"
              className={inputClass}
            />
          </div>
          </div>,
          <div key="place" className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="training-region" className={labelClass}>
              Region <span className="text-danger">*</span>
            </label>
            <select
              id="training-region"
              name="regionId"
              required
              value={regionId}
              onChange={(event) => {
                setRegionId(event.target.value);
                setDistrictId("");
                setSubDistrictId("");
              }}
              className={inputClass}
            >
              <option value="">— Select region —</option>
              {regionChoices.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <p className={hintClass}>
              {regionChoices.length <= 1
                ? "The library is live in Upper West only; the other regions are added as the rollout reaches them."
                : "Only regions where the library is live are listed."}
            </p>
          </div>
          <div>
            <label htmlFor="training-district" className={labelClass}>
              District
            </label>
            <select
              id="training-district"
              name="districtId"
              value={districtId}
              disabled={!regionId || (region?.districts.length ?? 0) === 0}
              onChange={(event) => {
                setDistrictId(event.target.value);
                setSubDistrictId("");
              }}
              className={inputClass}
            >
              <option value="">
                {!regionId
                  ? "— Select Region first —"
                  : (region?.districts.length ?? 0) === 0
                    ? "— no districts recorded for this region —"
                    : "— Select district —"}
              </option>
              {(region?.districts ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <p className={hintClass}>
              {regionChoices.length <= 1
                ? "The library is live in Upper West only; the other regions are added as the rollout reaches them."
                : "Only regions where the library is live are listed."}
            </p>
          </div>
          <div>
            <label htmlFor="training-subdistrict" className={labelClass}>
              Sub-district
            </label>
            <select
              id="training-subdistrict"
              name="subDistrictId"
              value={subDistrictId}
              disabled={!districtId || (district?.subDistricts.length ?? 0) === 0}
              onChange={(event) => setSubDistrictId(event.target.value)}
              className={inputClass}
            >
              <option value="">
                {!districtId
                  ? "— optional —"
                  : (district?.subDistricts.length ?? 0) === 0
                    ? "— none recorded —"
                    : "— optional —"}
              </option>
              {(district?.subDistricts ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
            <p className={hintClass}>
              {regionChoices.length <= 1
                ? "The library is live in Upper West only; the other regions are added as the rollout reaches them."
                : "Only regions where the library is live are listed."}
            </p>
          </div>
          <div>
            <label htmlFor="training-facility" className={labelClass}>
              Facility (venue)
            </label>
            <select
              id="training-facility"
              name="facilityId"
              defaultValue={start.facilityId}
              disabled={!districtId || facilities.length === 0}
              className={inputClass}
            >
              <option value="">
                {!districtId ? "— optional —" : facilities.length === 0 ? "— none recorded —" : "— optional —"}
              </option>
              {facilityGroups.map((group) =>
                group.label === null ? (
                  group.items.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))
                ) : (
                  <optgroup key={group.key} label={group.label}>
                    {group.items.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </select>
          </div>
          <div>
            <label htmlFor="training-starts" className={labelClass}>
              Start date <span className="text-danger">*</span>
            </label>
            <input
              id="training-starts"
              name="startsOn"
              type="date"
              required
              value={startsOn}
              onChange={(event) => {
                setStartsOn(event.target.value);
                if (!durationTouched && endsOn) {
                  setDurationText(durationLabel(event.target.value, endsOn) ?? "");
                }
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="training-ends" className={labelClass}>
              End date
            </label>
            <input
              id="training-ends"
              name="endsOn"
              type="date"
              min={startsOn || undefined}
              value={endsOn}
              onChange={(event) => {
                setEndsOn(event.target.value);
                if (!durationTouched) setDurationText(durationLabel(startsOn, event.target.value) ?? "");
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="training-duration" className={labelClass}>
              Duration
            </label>
            <input
              id="training-duration"
              name="durationText"
              maxLength={40}
              value={durationText}
              onChange={(event) => {
                setDurationTouched(true);
                setDurationText(event.target.value);
              }}
              placeholder={suggestedDuration ?? "e.g. 3 days"}
              className={inputClass}
            />
            <p className={hintClass}>
              {suggestedDuration
                ? `Filled from the dates: ${suggestedDuration}. Type over it if the plan differs.`
                : "Derived from the start and end dates when you leave it blank."}
            </p>
          </div>
          <div>
            <label htmlFor="training-venue" className={labelClass}>
              Venue, if not a facility
            </label>
            <input
              id="training-venue"
              name="venue"
              maxLength={160}
              defaultValue={start.venue}
              placeholder="e.g. GHS Regional Health Directorate hall"
              className={inputClass}
            />
          </div>
          </div>,
          <div key="record" className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="training-status" className={labelClass}>
              Status
            </label>
            <select id="training-status" name="status" defaultValue={start.status} className={inputClass}>
              {TRAINING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TRAINING_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="training-attendees" className={labelClass}>
              People trained
            </label>
            <input
              id="training-attendees"
              name="attendeeCount"
              type="number"
              min={0}
              max={5000}
              defaultValue={start.attendeeCount}
              className={inputClass}
            />
            <p className={hintClass}>Fill this in once the training has run.</p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="training-notes" className={labelClass}>
              About this training
            </label>
            <textarea
              id="training-notes"
              name="notes"
              rows={5}
              maxLength={1000}
              defaultValue={start.notes}
              placeholder="What it covered, who facilitated it, what people should take away. This is the paragraph under the heading on the training page."
              className={inputClass}
            />
          </div>
          </div>
        ]}
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel={mode === "create" ? "Saving…" : "Saving changes…"}>
              {mode === "create" ? "Create training" : "Save changes"}
            </SubmitButton>
            <Badge variant="outline">Audited</Badge>
          </div>
        }
      />

      <FormFeedback
        state={state}
        pending={pending}
        pendingMessage={mode === "create" ? "Creating the training…" : "Saving the changes…"}
      />
    </form>
  );
}
