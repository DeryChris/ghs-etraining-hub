/**
 * Notification links are stored data, not trusted code. Only routes this app
 * actually serves are rendered as links; anything else is shown as plain text.
 */
const KNOWN_ROUTES: RegExp[] = [
  /^\/(?:library|notifications|analytics|messages|directorates)$/,
  /^\/directorates\/[0-9a-f-]{36}$/i,
  /^\/spaces\/[a-z0-9-]+$/,
  /^\/materials\/[0-9a-f-]{36}$/i,
];

export function safeAppLink(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.split("?")[0] ?? "";
  return KNOWN_ROUTES.some((pattern) => pattern.test(path)) ? url : null;
}
