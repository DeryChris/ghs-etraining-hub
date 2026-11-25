import { describe, expect, it } from "vitest";
import { connectionErrorCode, databaseTarget } from "./db-target";

describe("databaseTarget", () => {
  it("keeps the host and port and drops the credentials", () => {
    const target = databaseTarget(
      "postgresql://neondb_owner:npg_s3cret@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(target).toEqual({
      host: "ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech",
      port: "5432",
    });
    expect(JSON.stringify(target)).not.toContain("s3cret");
  });

  it("defaults the port when the URL omits it", () => {
    const target = databaseTarget("postgresql://neondb_owner:pw@ep-local-456.eu-central-1.aws.neon.tech/neondb");
    expect(target).toEqual({
      host: "ep-local-456.eu-central-1.aws.neon.tech",
      port: "5432",
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
