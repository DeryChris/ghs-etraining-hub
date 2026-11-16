"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { broadcastNoticeAction, type NoticeActionState } from "@/lib/server/actions/notices";
import type { AuthoringSpace } from "@/lib/server/authoring-queries";

const INITIAL: NoticeActionState = { ok: false, message: null };

const TYPES = [
  { value: "SPACE_ANNOUNCEMENT", label: "Announcement" },
  { value: "MATERIAL_UPDATE", label: "Protocol update" },
  { value: "SYSTEM_MAINTENANCE", label: "System maintenance" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export function BroadcastForm({ spaces, canAddressEveryone }: { spaces: AuthoringSpace[]; canAddressEveryone: boolean }) {
  const [state, formAction] = useActionState(broadcastNoticeAction, INITIAL);
  const [scope, setScope] = useState<"SPACE" | "ALL">(spaces.length ? "SPACE" : "ALL");

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className={labelClass}>Who should see this?</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              value="SPACE"
              checked={scope === "SPACE"}
              onChange={() => setScope("SPACE")}
              disabled={spaces.length === 0}
            />
            One space&apos;s cohort
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
            Everyone
          </label>
        </div>
        {!canAddressEveryone && <p className={hintClass}>Only a system administrator can address everyone.</p>}
      </fieldset>

      {scope === "SPACE" && (
        <div>
          <label htmlFor="notice-space" className={labelClass}>
            Space
          </label>
          <select id="notice-space" name="spaceId" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose a space
            </option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.categoryName} · {space.title}
              </option>
            ))}
          </select>
          <p className={hintClass}>The notice inherits that space&apos;s region, directorate and cadre audience.</p>
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
          <select id="notice-type" name="type" className={inputClass} defaultValue="SPACE_ANNOUNCEMENT">
            {TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="notice-priority" className={labelClass}>
            Priority
          </label>
          <select id="notice-priority" name="priority" className={inputClass} defaultValue="MEDIUM">
            {PRIORITIES.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
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
