import 'server-only';

// Simple in-memory rate limiter for Vercel serverless.
// In production, consider Upstash Redis or Vercel KV for distributed rate limiting.

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  key: string,
  { limit = 60, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: entry.resetTime };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
