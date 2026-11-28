"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { broadcastNoticeAction, type NoticeActionState } from "@/lib/server/actions/notices";
import type { AuthoringArea } from "@/lib/server/authoring-queries";

const INITIAL: NoticeActionState = { ok: false, message: null };

const TYPES = [
  { value: "MATERIAL_UPDATE", label: "Material update" },
  { value: "SYSTEM_MAINTENANCE", label: "Service notice" },
  { value: "TRAINING_PUBLISHED", label: "Training announcement" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function BroadcastForm({
  areas,
  canAddressEveryone,
  districtName,
}: {
  areas: AuthoringArea[];
  canAddressEveryone: boolean;
  /** Set for a District HR: their notice reaches their district and nowhere else. */
  districtName?: string | null;
}) {
  const [state, formAction] = useActionState(broadcastNoticeAction, INITIAL);
  const scopedToDistrict = Boolean(districtName);
  const [scope, setScope] = useState<"AREA" | "ALL">(!scopedToDistrict && areas.length ? "AREA" : "ALL");

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className={labelClass}>Who should see this?</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              value="AREA"
              checked={scope === "AREA"}
              onChange={() => setScope("AREA")}
              disabled={areas.length === 0 || scopedToDistrict}
            />
            One Programme Field&apos;s cohort
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              value="ALL"
              checked={scope === "ALL"}
              onChange={() => setScope("ALL")}
              disabled={!canAddressEveryone}
            />
            {scopedToDistrict ? `Everyone in ${districtName}` : "Everyone"}
          </label>
        </div>
        {scopedToDistrict ? (
          <p className={hintClass}>
            A district notice reaches staff whose district is {districtName}. It cannot be sent to another district or
            to the whole region.
          </p>
        ) : (
          !canAddressEveryone && <p className={hintClass}>Only a system administrator can address everyone.</p>
        )}
      </fieldset>

      {scope === "AREA" && (
        <div>
          <label htmlFor="notice-area" className={labelClass}>
            Programme field
          </label>
          <Select
            id="notice-area"
            name="areaId"
            required
            searchable
            defaultValue=""
            placeholder="Choose a Programme Field"
            options={areas.map((area) => ({
              value: area.id,
              label: area.name,
              hint: area.fieldName,
            }))}
          />
          <p className={hintClass}>The notice inherits this Programme Field&apos;s region, directorate and grade audience settings.</p>
        </div>
      )}

      <div>
        <label htmlFor="notice-title" className={labelClass}>
          Title
        </label>
        <input id="notice-title" name="title" required minLength={5} maxLength={160} className={inputClass} />
      </div>

      <div>
        <label htmlFor="notice-body" className={labelClass}>
          Message
        </label>
        <textarea id="notice-body" name="body" required minLength={10} maxLength={2000} rows={4} className={inputClass} />
        <p className={hintClass}>Say what changed and what people should do. Plain language, no acronyms on first use.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="notice-type" className={labelClass}>
            Type
          </label>
          <Select
            id="notice-type"
            name="type"
            defaultValue="MATERIAL_UPDATE"
            options={TYPES.map((type) => ({ value: type.value, label: type.label }))}
          />
        </div>
        <div>
          <label htmlFor="notice-priority" className={labelClass}>
            Priority
          </label>
          <Select
            id="notice-priority"
            name="priority"
            defaultValue="MEDIUM"
            options={PRIORITIES.map((priority) => ({ value: priority.value, label: priority.label }))}
          />
        </div>
        <div>
          <label htmlFor="notice-expiry" className={labelClass}>
            Expires after (days)
          </label>
          <input id="notice-expiry" name="expiresInDays" type="number" min={0} max={365} className={inputClass} />
          <p className={hintClass}>Empty means it stays until withdrawn.</p>
        </div>
      </div>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded-control border px-3 py-2 text-sm ${state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"}`}
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Sending…">Send notice</SubmitButton>
        <Badge variant="outline">Every send is audited</Badge>
      </div>
    </form>
  );
}
