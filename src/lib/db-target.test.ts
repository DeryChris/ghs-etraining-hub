import { describe, expect, it } from "vitest";
import { connectionErrorCode, databaseTarget } from "./db-target";

describe("databaseTarget", () => {
  it("keeps the host and port and drops the credentials", () => {
    const target = databaseTarget(
      "postgresql://postgres.abc:s3cret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
    );
    expect(target).toEqual({
      host: "aws-0-eu-west-3.pooler.supabase.com",
      port: "6543",
      isSupabaseDirect: false,
    });
    expect(JSON.stringify(target)).not.toContain("s3cret");
  });

  it("defaults the port and recognises the direct Supabase host", () => {
    const target = databaseTarget(
      "postgresql://postgres:pw@db.cnrbtodbgiczblwvfvzq.supabase.co/postgres",
    );
    expect(target).toEqual({
      host: "db.cnrbtodbgiczblwvfvzq.supabase.co",
      port: "5432",
      isSupabaseDirect: true,
    });
  });

  it("returns null for a missing or unparseable url", () => {
    expect(databaseTarget(undefined)).toBeNull();
    expect(databaseTarget("")).toBeNull();
    expect(databaseTarget("not a url")).toBeNull();
  });
});

describe("connectionErrorCode", () => {
  it("reads the errno off a driver error", () => {
    expect(
      connectionErrorCode(
        Object.assign(new Error("write CONNECT_TIMEOUT"), {
          code: "CONNECT_TIMEOUT",
        }),
      ),
    ).toBe("CONNECT_TIMEOUT");
    expect(connectionErrorCode({ code: "28P01" })).toBe("28P01");
  });

  it("ignores anything without a string code", () => {
    expect(connectionErrorCode(new Error("boom"))).toBeUndefined();
    expect(connectionErrorCode(null)).toBeUndefined();
    expect(connectionErrorCode({ code: 42 })).toBeUndefined();
  });
});
