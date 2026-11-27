import { NextResponse, type NextRequest } from "next/server";
import { verifyFileToken } from "@/lib/server/file-token";

/**
 * Serves a file held in the database to a browser that was given a signed link.
 *
 * The link comes from `createMaterialSignedUrl`, which is only called after the
 * session and role checks in `/api/materials/[id]/file`. Signed links live for
 * fifteen minutes, are bound to one key and purpose, and carry the download name
 * inside the signature — so this route serves what the server already agreed to,
 * and nothing else.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const payload = verifyFileToken(token, "get");
  if (!payload) {
    return NextResponse.json({ error: "This link has expired. Open the material again." }, { status: 403 });
  }

  const { getBlob } = await import("@/lib/server/blob-store");
  // Bounded like every other read: a stored file is not a licence to allocate the
  // whole thing in a function, and the cap is the largest family limit.
  const stored = await getBlob(payload.k, 260 * 1024 * 1024);
  if (!stored.ok) {
    return NextResponse.json({ error: "The file could not be read." }, { status: 404 });
  }

  const headers = new Headers({
    "content-type": stored.mimeType ?? "application/octet-stream",
    "content-length": String(stored.body.length),
    // Private, short-lived: the same bytes are behind a session, so no shared
    // cache should hold them.
    "cache-control": "private, max-age=300, no-transform",
    "x-content-type-options": "nosniff",
  });

  if (payload.n) {
    headers.set("content-disposition", `attachment; filename="${payload.n.replace(/["\\]/g, "")}"`);
  }

  return new NextResponse(new Uint8Array(stored.body), { status: 200, headers });
}
