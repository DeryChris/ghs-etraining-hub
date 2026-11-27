/**
 * Builds the response saved when an administrator resets access. The generated
 * password is deliberately not an argument: it must only be returned once to
 * the administrator, never written into complaint text.
 */
export function accessResetResponse(note?: string | null): string {
  const parts = [
    note?.trim(),
    "Access reset. The temporary password is not included in this answer; the administrator will provide it separately. Sign in with it and change it straight away.",
  ].filter((part): part is string => Boolean(part));

  return parts.join("\n\n");
}

/**
 * Redacts credentials written by older access-reset flows before a response is
 * returned by the public Staff-ID status lookup. Keep this at the read boundary
 * even after the data migration, so a later accidental write cannot disclose a
 * password through the unauthenticated status page.
 */
export function redactLegacyTemporaryPassword(response: string | null): string | null {
  if (response === null) return null;

  return response.replace(
    /temporary\s+password\s*:\s*[^\s.,;]+/gi,
    "Temporary password: [provided separately]",
  );
}
