import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgrammeFieldTile } from "@/components/programme/programme-tile";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { fieldHref } from "@/lib/links";
import { listFields } from "@/lib/server/learning-queries";
import { mapLimit, withDeadline } from "@/lib/server/page-data";
import { requireSession } from "@/lib/server/rbac";

export const dynamic = "force-dynamic";

export const metadata = { title: "Catalogue" };

/**
 * The catalogue: programme field → programme area → the trainings and material
 * filed under it.
 *
 * This used to live at the top of the Trainings tab, so the register and the
 * taxonomy it is filed under shared one screen and neither got a proper one. The
 * register is the flat list of events; the catalogue is how you look something up
 * when you know the programme but not the year, the venue or the title.
 */
export default async function CataloguePage() {
  const session = await requireSession();
  const loaded = await withDeadline("catalogue.index", () => mapLimit([() => listFields(session)]));
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The catalogue did not load"
        description="The programme fields could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
        hint={loaded.hint}
      />
    );
  }
  const [fields] = loaded.data;
  const trainings = fields.reduce((total, field) => total + field.trainingCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Programmes, areas and their trainings"
        description="Every programme field GHS trains in, with the areas inside it. Open a field, then an area, to see the trainings held for it and the material that goes with them."
        icon={<BookOpen className="h-7 w-7 text-primary" aria-hidden />}
        actions={
          <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
            Go to the register
          </Link>
        }
      />

      <p className="text-sm text-ink-muted">
        {fields.length} {fields.length === 1 ? "programme field" : "programme fields"} ·{" "}
        {trainings.toLocaleString("en-GB")} published {trainings === 1 ? "training" : "trainings"}
      </p>

      {fields.length === 0 ? (
        <ListEmptyState
          title="The programme taxonomy is empty"
          description="An administrator maintains the fields and areas at Administration → Programme fields. They appear here as soon as they are published."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <li key={field.id}>
              <ProgrammeFieldTile field={field} href={fieldHref(field.code)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
