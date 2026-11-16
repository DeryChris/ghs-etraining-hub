/**
 * The origin to show in copy ("verify at …"). Server code has no reliable request
 * origin behind a proxy, so the configured public URL wins; when it is missing the
 * caller renders a relative path instead of a wrong hostname.
 */
export function displayOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return "";
  try {
    return new URL(configured).origin;
  } catch {
    return "";
  }
}
