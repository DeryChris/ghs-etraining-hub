import 'server-only';

import { cookies } from "next/headers";

export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

export function validateCsrfToken(token: string): boolean {
  const cookieStore = cookies();
  const stored = cookieStore.get("csrf_token")?.value;
  if (!stored || stored !== token) return false;
  return true;
}
