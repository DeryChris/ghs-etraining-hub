import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/app-origin";
import { downloadFileName } from "@/lib/file-name";
import { isUuid } from "@/lib/ids";
import { can } from "@/lib/rbac/capabilities";
import { logAudit } from "@/lib/server/audit";
import { createMaterialSignedUrl } from "@/lib/server/file-storage";
import { getMaterialDetail } from "@/lib/server/learning-queries";
import { log } from "@/lib/server/logger";
import { currentRequestId } from "@/lib/server/request-context";
import { getSession } from "@/lib/server/session";

/**
 * Issues a 15-minute signed URL for a material's current file. The file never
 * passes through this app; the browser is redirected straight to storage.
 * Every issue is audited, because controlled documents leave the platform only this way.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = appOrigin(request);

  try {
    return await issueFile(request, id, origin);
  } catch (error) {
    // A failed lookup or audit write must not surface a stack trace to the
    // learner; the page shows a plain notice and the log keeps the detail.
    log.error({ event: "material.file_failed", requestId: await currentRequestId(), materialId: id, error });
    return NextResponse.redirect(new URL(`/materials/${id}?notice=file-unavailable`, origin), 303);
  }
}

async function issueFile(request: NextRequest, id: string, origin: string) {
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/materials/${id}`)}`, origin), 303);
  }

  if (!can(session.role, "material.download")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const material = await getMaterialDetail(id, session);
  if (!material) return new NextResponse("Not found", { status: 404 });

  const storageKey = material.version?.storageKey;
  if (!storageKey) {
    return NextResponse.redirect(new URL(`/materials/${id}?notice=no-file`, origin), 303);
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  // The name comes from the trusted title plus the stored MIME type, so a video
  // does not arrive as "Title.pdf".
  const fileName = downloadFileName(material.material.title, material.version?.mimeType);
  const signed = await createMaterialSignedUrl(storageKey, download ? fileName : undefined);
  if (!signed.ok) {
    return NextResponse.redirect(new URL(`/materials/${id}?notice=file-unavailable`, origin), 303);
  }

  await logAudit({
    actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
    action: "MATERIAL_FILE_ISSUED",
    entity: "Material",
    entityId: id,
    metadata: { versionId: material.version?.id ?? null, download },
  });

  log.info({
    event: "material.file_issued",
    requestId: await currentRequestId(),
    userId: session.sub,
    role: session.role,
    materialId: id,
    download,
  });

  return NextResponse.redirect(signed.url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
