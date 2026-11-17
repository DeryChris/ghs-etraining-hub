import "server-only";

/**
 * Escapes the wildcards in a user-supplied search term before it is wrapped in
 * `%…%` for ILIKE. Without this a term containing `%` or `_` silently becomes a
 * pattern that matches far more than the person typed.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Trims and caps a search term so a pasted document cannot become a scan. */
export function normaliseSearch(value: string | undefined, max = 120): string {
  return (value ?? "").trim().slice(0, max);
}
