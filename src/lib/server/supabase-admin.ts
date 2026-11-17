import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client, for the two things only the server may do: sign storage
 * URLs and provision auth logins. Returns null when the service key is not
 * configured, so callers can degrade to an instruction instead of throwing a
 * 500 at a staff member who cannot fix it.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (!cached) {
    cached = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return cached;
}
