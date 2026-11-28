import Link from "next/link";
import { redirect } from "next/navigation";
import { TrainingForm } from "@/components/trainings/training-form";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/rbac/capabilities";
import { requireSession } from "@/lib/server/rbac";
import { listGeography, listProgrammeFieldOptions } from "@/lib/server/taxonomy-queries";
import { programmeGrantsFor, trimOptionsToGrants } from "@/lib/server/programme-scope";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "New training" };

export default async function NewTrainingPage() {
  const session = await requireSession();
  if (!can(session.role, "training.manage")) redirect("/dashboard?notice=forbidden");

  const loaded = await withDeadline("trainings.new", () =>
    mapLimit([() => listProgrammeFieldOptions(), () => listGeography()]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="New training form did not load"
        description="Programme fields and geography could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [allFields, geography] = loaded.data;
  /* A facilitator is offered only the fields they hold; an administrator sees all. */
  const fields =
    session.role === "FACILITATOR"
      ? trimOptionsToGrants(allFields, await programmeGrantsFor(session.sub))
      : allFields;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trainings"
        title="New training"
        description="Create a Training Session record under a Programme Area and Programme Field. Add a date and location when known, then update its status as the event changes."
        actions={
          <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
            Back to trainings
          </Link>
        }
      />

      {fields.length === 0 ? (
        <ListEmptyState
          title="No Programme Areas yet"
          description="A training needs a Programme Area and a Programme Field inside it. Add them under Administration → Programme Areas, or run the seeder to load the GHS list."
          actionText="Programme Areas"
          actionHref="/programme-fields"
        />
      ) : (
        <TrainingForm fields={fields} geography={geography} mode="create" />
      )}
    </div>
  );
}
