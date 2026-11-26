import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage for controlled materials (docs/architecture.md §8).
 *
 * This used to be Supabase Storage. Now it is any S3-compatible bucket —
 * Neon Object Storage, AWS S3, Cloudflare R2, MinIO — configured entirely by
 * environment variables, because the point of leaving Supabase was to stop
 * depending on one vendor's all-in-one product.
 *
 * Files still never pass through the server: the browser PUTs straight to a
 * presigned URL. Vercel caps serverless request bodies well below the 15 MB a
 * PDF may legitimately be, so proxying bytes would be both slow and broken.
 */

const SIGNED_URL_TTL_SECONDS = 15 * 60;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

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
  try {
    const { client, bucket } = config();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Object was not removed" };
  }
}
