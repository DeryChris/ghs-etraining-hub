import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived, signed references to one stored file.
 *
 * Object storage hands out a presigned URL and enforces it itself. The database
 * backend has no such thing, so the application does the same job: a token names
 * the object, says what may be done with it (`put` once, `get` for a while) and
 * when it stops being true, signed with the session secret. Nothing else in the
 * URL is trusted — not the key, not the file name, not the type.
 */
export type FileTokenPurpose = "put" | "get";

interface FileTokenPayload {
  p: FileTokenPurpose;
  k: string;
  e: number;
  n?: string;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set, so file links cannot be signed.");
  return value;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signFileToken(input: { purpose: FileTokenPurpose; key: string; ttlSeconds: number; name?: string }): string {
  const payload: FileTokenPayload = {
    p: input.purpose,
    k: input.key,
    e: Date.now() + input.ttlSeconds * 1000,
    ...(input.name ? { n: input.name } : {}),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyFileToken(token: string, purpose: FileTokenPurpose): FileTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as FileTokenPayload;
    if (payload.p !== purpose) return null;
    if (typeof payload.e !== "number" || payload.e < Date.now()) return null;
    if (typeof payload.k !== "string" || payload.k.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}
