import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/app-origin";
import { isUuid } from "@/lib/ids";
import { logAudit } from "@/lib/server/audit";
import { createMaterialSignedUrl } from "@/lib/server/file-storage";
import { getMaterialDetail } from "@/lib/server/learning-queries";
import { getSession } from "@/lib/server/session";

/**
 * Issues a 15-minute signed URL for a material's current file. The file never
 * passes through this app; the browser is redirected straight to storage.
 * Every issue is audited, because controlled documents leave the platform only this way.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const origin = appOrigin(request);

  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/materials/${id}`)}`, origin), 303);
  }

  const material = await getMaterialDetail(id, session.sub);
  if (!material) return new NextResponse("Not found", { status: 404 });

  const storageKey = material.version?.storageKey;
  if (!storageKey) {
    return NextResponse.redirect(new URL(`/materials/${id}?notice=no-file`, origin), 303);
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const fileName = `${material.material.title.replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`;
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

  return NextResponse.redirect(signed.url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
