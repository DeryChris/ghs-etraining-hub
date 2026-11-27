import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { signFileToken } from "@/lib/server/file-token";

/**
 * Where uploaded files live (docs/architecture.md §8).
 *
 * Two backends, one interface:
 *
 *  - **S3-compatible bucket** (Neon Object Storage, AWS S3, Cloudflare R2, MinIO).
 *    Configured by environment variables. The browser PUTs straight to a presigned
 *    URL, so a 250 MB video never touches this server.
 *  - **The database** (`blob-store.ts`). Used when no bucket is configured, because
 *    Neon is a database and has no file service: leaving uploads broken until
 *    somebody buys storage is not a deployment option. The cost is that bytes pass
 *    through the application, so the ceiling is the platform's request body limit
 *    (Vercel: about 4.5 MB — `STORAGE_DB_MAX_MB` makes it explicit).
 *
 * Callers do not know which is in use. `storageBackend()` exists for the pages that
 * need to tell people the truth about the limit they are about to hit.
 */

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export type StorageBackend = "s3" | "database";

function s3Configured(): boolean {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

/** Which backend this deployment will actually use. */
export function storageBackend(): StorageBackend {
  return s3Configured() ? "s3" : "database";
}

/**
 * The largest single file this deployment can accept, and the sentence that
 * explains it. Per-family limits still apply on top; this is the hard ceiling.
 */
export function storageCeiling(): { bytes: number; detail: string } {
  if (storageBackend() === "s3") {
    return { bytes: Number.MAX_SAFE_INTEGER, detail: "Files go straight to the storage bucket." };
  }
  const megabytes = Number(process.env.STORAGE_DB_MAX_MB ?? 4);
  const safe = Number.isFinite(megabytes) && megabytes >= 1 ? Math.min(megabytes, 4) : 4;
  return {
    bytes: safe * 1024 * 1024,
    detail: `This deployment has no file bucket configured, so files are stored in the database and pass through the app server, which accepts up to ${safe} MB per request. Add S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY to raise the limit to 250 MB.`,
  };
}

/** Private bucket for controlled materials. Overridable per environment. */
export const MATERIAL_BUCKET = process.env.S3_BUCKET ?? "ghs-materials";

interface StorageConfig {
  client: S3Client;
  bucket: string;
}

const globalForStorage = globalThis as unknown as { __ghsS3?: StorageConfig };

function config(): StorageConfig {
  if (globalForStorage.__ghsS3) return globalForStorage.__ghsS3;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Object storage is not configured: set S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (see .env.example).",
    );
  }

  const client = new S3Client({
    region: process.env.S3_REGION ?? "eu-central-1",
    endpoint,
    // Neon Object Storage and most non-AWS providers serve buckets path-style.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: { accessKeyId, secretAccessKey },
    // Presigned URLs must not carry SDK checksums: the browser's PUT does not
    // know about them, and the signature would not match.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const built: StorageConfig = { client, bucket: MATERIAL_BUCKET };
  globalForStorage.__ghsS3 = built;
  return built;
}

export type SignedUrlResult = { ok: true; url: string } | { ok: false; reason: string };

export interface UploadTarget {
  bucket: string;
  path: string;
  /** Unused with S3 — kept so callers do not depend on the storage vendor. */
  token: string;
  signedUrl: string;
}

/** A single-use upload slot. The browser PUTs the file straight to storage. */
export type UploadTargetResult = { ok: true; target: UploadTarget } | { ok: false; reason: string };

/**
 * Short-lived access to a private object. The storage credentials stay on the
 * server; callers receive only the time-limited URL.
 */
export async function createMaterialSignedUrl(storageKey: string, downloadName?: string): Promise<SignedUrlResult> {
  if (storageBackend() === "database") {
    try {
      const token = signFileToken({
        purpose: "get",
        key: storageKey,
        ttlSeconds: SIGNED_URL_TTL_SECONDS,
        name: downloadName,
      });
      // Relative on purpose: the route that redirects here turns it into a URL on
      // the origin the request actually arrived at.
      return { ok: true, url: `/api/storage/file/${token}` };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Storage did not return a URL" };
    }
  }
  try {
    const { client, bucket } = config();
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        ...(downloadName
          ? { ResponseContentDisposition: `attachment; filename="${downloadName.replace(/["\\]/g, "")}"` }
          : {}),
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
    return { ok: true, url };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Storage did not return a URL" };
  }
}

/**
 * Creates a signed upload slot for one object. The server still decides the
 * key, the allowed types and the size limit; the signature enforces the key and
 * the expiry.
 */
export async function createMaterialUploadTarget(storageKey: string): Promise<UploadTargetResult> {
  if (storageBackend() === "database") {
    try {
      const token = signFileToken({ purpose: "put", key: storageKey, ttlSeconds: UPLOAD_URL_TTL_SECONDS });
      return {
        ok: true,
        target: { bucket: "database", path: storageKey, token, signedUrl: `/api/storage/upload/${token}` },
      };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "Storage did not return an upload URL" };
    }
  }
  try {
    const { client, bucket } = config();
    const signedUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: storageKey }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );
    return { ok: true, target: { bucket, path: storageKey, token: "", signedUrl } };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Storage did not return an upload URL" };
  }
}

