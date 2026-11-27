import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/app-origin";
import { downloadFileName } from "@/lib/file-name";
import { isUuid } from "@/lib/ids";
import { createMaterialSignedUrl } from "@/lib/server/file-storage";
import { log } from "@/lib/server/logger";
import { mayReviewField } from "@/lib/server/rbac";
import { getSession } from "@/lib/server/session";
import { getTraining } from "@/lib/server/training-queries";

/**
 * One file attached to a training, for reading or for keeping.
 *
 * `view` — no query string — is what a viewer embeds: it is answered with the
 * bytes themselves and no `Content-Disposition: attachment`, so a PDF opens in the
 * frame, a video seeks, an image renders. `?download=1` is the explicit save, and
 * the only thing that asks the browser to put the file on disk.
 *
 * The check is the same door as the page: the training must be published, or you
 * must be its author or the unit head who decides it. A signed link is never
 * minted for somebody who could not open the page it belongs to.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await context.params;
  const origin = appOrigin(request);

  try {
    if (!isUuid(id) || !isUuid(resourceId)) return new NextResponse("Not found", { status: 404 });

    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(
        new URL(`/login?next=${encodeURIComponent(`/trainings/${id}`)}`, origin),
        303,
      );
    }

    const training = await getTraining(id);
    if (!training) return new NextResponse("Not found", { status: 404 });

    const canReview = await mayReviewField(session, training.programmeFieldId);
    if (training.reviewState !== "PUBLISHED" && training.createdById !== session.sub && !canReview) {
      return new NextResponse("Not found", { status: 404 });
    }

    const resource = training.resources.find((row) => row.id === resourceId);
    if (!resource) return new NextResponse("Not found", { status: 404 });

    const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
    const fileName = downloadFileName(resource.title, resource.mimeType);
    const signed = await createMaterialSignedUrl(resource.storageKey, wantsDownload ? fileName : undefined);
    if (!signed.ok) {
      log.warn({ event: "training.resource_link_failed", trainingId: id, resourceId });
      return NextResponse.json({ error: "That file is not available right now." }, { status: 503 });
    }

    /*
     * A bucket answers with an absolute URL; the database-backed store answers
     * with a path on this origin. `NextResponse.redirect` refuses a relative
     * target ("Please use only absolute URLs"), so that case is sent as a plain
     * Location header with the same status — the same rule the material route uses.
     */
    if (signed.url.startsWith("/")) {
      return new NextResponse(null, {
        status: 302,
        headers: { Location: signed.url, "Cache-Control": "no-store" },
      });
    }

    return NextResponse.redirect(signed.url, 303);
  } catch (error) {
    log.error({ event: "training.resource_failed", trainingId: id, resourceId, error: String(error) });
    return NextResponse.json({ error: "That file could not be opened." }, { status: 500 });
  }
}
