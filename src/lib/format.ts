/**
 * Display formatting for the training library. Everything is shown in Africa/Accra time, 24-hour
 * clock, with the en-GB conventions the UI copy uses (docs/ui-ux.md §5).
 */
const ACCRA_TZ = "Africa/Accra";

export function formatDateTime(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
    ...opts,
  }).format(d);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  const sizes = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < sizes.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h} h ${m} m`;
  return `${m} m`;
}

/** Friendly file-type label for a stored MIME type, e.g. "PDF document". */
export function formatMimeType(mime: string | null | undefined): string {
  const labels: Record<string, string> = {
    "application/pdf": "PDF document",
    "text/markdown": "Markdown document",
    "video/mp4": "MP4 video",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image",
  };
  if (!mime) return "Document";
  return labels[mime] ?? "Document";
}

export function maskStaffPin(pin: string): string {
  return pin.replace(/^GHS-(\d{2})\d{4}$/, "GHS-$1****");
}
