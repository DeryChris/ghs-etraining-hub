import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface StorageAdapter {
  upload(params: { bucket: string; path: string; body: Buffer | Blob; contentType: string }): Promise<{ path: string; url: string }>;
  getSignedUrl(params: { bucket: string; path: string; expiresIn?: number }): Promise<{ url: string }>;
  delete(params: { bucket: string; path: string }): Promise<{ success: boolean }>;
}

export class SupabaseStorage implements StorageAdapter {
  async upload({ bucket, path, body, contentType }: {
    bucket: string;
    path: string;
    body: Buffer | Blob;
    contentType: string;
  }) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, body, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return { path: data.path, url: data.fullPath };
  }

  async getSignedUrl({ bucket, path, expiresIn = 900 }: {
    bucket: string;
    path: string;
    expiresIn?: number;
  }) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return { url: data.signedUrl };
  }

  async delete({ bucket, path }: { bucket: string; path: string }) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { success: true };
  }
}

export const storage: StorageAdapter = new SupabaseStorage();
