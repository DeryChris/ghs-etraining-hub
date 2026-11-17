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

export interface UploadTarget {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
}

/** A single-use upload slot. The browser PUTs the file straight to storage. */
export type UploadTargetResult = { ok: true; target: UploadTarget } | { ok: false; reason: string };

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

/**
 * Creates a signed upload slot for one object.
 *
 * Files never pass through the server: Vercel caps serverless request bodies well
 * below the 15 MB a PDF may legitimately be, and streaming bytes through an edge
 * function would waste the learner's metered data twice. The server still decides
 * the path, the allowed types and the size limit; storage enforces the token.
 */
export async function createMaterialUploadTarget(storageKey: string): Promise<UploadTargetResult> {
  const { data, error } = await getAdminClient().storage.from(MATERIAL_BUCKET).createSignedUploadUrl(storageKey);
  if (error || !data) return { ok: false, reason: error?.message ?? "Storage did not return an upload token" };
  return {
    ok: true,
    target: { bucket: MATERIAL_BUCKET, path: data.path, token: data.token, signedUrl: data.signedUrl },
  };
}

export interface StoredObject {
  sizeBytes: number | null;
  contentType: string | null;
}

/** Reads the object's stored metadata, which is the source of truth after an upload. */
export async function inspectMaterialObject(
  storageKey: string,
): Promise<{ ok: true; object: StoredObject } | { ok: false; reason: string }> {
  const { data, error } = await getAdminClient().storage.from(MATERIAL_BUCKET).info(storageKey);
  if (error || !data) return { ok: false, reason: error?.message ?? "Object not found" };
  return {
    ok: true,
    object: { sizeBytes: typeof data.size === "number" ? data.size : null, contentType: data.contentType ?? null },
  };
}

/** Used when a finalise step rejects the upload, so no orphan bytes are kept. */
export async function removeMaterialObject(storageKey: string): Promise<{ ok: boolean; reason?: string }> {
  const { error } = await getAdminClient().storage.from(MATERIAL_BUCKET).remove([storageKey]);
  return error ? { ok: false, reason: error.message } : { ok: true };
}
