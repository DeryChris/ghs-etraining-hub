import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Private bucket for controlled materials (docs/architecture.md §8). */
export const MATERIAL_BUCKET = "ghs-materials";
const SIGNED_URL_TTL_SECONDS = 15 * 60;

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Storage is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

export type SignedUrlResult = { ok: true; url: string } | { ok: false; reason: string };

/**
 * Short-lived access to a private object. The service key stays on the server;
 * callers receive only the time-limited URL.
 */
export async function createMaterialSignedUrl(storageKey: string, downloadName?: string): Promise<SignedUrlResult> {
  const { data, error } = await getAdminClient()
    .storage.from(MATERIAL_BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_TTL_SECONDS, downloadName ? { download: downloadName } : undefined);
  if (error || !data) return { ok: false, reason: error?.message ?? "No URL was returned" };
  return { ok: true, url: data.signedUrl };
}
