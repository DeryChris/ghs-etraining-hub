"use client";

import { useActionState, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createSessionAction, type SessionActionState } from "@/lib/server/actions/sessions";
import type { DistrictOption } from "@/lib/server/session-queries";

const INITIAL: SessionActionState = { ok: false, message: null };

export interface ProgrammeOption {
  categoryId: string;
  categoryName: string;
  spaces: { id: string; title: string }[];
}

/**
 * Records a training that happened. District drives the facility list, and the
 * region is derived on the server, so the geography fields cannot contradict
 * each other.
 */
export function SessionForm({ programmes, geography }: { programmes: ProgrammeOption[]; geography: DistrictOption[] }) {
  const [state, formAction] = useActionState(createSessionAction, INITIAL);
  const [districtId, setDistrictId] = useState("");
  const [categoryId, setCategoryId] = useState(programmes[0]?.categoryId ?? "");

  const facilitiesForDistrict = useMemo(
    () => geography.find((district) => district.id === districtId)?.facilities ?? [],
    [districtId, geography],
  );
  const spacesForCategory = useMemo(
    () => programmes.find((programme) => programme.categoryId === categoryId)?.spaces ?? [],
    [categoryId, programmes],
  );

  return (
    <form action={formAction} className="grid gap-4 rounded-card border border-hairline bg-surface p-5 shadow-panel md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="text-base font-bold text-ink">Record a training session</h2>
        <p className="text-sm text-ink-muted">
          What ran, where, and under which programme. These rows are what the insights charts count.
        </p>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="session-title" className={labelClass}>
          Session title
        </label>
        <input id="session-title" name="title" required placeholder="e.g. Malaria case management refresher" className={inputClass} />
      </div>

      <div>
        <label htmlFor="session-category" className={labelClass}>
          Programme
        </label>
        <select
          id="session-category"
          name="categoryId"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={inputClass}
        >
          {programmes.map((programme) => (
            <option key={programme.categoryId} value={programme.categoryId}>
              {programme.categoryName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="session-space" className={labelClass}>
          Module / area
        </label>
        <select id="session-space" name="spaceId" defaultValue="" className={inputClass}>
          <option value="">Not tied to a module</option>
          {spacesForCategory.map((space) => (
            <option key={space.id} value={space.id}>
              {space.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="session-date" className={labelClass}>
          Date it ran
        </label>
        <input id="session-date" name="organisedOn" type="date" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="session-attendees" className={labelClass}>
          People who attended
        </label>
        <input id="session-attendees" name="attendeeCount" type="number" min={0} max={5000} className={inputClass} />
        <p className={hintClass}>Optional. Feeds the attendance total on Insights.</p>
      </div>

      <div>
        <label htmlFor="session-district" className={labelClass}>
          District
        </label>
        <select
          id="session-district"
          name="districtId"
          value={districtId}
          onChange={(event) => setDistrictId(event.target.value)}
          className={inputClass}
        >
          <option value="">Not recorded</option>
          {geography.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name} ({district.regionName})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="session-facility" className={labelClass}>
          Facility
        </label>
        <select id="session-facility" name="facilityId" defaultValue="" disabled={!districtId} className={inputClass}>
          <option value="">{districtId ? "Not tied to a facility" : "Choose a district first"}</option>
          {facilitiesForDistrict.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
        {districtId && facilitiesForDistrict.length === 0 && (
          <p className={hintClass}>No facilities recorded for that district yet.</p>
        )}
      </div>

      <div>
        <label htmlFor="session-facilitator" className={labelClass}>
          Facilitator
        </label>
        <input id="session-facilitator" name="facilitatorName" placeholder="Defaults to you" className={inputClass} />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="session-notes" className={labelClass}>
          Notes
        </label>
        <textarea id="session-notes" name="notes" rows={2} className={inputClass} placeholder="Anything the record should carry" />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Recording…">Record session</SubmitButton>
        <Badge variant="outline">Audited</Badge>
      </div>

      {state.message && (
        <p
          role="status"
          className={`md:col-span-2 rounded-control border px-4 py-3 text-sm font-medium ${
            state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
