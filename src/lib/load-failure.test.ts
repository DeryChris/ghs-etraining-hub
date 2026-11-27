import { describe, expect, it } from "vitest";
import { classifyLoadFailure } from "@/lib/load-failure";

describe("classifying a failed load", () => {
  it("names a missing column even when the driver error is wrapped", () => {
    // Drizzle re-throws its own Error and hangs the Postgres error under `cause`.
    const driver = Object.assign(new Error('column "image_storage_key" does not exist'), { code: "42703" });
    const wrapped = new Error('Failed query: select "image_storage_key" from "training_sessions"', { cause: driver });
    expect(classifyLoadFailure(wrapped)).toEqual({ kind: "drift", code: "42703", hint: "drift" });
  });

  it("reads a missing table straight off the error", () => {
    const error = Object.assign(new Error('relation "training_comments" does not exist'), { code: "42P01" });
    expect(classifyLoadFailure(error).kind).toBe("drift");
  });

  it("recognises the page deadline", () => {
    const deadline = Object.assign(new Error("timed out"), { name: "DeadlineError" });
    expect(classifyLoadFailure(deadline)).toEqual({ kind: "timeout", hint: "timeout" });
  });

  it("recognises a database that will not answer", () => {
    const refused = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    expect(classifyLoadFailure(refused)).toEqual({ kind: "unreachable", hint: "database" });
  });

  it("falls back to a plain error", () => {
    expect(classifyLoadFailure(new Error("boom"))).toEqual({ kind: "error" });
    expect(classifyLoadFailure("boom")).toEqual({ kind: "error" });
  });
});
