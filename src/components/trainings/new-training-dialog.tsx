"use client";

import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { GeographyRegion, ProgrammeFieldOption } from "@/lib/server/taxonomy-queries";
import { TrainingForm } from "./training-form";

/**
 * "Record a training" as an overlay rather than a trip to /trainings/new.
 *
 * The trainings list is where somebody notices a missing record, so the form comes to
 * them: closing it leaves the list, its filters and its scroll position exactly
 * where they were. `/trainings/new` stays as a fallback for a bare link.
 */
export function NewTrainingDialog({
  fields,
  geography,
  label = "Record a training",
}: {
  fields: ProgrammeFieldOption[];
  geography: GeographyRegion[];
  label?: string;
}) {
  return (
    <Dialog
      title="Record a training"
      description="Filed under a programme field and one of its areas. A facilitator's record goes to the unit head for review before it is visible to everyone else."
      size="lg"
      trigger={({ open }) => (
        <button
          type="button"
          onClick={open}
          className={buttonClass({ className: "h-12 rounded-[var(--radius-pill)] px-6" })}
        >
          {label}
        </button>
      )}
    >
      <TrainingForm fields={fields} geography={geography} mode="create" />
    </Dialog>
  );
}
