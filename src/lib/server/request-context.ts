import "server-only";
import { headers } from "next/headers";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
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
    };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

/** Stable identifier for per-connection limits when the IP cannot be determined. */
export async function clientAddress(): Promise<string> {
  const { ipAddress } = await requestContext();
  return ipAddress ?? "unknown";
}
