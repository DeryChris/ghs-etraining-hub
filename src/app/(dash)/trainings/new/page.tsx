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
  const [fields, geography] = loaded.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Trainings"
        title="New training"
        description="A training plan is filed under a programme field and one of its areas, then given a place and a date. It becomes one of the trainings recorded here once it runs."
        actions={
          <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
            Back to trainings
          </Link>
        }
      />

      {fields.length === 0 ? (
        <ListEmptyState
          title="No programme fields yet"
          description="A training needs a programme field and an area inside it. Add them under Administration → Programme fields, or run the seeder to load the GHS list."
          actionText="Programme fields"
          actionHref="/programme-fields"
          art="folder"
        />
      ) : (
        <TrainingForm fields={fields} geography={geography} mode="create" />
      )}
    </div>
  );
}
