/**
 * Safe download names for controlled documents.
 *
 * The storage key is opaque (a UUID), so the filename a clinician sees must be
 * derived from the trusted title plus the *stored* MIME type — never from the
 * request, and never a hard-coded ".pdf" (a published MP4 or Markdown material
 * would otherwise arrive with the wrong extension).
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "txt",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
};

const MAX_TITLE_LENGTH = 80;

/** `formatMimeType` in src/lib/format.ts knows the same labels, by design. */
export function extensionForMime(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null;
  const normalised = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXTENSION_BY_MIME[normalised] ?? null;
}

/**
 * "IPC Core Protocol 2026" + application/pdf → "IPC_Core_Protocol_2026.pdf".
 * Unknown types keep the sanitised title and gain no extension, so nothing is
 * mislabelled.
 */
export function downloadFileName(title: string, mimeType: string | null | undefined): string {
  const base = title
    .replace(/[^\w.-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, MAX_TITLE_LENGTH);
  const safeBase = base.length > 0 ? base : "material";
  const extension = extensionForMime(mimeType);
  return extension ? `${safeBase}.${extension}` : safeBase;
}
