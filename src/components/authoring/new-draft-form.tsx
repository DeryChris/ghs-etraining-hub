"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPES } from "@/lib/labels";
import { MATERIAL_STATES } from "@/lib/material-workflow";
import { createDraftAction, type AuthoringActionState } from "@/lib/server/actions/authoring";
import type { AuthoringArea } from "@/lib/server/authoring-queries";

const INITIAL: AuthoringActionState = { ok: false, message: null };

export function NewDraftForm({ programmeAreas }: { programmeAreas: AuthoringArea[] }) {
  const [state, formAction] = useActionState(createDraftAction, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.materialId) router.push(`/authoring/${state.materialId}`);
  }, [state, router]);

  if (programmeAreas.length === 0) {
    return (
      <p className="rounded-control border border-hairline bg-surface-2 px-4 py-3 text-sm text-ink-muted">
        No Programme Area or Programme Field material-authoring scope is assigned to you yet. Ask a system administrator to update your access under <span className="font-semibold text-ink">Users → Access</span>.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="draft-area" className={labelClass}>
            Programme Field
          </label>
          <Select
            id="draft-area"
            name="programmeAreaId"
            required
            searchable
            defaultValue=""
            placeholder="Choose a Programme Field"
            options={programmeAreas.map((area) => ({
              value: area.id,
              label: area.name,
              hint: area.fieldName,
            }))}
          />
        </div>
        <div>
          <label htmlFor="draft-type" className={labelClass}>
            Type
          </label>
          <Select
            id="draft-type"
            name="type"
            required
            defaultValue="DOCUMENT"
            options={MATERIAL_TYPES.map((type) => ({ value: type, label: MATERIAL_TYPE_LABELS[type] }))}
          />
        </div>
      </div>

      <div>
        <label htmlFor="draft-title" className={labelClass}>
          Title
        </label>
        <input id="draft-title" name="title" required minLength={3} maxLength={160} className={inputClass} />
      </div>

      <div>
        <label htmlFor="draft-summary" className={labelClass}>
          Summary <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
        </label>
        <textarea id="draft-summary" name="summary" rows={3} maxLength={600} className={inputClass} />
      </div>

      <div>
        <label htmlFor="draft-priority" className={labelClass}>
          Priority
        </label>
        <Select
          id="draft-priority"
          name="priority"
          defaultValue="MEDIUM"
          options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium" },
            { value: "HIGH", label: "High" },
            { value: "CRITICAL", label: "Critical" },
          ]}
        />
        <p className={hintClass}>Priority drives notification ordering, not access.</p>
      </div>

      {state.message && (
        <p role="status" className={`rounded-control border px-3 py-2 text-sm ${state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"}`}>
          {state.ok ? "Draft created. Upload the file on the material page." : state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Creating draft…">Create draft</SubmitButton>
        <Badge variant="outline">Starts as {MATERIAL_STATES[0]}</Badge>
      </div>
    </form>
  );
}
