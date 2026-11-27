import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/ids";
import { previewKindFor } from "@/lib/ghs-constants";
import { readMaterialObject } from "@/lib/server/file-storage";
import { log } from "@/lib/server/logger";
import { readOfficePreview, type OfficePreview } from "@/lib/server/office-preview";
import { mayReviewField } from "@/lib/server/rbac";
import { getSession } from "@/lib/server/session";
import { getTraining } from "@/lib/server/training-queries";

/**
 * The reading view of a Word, PowerPoint, Excel or text attachment.
 *
 * The browser cannot render those formats, so the server reads the bytes and
 * answers with the text, slides or tables. PDF, image, video and audio never come
 * here: the viewer points the element straight at the file route and the browser
 * does the work.
 *
 * The response is a small JSON payload rather than a rendered page, because the
 * viewer is already open when it is asked for — a panel inside the library must
 * not navigate to show a slide deck.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; resourceId: string }> },
) {
  const { id, resourceId } = await context.params;

  if (!isUuid(id) || !isUuid(resourceId)) {
    return NextResponse.json({ ok: false, error: "That file could not be found." }, { status: 404 });
  }

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Sign in again to read this file." }, { status: 401 });

    const training = await getTraining(id);
    if (!training) return NextResponse.json({ ok: false, error: "That file could not be found." }, { status: 404 });

    const canReview = await mayReviewField(session, training.programmeFieldId);
    if (training.reviewState !== "PUBLISHED" && training.createdById !== session.sub && !canReview) {
      return NextResponse.json({ ok: false, error: "That file could not be found." }, { status: 404 });
    }

    const resource = training.resources.find((row) => row.id === resourceId);
    if (!resource) return NextResponse.json({ ok: false, error: "That file could not be found." }, { status: 404 });

    const kind = previewKindFor(resource.mimeType);
    const body: {
      ok: true;
      kind: string;
      office?: OfficePreview | null;
      text?: string | null;
      error?: string | null;
    } = { ok: true, kind, office: null, text: null, error: null };

    if (kind === "text") {
      const cap = 2 * 1024 * 1024;
      const object = await readMaterialObject(resource.storageKey, cap);
      if (!object.ok) body.error = "The stored file could not be read just now. The download still works.";
      else body.text = object.body.toString("utf8");
    } else if (kind === "docx" || kind === "pptx" || kind === "xlsx") {
      const object = await readMaterialObject(resource.storageKey, 25 * 1024 * 1024);
      if (!object.ok) {
        body.error = "The stored file could not be read just now. The download still works.";
      } else {
        try {
          body.office = readOfficePreview(object.body, resource.mimeType ?? "");
        } catch {
          body.error =
            "This file could not be read here — it may be corrupt, or saved in a format this reader does not open. Download it to read.";
        }
      }
    }

    return NextResponse.json(body, { headers: { "cache-control": "private, max-age=60" } });
  } catch (error) {
    log.error({ event: "training.resource_preview_failed", trainingId: id, resourceId, error: String(error) });
    return NextResponse.json({ ok: false, error: "That file could not be read just now." }, { status: 500 });
  }
}
