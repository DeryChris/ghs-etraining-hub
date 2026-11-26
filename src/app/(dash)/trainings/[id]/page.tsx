import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, CalendarDays, MapPin, Users } from "lucide-react";
import { TrainingForm, type TrainingFormValues } from "@/components/trainings/training-form";
import { ReviewPanel } from "@/components/trainings/review-panel";
import { TrainingResources } from "@/components/trainings/resources-panel";
import { TrainingCover } from "@/components/trainings/training-cover";
import { ResourceChips } from "@/components/trainings/resource-chips";
import { Discussion } from "@/components/trainings/discussion";
import { createMaterialSignedUrl, storageCeiling } from "@/lib/server/file-storage";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate, formatDateTime } from "@/lib/format";
import { downloadFileName } from "@/lib/file-name";
import { TRAINING_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/rbac/capabilities";
import { archiveTrainingAction } from "@/lib/server/actions/trainings";
import { mayReviewField, requireSession } from "@/lib/server/rbac";
import { listGeography, listProgrammeFieldOptions } from "@/lib/server/taxonomy-queries";
import { getTraining, listTrainingComments } from "@/lib/server/training-queries";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TrainingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const training = await getTraining(id);
  if (!training) notFound();

  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : null;
  const error = typeof query.error === "string" ? query.error : null;

  const mayManage = can(session.role, "training.manage");
  // Only a unit head holding this field, or an administrator, sees the decision
  // buttons — but everybody who can open the row sees its review state.
  const canReview = await mayReviewField(session, training.programmeFieldId);
  // A row still in review is a private draft between its author and the unit
  // head. Anyone else who types the URL gets the same answer as a bad id.
  if (training.reviewState !== "PUBLISHED" && training.createdById !== session.sub && !canReview) notFound();

  const comments = await listTrainingComments(training.id);

  /*
   * The picture and every attachment get a short-lived link here rather than in
   * the browser. With a bucket configured that link is presigned; without one it
   * points at this application, which streams the bytes from the database. Either
   * way the session and role checks have already happened by the time a URL exists.
   */
  const cover = training.imageStorageKey
    ? await createMaterialSignedUrl(training.imageStorageKey)
    : null;
  const coverSrc = cover?.ok ? cover.url : null;

  const chips = await Promise.all(
    training.resources.map(async (resource) => {
      const signed = await createMaterialSignedUrl(
        resource.storageKey,
        downloadFileName(resource.title, resource.mimeType),
      );
      return {
        id: resource.id,
        title: resource.title,
        mimeType: resource.mimeType,
        sizeBytes: resource.sizeBytes,
        href: signed.ok ? signed.url : null,
      };
    }),
  );
  let fields: Awaited<ReturnType<typeof listProgrammeFieldOptions>> = [];
  let geography: Awaited<ReturnType<typeof listGeography>> = [];
  if (mayManage) {
    const loaded = await withDeadline("trainings.detail", () =>
      mapLimit([() => listProgrammeFieldOptions(), () => listGeography()]),
    );
    if (!loaded.ok) {
      return (
        <DataUnavailable
          title="Training detail did not load"
          description="Programme fields and geography could not be read in time. Nothing was changed."
          requestId={loaded.requestId}
        />
      );
    }
    [fields, geography] = loaded.data;
  }

  const place = [training.facilityName ?? training.venue, training.subDistrictName, training.districtName, training.regionName]
    .filter(Boolean)
    .join(" · ");
  const dates =
    training.endsOn && training.endsOn !== training.startsOn
      ? `${formatDate(training.startsOn)} – ${formatDate(training.endsOn)}`
      : formatDate(training.startsOn);

  const initial: TrainingFormValues = {
    id: training.id,
    title: training.title,
    year: String(training.year),
    programmeFieldId: training.programmeFieldId ?? "",
    programmeAreaId: training.programmeAreaId ?? "",
    targetGroup: training.targetGroup ?? "",
    regionId: training.regionId ?? "",
    districtId: training.districtId ?? "",
    subDistrictId: training.subDistrictId ?? "",
    facilityId: training.facilityId ?? "",
    startsOn: training.startsOn,
    endsOn: training.endsOn ?? "",
    durationText: training.durationText ?? "",
    venue: training.venue ?? "",
    status: training.status,
    attendeeCount: training.attendeeCount !== null ? String(training.attendeeCount) : "",
    notes: training.notes ?? "",
  };

  return (
    <div className="space-y-8">
      <TrainingCover
        trainingId={training.id}
        title={training.title}
        imageSrc={coverSrc}
        canEdit={mayManage && (session.role === "SYSTEM_ADMIN" || training.createdById === session.sub || canReview)}
      />

      <div className="space-y-4">
        <PageHeader
          eyebrow={
            training.fieldName
              ? `${training.fieldName}${training.areaName ? ` · ${training.areaName}` : ""}`
              : "Training register"
          }
          title={training.title}
          description={training.targetGroup ? `For ${training.targetGroup}.` : undefined}
          actions={
            <Link href="/trainings" className={buttonClass({ variant: "ghost" })}>
              Back to trainings
            </Link>
          }
        />

        {training.notes ? (
          <p className="max-w-[75ch] whitespace-pre-line text-base leading-relaxed text-ink-muted">{training.notes}</p>
        ) : (
          <p className="max-w-[75ch] text-base leading-relaxed text-ink-muted">
            What this training covered, who ran it, and the material that went with it.
          </p>
        )}

        <ResourceChips resources={chips} />
      </div>

      {(notice || error) && (
        <p
          role="status"
          className={`rounded-control border px-4 py-3 text-sm font-medium ${
            error ? "border-danger/40 bg-danger/10 text-danger" : "border-primary/30 bg-primary/10 text-primary"
          }`}
        >
          {error ?? notice}
        </p>
      )}

      <section
        aria-label="Training summary"
        className="grid gap-4 rounded-card border border-hairline bg-surface p-6 shadow-panel sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">When</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            {dates}
          </p>
          {training.durationText && <p className="text-xs text-ink-muted">{training.durationText}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Where</p>
          <p className="flex items-start gap-1.5 text-sm font-semibold text-ink">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {place || "Not recorded yet"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">People trained</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            {training.attendeeCount !== null ? training.attendeeCount.toLocaleString("en-GB") : "Not recorded"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Register</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{training.year}</Badge>
            <Badge variant={training.status === "CANCELLED" ? "danger" : training.status === "PLANNED" ? "success" : "default"}>
              {TRAINING_STATUS_LABELS[training.status]}
            </Badge>
          </div>
          <p className="text-xs text-ink-muted">
            Filed by {training.createdByName ?? "an administrator"} · {formatDateTime(training.createdAt)}
          </p>
        </div>
      </section>

      <ReviewPanel
        trainingId={training.id}
        title={training.title}
        reviewState={training.reviewState}
        reviewNote={training.reviewNote}
        reviewedByName={training.reviewedByName}
        canReview={canReview}
      />

      <TrainingResources
        trainingId={training.id}
        resources={training.resources}
        ceiling={storageCeiling()}
        canEdit={mayManage && (session.role === "SYSTEM_ADMIN" || training.createdById === session.sub || canReview)}
      />

      <Discussion
        trainingId={training.id}
        comments={comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
          createdAtLabel: formatDateTime(comment.createdAt),
          canDelete: comment.authorId === session.sub || session.role === "SYSTEM_ADMIN",
        }))}
      />

      {mayManage ? (
        <>
          <TrainingForm fields={fields} geography={geography} initial={initial} mode="update" />

          <section aria-labelledby="training-archive-heading" className="rounded-card border border-hairline bg-surface p-6 shadow-panel">
            <h2 id="training-archive-heading" className="text-sm font-bold text-ink">
              Withdraw this training
            </h2>
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
              Archiving takes it out of the register and off the filters. The row, its audit entries and any
              attendance already recorded are kept — nothing is deleted.
            </p>
            <form action={archiveTrainingAction} className="mt-4">
              <input type="hidden" name="trainingId" value={training.id} />
              <button type="submit" className={buttonClass({ variant: "danger", size: "sm" })}>
                <Archive className="h-4 w-4" aria-hidden />
                Archive training
              </button>
            </form>
          </section>
        </>
      ) : (
        <p className="rounded-card border border-hairline bg-surface p-5 text-sm text-ink-muted shadow-panel">
          You can read this training but not change it. Editing the register needs an administrator or a
          facilitator account.
        </p>
      )}
    </div>
  );
}
