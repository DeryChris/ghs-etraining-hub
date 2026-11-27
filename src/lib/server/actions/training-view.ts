"use server";

import { createMaterialSignedUrl } from "@/lib/server/file-storage";
import { getSession } from "@/lib/server/session";
import { mayReviewField } from "@/lib/server/rbac";
import { getTraining, listTrainingComments } from "@/lib/server/training-queries";
import { log } from "@/lib/server/logger";

/**
 * Everything a reader needs to read one training, without leaving the library.
 *
 * The library opens a training in a panel rather than navigating to the Trainings
 * page: a person browsing the library is reading, and losing the page they were
 * on to read one item is the opposite of browsing. The panel needs the same
 * content the detail page has, so this action loads exactly that and nothing more
 * — no form data, no geography lists, no edit affordances.
 *
 * It applies the same visibility rule as the page: a training still in review is
 * visible only to its author and the unit head who decides it. Being an action
 * rather than a page does not make it a different door.
 */
export interface TrainingView {
  id: string;
  title: string;
  fieldName: string | null;
  areaName: string | null;
  status: string;
  year: number;
  dates: string;
  durationText: string | null;
  place: string | null;
  targetGroup: string | null;
  attendeeCount: number | null;
  notes: string | null;
  coverSrc: string | null;
  resources: { id: string; title: string; mimeType: string | null; sizeBytes: number | null }[];
  comments: { id: string; body: string; authorName: string; authorRole: string; createdAtLabel: string }[];
}

export type TrainingViewResult = { ok: true; data: TrainingView } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadTrainingViewAction(trainingId: string): Promise<TrainingViewResult> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in again to read this training." };
  if (!UUID.test(trainingId)) return { ok: false, message: "That training could not be found." };

  try {
    const training = await getTraining(trainingId);
    // `getTraining` already excludes archived rows.
    if (!training) return { ok: false, message: "That training could not be found." };

    const canReview = await mayReviewField(session, training.programmeFieldId);
    if (training.reviewState !== "PUBLISHED" && training.createdById !== session.sub && !canReview) {
      return { ok: false, message: "That training could not be found." };
    }

    /*
     * The files are listed, not linked: the viewer asks for one when it is opened
     * (`/api/trainings/…/resources/…/file`), so opening a training does not mint
     * a signed URL for every attachment, and clicking one never downloads it.
     */
    const [comments, cover] = await Promise.all([
      listTrainingComments(training.id),
      training.imageStorageKey ? createMaterialSignedUrl(training.imageStorageKey) : Promise.resolve(null),
    ]);

    const dates =
      training.endsOn && training.endsOn !== training.startsOn
        ? `${training.startsOn} → ${training.endsOn}`
        : training.startsOn;

    return {
      ok: true,
      data: {
        id: training.id,
        title: training.title,
        fieldName: training.fieldName,
        areaName: training.areaName,
        status: training.status,
        year: training.year,
        dates,
        durationText: training.durationText,
        place:
          [training.facilityName ?? training.venue, training.subDistrictName, training.districtName, training.regionName]
            .filter(Boolean)
            .join(" · ") || null,
        targetGroup: training.targetGroup,
        attendeeCount: training.attendeeCount,
        notes: training.notes,
        coverSrc: cover?.ok ? cover.url : null,
        resources: training.resources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          mimeType: resource.mimeType,
          sizeBytes: resource.sizeBytes,
        })),
        comments: comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
          createdAtLabel: comment.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    log.error({ event: "training.view_failed", id: trainingId, err: String(error) });
    return { ok: false, message: "That training could not be read just now. Try again." };
  }
}
