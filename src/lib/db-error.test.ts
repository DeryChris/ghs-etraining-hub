import { describe, expect, it } from "vitest";
import { connectionProblem, isPooledHost, isSchemaError, schemaProblem } from "@/lib/db-error";

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

describe("schema failures are not connection failures", () => {
  it("reads a missing column as a migration problem, not a network one", () => {
    const error = Object.assign(new Error('column "grade" of relation "users" does not exist'), { code: "42703" });
    expect(isSchemaError(error)).toBe(true);
    const problem = schemaProblem(error);
    expect(problem.code).toBe("42703");
    expect(problem.detail).toBe('column "grade" of relation "users" does not exist');
    expect(problem.remedy).toMatch(/db:migrate/);
    // The classifier that answers for connections must not send anyone to
    // re-paste a connection string that is already correct.
    expect(connectionProblem(error).remedy).not.toMatch(/Neon → Connect/);
    expect(connectionProblem(error).remedy).toMatch(/db:migrate/);
  });

  it("prefers the sentence on `cause` over drizzle's truncated query", () => {
    const error = new Error(
      'Failed query: select "id", "ghs_staff_id", "email", "grade" from "users" limit $1',
      { cause: Object.assign(new Error('column "grade" of relation "users" does not exist'), { code: "42703" }) },
    );
    expect(schemaProblem(error).detail).toBe('column "grade" of relation "users" does not exist');
  });

  it("recognises the wording when the driver gives no code", () => {
    expect(isSchemaError(new Error('relation "complaint_messages" does not exist'))).toBe(true);
    expect(isSchemaError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }))).toBe(false);
  });
});
