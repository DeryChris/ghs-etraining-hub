/**
 * Only same-origin, relative paths may follow sign-in. Anything else (absolute
 * URLs, protocol-relative `//host`, backslash tricks, sign-in loops) falls back.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(value)) return fallback;
  if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return fallback;
  return value;
}
