/**
 * Notification links are stored data, not trusted code. Only routes this app
 * actually serves are rendered as links; anything else is shown as plain text.
 */
const KNOWN_ROUTES: RegExp[] = [
  /^\/(?:library|catalogue|trainings|notifications|dashboard|messages)$/,
  /^\/catalogue\/[A-Za-z0-9-]+$/,
  /^\/catalogue\/[A-Za-z0-9-]+\/[A-Za-z0-9-]+$/,
  /^\/trainings\/[0-9a-f-]{36}$/i,
  /^\/materials\/[0-9a-f-]{36}$/i,
];

export function safeAppLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0] ?? "";
  return KNOWN_ROUTES.some((pattern) => pattern.test(path)) ? url : null;
}

/** The catalogue URL for a programme area: /catalogue/PF-PH/PF-PH-03. */
export function areaHref(fieldCode: string, areaCode: string): string {
  return `/catalogue/${encodeURIComponent(fieldCode)}/${encodeURIComponent(areaCode)}`;
}

/** The catalogue URL for a programme field: /catalogue/PF-PH. */
export function fieldHref(fieldCode: string): string {
  return `/catalogue/${encodeURIComponent(fieldCode)}`;
}

/** Where a material lives, by the area it is filed under. */
export function materialAreaHref(fieldCode: string, areaCode: string): string {
  return areaHref(fieldCode, areaCode);
}