/**
 * Writes bytes that are already in this process.
 *
 * Only the small, server-side uploads use this — a training's cover picture,
 * which is capped far below the request limit. Everything else uses a presigned
 * slot so the bytes never pass through the application.
 */
export async function putMaterialObject(
  storageKey: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (storageBackend() === "database") {
    const { putBlob } = await import("./blob-store");
    return putBlob(storageKey, contentType, bytes);
  }
  try {
    const { client, bucket } = config();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: bytes, ContentType: contentType }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file could not be stored." };
  }
}

/**
 * Reads an object's bytes on the server.
 *
 * Only the office reader uses this: PDFs, images and video are handed to the
 * browser as a signed URL so the bytes never pass through the function. A .pptx
 * has to be opened here because the browser cannot render it — and the read is
 * capped, because a 200 MB upload must not become a 200 MB allocation in a
 * serverless function.
 */
export async function readMaterialObject(
  storageKey: string,
  maxBytes: number,
): Promise<{ ok: true; body: Buffer } | { ok: false; reason: string }> {
  if (storageBackend() === "database") {
    const { getBlob } = await import("./blob-store");
    const stored = await getBlob(storageKey, maxBytes);
    if (!stored.ok) return { ok: false, reason: stored.reason };
    return { ok: true, body: stored.body };
  }
  try {
    const { client, bucket } = config();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (typeof head.ContentLength === "number" && head.ContentLength > maxBytes) {
      return { ok: false, reason: `The file is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB reading limit.` };
    }
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
    if (!object.Body) return { ok: false, reason: "The file has no contents." };
    const bytes = await object.Body.transformToByteArray();
    return { ok: true, body: Buffer.from(bytes) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "The file could not be read." };
  }
}

export interface StoredObject {
  sizeBytes: number | null;
  contentType: string | null;
}

/** Reads the object's stored metadata, which is the source of truth after an upload. */
export async function inspectMaterialObject(
  storageKey: string,
): Promise<{ ok: true; object: StoredObject } | { ok: false; reason: string }> {
  if (storageBackend() === "database") {
    const { headBlob } = await import("./blob-store");
    const stored = await headBlob(storageKey);
    if (!stored.ok) return { ok: false, reason: stored.reason };
    return { ok: true, object: { sizeBytes: stored.head.sizeBytes, contentType: stored.head.mimeType } };
  }
  try {
    const { client, bucket } = config();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
    return {
      ok: true,
      object: {
        sizeBytes: typeof head.ContentLength === "number" ? head.ContentLength : null,
        contentType: head.ContentType ?? null,
      },
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Object not found" };
  }
}

/** Used when a finalise step rejects the upload, so no orphan bytes are kept. */
export async function removeMaterialObject(storageKey: string): Promise<{ ok: boolean; reason?: string }> {
  if (storageBackend() === "database") {
    const { deleteBlob } = await import("./blob-store");
    const removed = await deleteBlob(storageKey);
    return removed.ok ? { ok: true } : { ok: false, reason: removed.reason };
  }
  try {
    const { client, bucket } = config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Object was not removed" };
  }
}
