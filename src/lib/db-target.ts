/**
 * Where the app is trying to reach the database, without the secrets.
 *
 * A connection failure is the one error a developer cannot debug from the UI:
 * the password must never reach the browser, but the host and port are the two
 * facts that say "wrong region" or "the pooled endpoint is down".
 * This strips the userinfo and query string so it is safe to print.
 */
export interface DatabaseTarget {
  host: string;
  port: string;
}

export function databaseTarget(url: string | undefined): DatabaseTarget | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
    return {
      host: parsed.hostname,
      port: parsed.port || "5432",
    };
  } catch {
    return null;
  }
}

/**
 * The libpq/postgres.js errno, which is more useful than the message: a
 * `CONNECT_TIMEOUT` is a network path, an `ENOTFOUND` is DNS, and a `28P01` is
 * the password. Never returns anything that could contain the password.
 */
export function connectionErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
