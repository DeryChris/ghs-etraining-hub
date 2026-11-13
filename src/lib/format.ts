const ACCRA_TZ = "Africa/Accra";

export function formatDateTime(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GH", {
    timeZone: ACCRA_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...opts,
  }).format(d);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GH", {
    timeZone: ACCRA_TZ,
    day: "2-digit",
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

export function formatCredits(cpdCreditsX10: number | null | undefined): string {
  if (!cpdCreditsX10 && cpdCreditsX10 !== 0) return "0 pts";
  return `${(cpdCreditsX10 / 10).toFixed(1)} pts`;
}

export function maskStaffPin(pin: string): string {
  return pin.replace(/^GHS-(\d{2})\d{4}$/, "GHS-$1****");
}
