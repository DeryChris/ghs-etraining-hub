import "server-only";
import { headers } from "next/headers";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/** The id `src/proxy.ts` mints for this request, or null outside a request. */
export async function currentRequestId(): Promise<string | null> {
  try {
    return (await headers()).get("x-request-id");
  } catch {
    return null;
  }
}

/**
 * Client context for auditing and rate limiting. Returns nulls outside a request
 * (seeds, tests, background jobs) instead of throwing.
 */
export async function requestContext(): Promise<RequestContext> {
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    return {
      ipAddress: forwarded || requestHeaders.get("x-real-ip") || null,
      userAgent: requestHeaders.get("user-agent"),
      requestId: requestHeaders.get("x-request-id"),
    };
  } catch {
    return { ipAddress: null, userAgent: null, requestId: null };
  }
}

/** Stable identifier for per-connection limits when the IP cannot be determined. */
export async function clientAddress(): Promise<string> {
  const { ipAddress } = await requestContext();
  return ipAddress ?? "unknown";
}
