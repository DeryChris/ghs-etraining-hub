import { describe, expect, it } from "vitest";
import { connectionProblem, isPooledHost } from "@/lib/db-error";

describe("connectionProblem", () => {
  it("names DNS and refuses to blame the password", () => {
    const problem = connectionProblem(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }));
    expect(problem.code).toBe("ENOTFOUND");
    expect(problem.remedy).toMatch(/Neon → Connect/);
  });

  it("finds the errno on the cause, where postgres.js hides it", () => {
    const error = new Error("write CONNECT_TIMEOUT", {
      cause: Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }),
    });
    expect(connectionProblem(error).code).toBe("ETIMEDOUT");
  });

  it("maps a rejected password to its SQLSTATE", () => {
    const problem = connectionProblem(Object.assign(new Error("password authentication failed for user"), { code: "28P01" }));
    expect(problem.code).toBe("28P01");
    expect(problem.remedy).toMatch(/password/i);
  });

  it("reads the diagnosis out of the message when there is no code", () => {
    expect(connectionProblem(new Error('no pg_hba.conf entry for host "1.2.3.4"')).code).toBe("NO_PG_HBA");
    expect(connectionProblem(new Error("self-signed certificate in certificate chain")).code).toBe(
      "SELF_SIGNED_CERT_IN_CHAIN",
    );
  });

  it("always returns something actionable, even for an unknown failure", () => {
    const problem = connectionProblem(new Error("something else entirely"));
    expect(problem.code).toBe("UNKNOWN");
    expect(problem.remedy).toContain("DATABASE_URL");
    expect(connectionProblem(undefined).code).toBe("UNKNOWN");
  });

  it("never leaks the connection string", () => {
    const error = new Error("connect failed for postgresql://user:s3cret@ep-x-pooler.neon.tech/db");
    error.stack = "at postgresql://user:s3cret@ep-x-pooler.neon.tech/db";
    const problem = connectionProblem(error);
    expect(JSON.stringify(problem)).not.toContain("s3cret");
  });
});

describe("isPooledHost", () => {
  it("recognises the PgBouncer endpoint and nothing else", () => {
    expect(isPooledHost("ep-wispy-firefly-bg805qxg-pooler.c-9.eu-central-1.aws.neon.tech")).toBe(true);
    expect(isPooledHost("ep-wispy-firefly-bg805qxg.c-9.eu-central-1.aws.neon.tech")).toBe(false);
    expect(isPooledHost("localhost")).toBe(false);
  });
});
