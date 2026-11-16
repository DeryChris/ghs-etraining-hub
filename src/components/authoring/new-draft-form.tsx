"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { MATERIAL_TYPE_LABELS, MATERIAL_TYPES } from "@/lib/labels";
import { MATERIAL_STATES } from "@/lib/material-workflow";
import { createDraftAction, type AuthoringActionState } from "@/lib/server/actions/authoring";
import type { AuthoringSpace } from "@/lib/server/authoring-queries";

const INITIAL: AuthoringActionState = { ok: false, message: null };

export function NewDraftForm({ spaces }: { spaces: AuthoringSpace[] }) {
  const [state, formAction] = useActionState(createDraftAction, INITIAL);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.materialId) router.push(`/authoring/${state.materialId}`);
  }, [state, router]);

  if (spaces.length === 0) {
    return (
      <p className="rounded-control border border-hairline bg-surface-2 px-4 py-3 text-sm text-ink-muted">
        You are not assigned to a directorate yet, so you cannot author material. Ask an administrator to assign you to
        one in <span className="font-semibold text-ink">Programmes</span>.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="draft-space" className={labelClass}>
            Space
          </label>
          <select id="draft-space" name="spaceId" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose a space
            </option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.categoryName} · {space.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="draft-type" className={labelClass}>
            Type
          </label>
          <select id="draft-type" name="type" required className={inputClass} defaultValue="DOCUMENT">
            {MATERIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {MATERIAL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
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
        <select id="draft-priority" name="priority" className={inputClass} defaultValue="MEDIUM">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
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
