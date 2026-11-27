import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AppError, appError, codeOf, detailsOf, isAppError, publicMessageOf, statusOf, toFieldErrors } from "./errors";

describe("AppError", () => {
  it("maps each code to its status and a readable default", () => {
    expect(appError("FORBIDDEN").status).toBe(403);
    expect(appError("NOT_FOUND").status).toBe(404);
    expect(appError("RATE_LIMITED").status).toBe(429);
    expect(appError("UPSTREAM_UNAVAILABLE").status).toBe(503);
    expect(appError("NOT_FOUND").publicMessage).toContain("could not find");
  });

  it("keeps a caller-supplied message and cause for the log", () => {
    const cause = new Error("relation \"users\" does not exist");
    const error = new AppError("UPSTREAM_UNAVAILABLE", "The library is temporarily unavailable.", { cause });
    expect(error.publicMessage).toBe("The library is temporarily unavailable.");
    expect(error.cause).toBe(cause);
  });

  it("never exposes an internal message for an unknown throw", () => {
    const leaky = new Error("password authentication failed for user \"postgres\"");
    expect(publicMessageOf(leaky)).not.toContain("postgres");
    expect(publicMessageOf(leaky)).toBe("Something went wrong on our side. Nothing was saved.");
    expect(statusOf(leaky)).toBe(500);
    expect(codeOf(leaky)).toBe("INTERNAL");
  });

  it("recognises deliberate errors", () => {
    expect(isAppError(appError("CONFLICT"))).toBe(true);
    expect(isAppError(new Error("nope"))).toBe(false);
    expect(detailsOf(appError("VALIDATION_FAILED", undefined, { details: { title: "Too short" } }))).toEqual({
      title: "Too short",
    });
  });
});

describe("toFieldErrors", () => {
  it("returns the first message per field", () => {
    const schema = z
      .object({
        title: z.string().min(3, "Give the material a title of at least 3 characters."),
        programmeAreaId: z.string().uuid("Choose a programme area."),
      })
      .strict();

    const parsed = schema.safeParse({ title: "ab", programmeAreaId: "not-a-uuid" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(toFieldErrors(parsed.error)).toEqual({
      title: "Give the material a title of at least 3 characters.",
      programmeAreaId: "Choose a programme area.",
    });
  });

  it("names root issues as `form`", () => {
    const parsed = z.object({ a: z.string() }).strict().safeParse({ a: "x", b: 1 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(Object.keys(toFieldErrors(parsed.error))).toContain("form");
  });
});
