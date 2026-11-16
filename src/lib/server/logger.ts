import "server-only";
import { redactMetadata } from "@/lib/audit-hash";

export type LogLevel = "info" | "warn" | "error";

export interface LogFields {
  /** Stable, greppable event name, e.g. "material.completed". */
  event: string;
  requestId?: string | null;
  userId?: string | null;
  role?: string | null;
  route?: string | null;
  durationMs?: number;
  error?: unknown;
  [key: string]: unknown;
}

function serialiseError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 4).join(" | ") };
  }
  return { message: String(error) };
}

/**
 * One JSON line per event, which is what Vercel's log viewer and any log drain
 * (Datadog, BetterStack) can index. Free-text fields are PII-redacted on the way
 * out: message bodies, e-mail addresses and staff PINs never reach the log.
 */
export function logEvent(level: LogLevel, fields: LogFields): void {
  const { error, ...rest } = fields;
  const safe = redactMetadata(rest);
  const line = {
    level,
    time: new Date().toISOString(),
    ...safe,
    ...(error ? { error: serialiseError(error) } : {}),
  };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const log = {
  info: (fields: LogFields) => logEvent("info", fields),
  warn: (fields: LogFields) => logEvent("warn", fields),
  error: (fields: LogFields) => logEvent("error", fields),
};
