import { z } from "zod";

/**
 * One error vocabulary for the whole app (docs/architecture.md §4).
 *
 * A thrown error is either deliberate (`AppError`) or a bug. Deliberate errors
 * carry a code for logs, an HTTP status for route handlers, and a message that is
 * safe and useful to show a health worker. Anything else is reported as the
 * generic message — stack traces, SQL and user ids never reach the browser.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL";

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
  INTERNAL: 500,
};

const DEFAULT_MESSAGE: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: "Your session has ended. Sign in again to continue.",
  FORBIDDEN: "Your role does not allow this action.",
  NOT_FOUND: "We could not find that. It may have been moved or archived.",
  CONFLICT: "Someone else changed this while you were working. Reload and try again.",
  VALIDATION_FAILED: "Some of the details need correcting.",
  RATE_LIMITED: "Too many attempts in a short time. Try again in a few minutes.",
  UPSTREAM_UNAVAILABLE: "That service is not responding right now. Try again in a moment.",
  INTERNAL: "Something went wrong on our side. Nothing was saved.",
};

export interface AppErrorOptions {
  /** Field-level messages from a zod parse, shown next to the input. */
  details?: Record<string, string>;
  /** The original error, kept for the server log only — never serialised to the client. */
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly publicMessage: string;
  readonly details: Record<string, string> | undefined;

  constructor(code: AppErrorCode, publicMessage?: string, options: AppErrorOptions = {}) {
    super(publicMessage ?? DEFAULT_MESSAGE[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.publicMessage = publicMessage ?? DEFAULT_MESSAGE[code];
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Thrown by route handlers and actions that want a specific status and code. */
export function appError(code: AppErrorCode, publicMessage?: string, options?: AppErrorOptions): AppError {
  return new AppError(code, publicMessage, options);
}

/** zod → `{ field: message }`, first message per field wins. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.length ? issue.path.join(".") : "form";
    if (!(field in fields)) fields[field] = issue.message;
  }
  return fields;
}

/**
 * `AppError` messages are written for the reader; anything else collapses to the
 * generic line so an exception text (table names, host names) cannot leak.
 */
export function publicMessageOf(error: unknown): string {
  return isAppError(error) ? error.publicMessage : DEFAULT_MESSAGE.INTERNAL;
}

export function statusOf(error: unknown): number {
  return isAppError(error) ? error.status : STATUS.INTERNAL;
}

export function codeOf(error: unknown): AppErrorCode {
  return isAppError(error) ? error.code : "INTERNAL";
}

export function detailsOf(error: unknown): Record<string, string> | undefined {
  return isAppError(error) ? error.details : undefined;
}
