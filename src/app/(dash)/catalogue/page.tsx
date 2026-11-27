import Link from "next/link";
import { redirect } from "next/navigation";
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

export const metadata = { title: "Library" };

/**
 * The library: programme area → field → the trainings held for it.
 *
 * It used to carry a second half — a searchable list of every published
 * document, filed under an area, reviewable and versioned — and that half is
 * gone. Material is not a standing library any more: a slide deck, an attendance
 * sheet or a report is attached to the training it belongs to, and that is where
 * it is read. So this page is the way in by subject, and the second click is the
 * training itself.
 *
 * Old links still arrive with `?q=` and `?type=`, from the header search and from
 * bookmarks. They are forwarded to the trainings list, which does have a text
 * search, rather than being silently dropped.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  if (query) redirect(`/trainings?q=${encodeURIComponent(query)}`);

  const loaded = await withDeadline("catalogue.index", () => mapLimit([() => listFields(session)]));
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="The library did not load"
        description="The programme areas could not be read in time. Nothing was changed."
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
        eyebrow="Library"
        title="Programmes, areas and their trainings"
        description="Every programme area GHS trains in, with the fields inside it. Open an area, then a field, to see the trainings held for it — and the files attached to each one."
        icon={<BookOpen className="h-7 w-7 text-primary" aria-hidden />}
        actions={
          <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
            Go to Trainings
          </Link>
        }
      />

      <p className="text-sm text-ink-muted">
        {fields.length} {fields.length === 1 ? "programme area" : "programme areas"} ·{" "}
        {trainings.toLocaleString("en-GB")} published {trainings === 1 ? "training" : "trainings"}
      </p>

      {fields.length === 0 ? (
        <ListEmptyState
          title="The programme taxonomy is empty"
          description="An administrator maintains the areas and fields at Administration → Programme areas. They appear here as soon as they are published."
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
