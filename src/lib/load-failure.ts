/**
 * Reading a failed load, in a module with no database import.
 *
 * This lives apart from `db-diagnosis` on purpose: the pages that show a retry
 * card import this classifier, and a page must never pull the database client in
 * just to decide what sentence to print. It is pure, so it tests without one too.
 */

/** PostgreSQL's class-42 codes: something this build names does not exist. */
const MISSING_OBJECT_CODES = new Set([
  "42P01", // undefined_table
  "42703", // undefined_column
  "42883", // undefined_function
  "42704", // undefined_object (enum value, type)
]);

export type LoadFailureKind = "drift" | "timeout" | "unreachable" | "error";

export interface LoadFailure {
  kind: LoadFailureKind;
  /** The database's own code, when it gave one. Safe to show: not a payload. */
  code?: string;
  /** What the page should tell the person reading it. */
  hint?: "drift" | "database" | "timeout";
}

/**
 * `drift` is the one worth naming: the schema answered "no such table/column",
 * which means this deployment and the database disagree, not that the network is
 * slow. Telling somebody to "try again" when a redeploy is the fix wastes their
 * afternoon.
 */
export function classifyLoadFailure(error: unknown): LoadFailure {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  const name = error instanceof Error ? error.name : "";

  if (code && MISSING_OBJECT_CODES.has(code)) {
    return { kind: "drift", code, hint: "drift" };
  }
  if (name === "DeadlineError") return { kind: "timeout", hint: "timeout" };

  const message = error instanceof Error ? error.message : String(error);
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection|terminated/i.test(message)) {
    return { kind: "unreachable", hint: "database" };
  }
  return { kind: "error" };
}
