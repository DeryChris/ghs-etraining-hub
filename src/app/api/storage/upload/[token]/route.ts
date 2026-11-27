import { NextResponse, type NextRequest } from "next/server";
import { checkUpload } from "@/lib/material-workflow";
import { log } from "@/lib/server/logger";
import { storageCeiling } from "@/lib/server/file-storage";
import { verifyFileToken } from "@/lib/server/file-token";

/**
 * The upload endpoint for deployments with no object storage.
 *
 * The browser is given a signed one-purpose URL by `requestUploadAction` and PUTs
 * the file here; the bytes land in `file_blobs` under the key the server chose. The
 * token is the only authority: the key, the expiry and the intent are inside it, and
 * the signature is the session secret.
 *
 * Route handlers are not server actions, so the session cookie is not consulted —
 * that is the point. The token was issued to a signed-in person after the role
 * check, cannot be replayed after it expires, and can only write the one key.
 */
export async function PUT(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const payload = verifyFileToken(token, "put");
  if (!payload) {
    return NextResponse.json({ error: "This upload link has expired. Try again from the page." }, { status: 403 });
  }

  const ceiling = storageCeiling();
  const declared = request.headers.get("content-type") ?? "application/octet-stream";
  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredSize) && declaredSize > ceiling.bytes) {
    return NextResponse.json({ error: ceiling.detail }, { status: 413 });
  }

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "The upload was empty." }, { status: 400 });
  }
  if (bytes.length > ceiling.bytes) {
    return NextResponse.json({ error: ceiling.detail }, { status: 413 });
  }

  // The same allowlist the material workflow uses, checked again on arrival: the
  // browser's content-type header is a claim, and this is where it stops being one.
  const check = checkUpload(declared, bytes.length);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 415 });
  }

  const { headBlob, putBlob, deleteBlob } = await import("@/lib/server/blob-store");
  const existing = await headBlob(payload.k);
  if (existing.ok) {
    // A slot is written once. Replaying it must not overwrite a file that is
    // already recorded against a version.
    return NextResponse.json({ error: "This upload link has already been used." }, { status: 409 });
  }

  const stored = await putBlob(payload.k, declared, bytes);
  if (!stored.ok) {
    log.error({ event: "file_blob.write_failed", storageKey: payload.k, reason: stored.reason });
    return NextResponse.json({ error: "The file could not be stored. Try again in a moment." }, { status: 500 });
  }

  const { inspectMaterialObject } = await import("@/lib/server/file-storage");
  const inspected = await inspectMaterialObject(payload.k);
  if (!inspected.ok || (inspected.object.sizeBytes ?? 0) !== bytes.length) {
    await deleteBlob(payload.k);
    return NextResponse.json({ error: "The file did not store correctly. Try again." }, { status: 500 });
  }

  log.info({ event: "file_blob.stored", storageKey: payload.k, sizeBytes: bytes.length, mimeType: declared });
  return NextResponse.json({ ok: true, sizeBytes: bytes.length, contentType: declared });
}
