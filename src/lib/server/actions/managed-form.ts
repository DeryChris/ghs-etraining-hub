import { redirect } from "next/navigation";

/*
 * The two administration surfaces are plain HTML forms posting to Server
 * Actions: they work with JavaScript off, they survive a slow connection, and
 * every message is a URL the user can reload. This module is the whole of the
 * feedback mechanism — go back to the page with a sentence, or with an error.
 */

export type ManagedNotice = { notice?: string; error?: string };

/** Redirect back to a page with one user-facing sentence. Never returns. */
export function backTo(path: string, params: ManagedNotice = {}): never {
  const search = new URLSearchParams();
  if (params.notice) search.set("notice", params.notice);
  if (params.error) search.set("error", params.error);
  const suffix = search.toString();
  redirect(suffix ? `${path}?${suffix}` : path);
}

/**
 * Turns a database error into something an administrator can act on. The two
 * codes that actually happen here are a duplicate name/code (23505) and a row
 * still referenced by something else (23503).
 */
export function failureMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string }).code;
  if (code === "23505") return "That name or code is already used here. Choose a different one.";
  if (code === "23503") return "Something else still refers to this record. Move or remove that first.";
  if (code === "23502") return "A required value was missing. Check the form and try again.";
  return fallback;
}
