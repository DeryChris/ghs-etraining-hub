import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { LibraryTrainingCard } from "@/components/trainings/library-training-card";
import { Badge } from "@/components/ui/badge";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TRAINING_STATUS_LABELS } from "@/lib/labels";
import { fieldHref } from "@/lib/links";
import { formatDate } from "@/lib/format";
import { getAreaByCode } from "@/lib/server/learning-queries";
import { listTrainingsInArea } from "@/lib/server/training-queries";
import { requireSession } from "@/lib/server/rbac";

/**
 * One programme field: the trainings held for it, and nothing else.
 *
 * It listed a standing library of material underneath — documents, videos and
 * labs that applied to the field between trainings — and that is the half that
 * went. Files belong to the event they were used at, so a field is a list of
 * trainings, each carrying its own attachments.
 */
export default async function AreaPage({ params }: { params: Promise<{ fieldCode: string; areaCode: string }> }) {
  const session = await requireSession();
  const { areaCode } = await params;
  const code = decodeURIComponent(areaCode);
  if (!/^[A-Za-z0-9-]{1,24}$/.test(code)) notFound();

  const found = await getAreaByCode(code, session);
  if (!found) notFound();
  const { area, field } = found;

  const trainings = await listTrainingsInArea(area.id);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/catalogue" className="hover:text-ink">
              Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={fieldHref(field.code)} className="hover:text-ink">
              {field.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {area.name}
          </li>
        </ol>
      </nav>

      <PageHeader eyebrow={`${field.name} · ${area.code}`} title={area.name} description={area.description ?? undefined} />

      <section aria-labelledby="trainings-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="trainings-heading" className="text-lg font-bold text-ink">
              Trainings in this area
            </h2>
            <p className="text-sm text-ink-muted">
              Every published training filed here, newest first. Open one for its write-up, resources and discussion.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {trainings.length} {trainings.length === 1 ? "training" : "trainings"}
          </span>
        </div>

        {trainings.length === 0 ? (
          <ListEmptyState
            title="No trainings filed under this field yet"
            description="A facilitator or an administrator records a training against this field and it appears here — with its slides, attendance sheet and report."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {trainings.map((training) => (
              <li key={training.id}>
                {/*
                 * Opens in an overlay over the library rather than navigating to the
                 * Trainings page, and the overlay is read-only: no uploads, no editing,
                 * exactly what a staff member sees. `href` stays a real link for a
                 * new tab, a middle-click or an error page inside the panel.
                 */}
                <LibraryTrainingCard trainingId={training.id} href={`/trainings/${training.id}?from=library`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{training.year}</span>
                    <Badge variant={training.status === "CANCELLED" ? "danger" : training.status === "PLANNED" ? "success" : "default"}>
                      {TRAINING_STATUS_LABELS[training.status]}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold leading-snug text-ink group-hover:text-primary">{training.title}</h3>
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                      {formatDate(training.startsOn)}
                    </span>
                    {(training.facilityName ?? training.venue ?? training.regionName) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        {training.facilityName ?? training.venue ?? training.regionName}
                      </span>
                    )}
                    {training.attendeeCount !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        {training.attendeeCount.toLocaleString("en-GB")} trained
                      </span>
                    )}
                  </div>
                </LibraryTrainingCard>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
