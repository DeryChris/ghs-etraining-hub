import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { fileBlobs } from "@/db/schema";

/**
 * Files kept in Postgres, for a deployment with no object storage.
 *
 * Neon is a database. It has no file service, so "configure object storage" is not
 * advice somebody can act on at 11pm when a deck has to be attached to a training.
 * These five functions give the storage interface a backend that always exists: the
 * bytes go into `file_blobs`, the key stays the same, and every caller is unchanged.
 *
 * What this is not: a media server. Bytes pass through the application, so the
 * ceiling is the platform's request body limit (Vercel: about 4.5 MB), and a
 * database that fills with video is slow for everybody. Configure an
 * S3-compatible bucket and the interface switches back to direct uploads.
 */

export interface BlobHead {
  sizeBytes: number;
  mimeType: string | null;
}

export async function putBlob(
  storageKey: string,
  mimeType: string | null,
  bytes: Buffer,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await db
      .insert(fileBlobs)
      .values({ storageKey, mimeType, sizeBytes: bytes.length, bytes })
      .onConflictDoUpdate({
        target: fileBlobs.storageKey,
        set: { mimeType, sizeBytes: bytes.length, bytes },
      });
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file could not be stored." };
  }
}

export async function headBlob(storageKey: string): Promise<{ ok: true; head: BlobHead } | { ok: false; reason: string }> {
  try {
    const [row] = await db
      .select({ sizeBytes: fileBlobs.sizeBytes, mimeType: fileBlobs.mimeType })
      .from(fileBlobs)
      .where(eq(fileBlobs.storageKey, storageKey))
      .limit(1);
    if (!row) return { ok: false, reason: "The file has not arrived." };
    return { ok: true, head: row };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file could not be read." };
  }
}

export async function getBlob(
  storageKey: string,
  maxBytes: number,
): Promise<{ ok: true; body: Buffer; mimeType: string | null } | { ok: false; reason: string }> {
  try {
    const [row] = await db
      .select({ bytes: fileBlobs.bytes, mimeType: fileBlobs.mimeType, sizeBytes: fileBlobs.sizeBytes })
      .from(fileBlobs)
      .where(eq(fileBlobs.storageKey, storageKey))
      .limit(1);
    if (!row) return { ok: false, reason: "The file has not arrived." };
    if (row.sizeBytes > maxBytes) {
      return { ok: false, reason: `The file is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB reading limit.` };
    }
    return { ok: true, body: Buffer.from(row.bytes), mimeType: row.mimeType };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file could not be read." };
  }
}

export async function deleteBlob(storageKey: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await db.delete(fileBlobs).where(eq(fileBlobs.storageKey, storageKey));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file was not removed." };
  }
}

/** Total bytes held in the database — shown in settings so the ceiling is not a surprise. */
export async function blobUsage(): Promise<{ files: number; bytes: number }> {
  const [row] = await db
    .select({ files: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(${fileBlobs.sizeBytes}), 0)::bigint` })
    .from(fileBlobs);
  return { files: row?.files ?? 0, bytes: Number(row?.bytes ?? 0) };
}
