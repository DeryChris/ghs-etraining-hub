import { describe, expect, it } from "vitest";
import { planMigrationConnection } from "./connection-url";

const SUPABASE_SESSION = "postgresql://postgres.abcdefghij:pw@aws-0-eu-west-3.pooler.supabase.com:5432/postgres";

describe("planMigrationConnection", () => {
  it("asks node-postgres for libpq semantics when the URL says sslmode=require", () => {
    // The bug: since pg-connection-string 2.7, `require` means `verify-full`, so an
    // intercepted TLS chain fails migrations with SELF_SIGNED_CERT_IN_CHAIN.
    const plan = planMigrationConnection(`${SUPABASE_SESSION}?sslmode=require`);

    expect(plan.changed).toBe(true);
    expect(plan.tls.kind).toBe("encrypted-unverified");
    expect(plan.url).toBe(`${SUPABASE_SESSION}?sslmode=require&uselibpqcompat=true`);
  });

  it("appends with & when the URL already carries query parameters", () => {
    const plan = planMigrationConnection(`${SUPABASE_SESSION}?pgbouncer=true&sslmode=require`);

    expect(plan.url).toBe(`${SUPABASE_SESSION}?pgbouncer=true&sslmode=require&uselibpqcompat=true`);
  });

  it("normalises an upper-case sslmode so pg actually matches it", () => {
    const plan = planMigrationConnection(`${SUPABASE_SESSION}?sslmode=REQUIRE`);

    expect(plan.url).toBe(`${SUPABASE_SESSION}?sslmode=require&uselibpqcompat=true`);
  });

  it("never weakens sslmode=verify-full", () => {
    const raw = `${SUPABASE_SESSION}?sslmode=verify-full`;
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe(raw);
    expect(plan.tls.kind).toBe("verify-full");
  });

  it("never weakens a URL that supplies its own CA", () => {
    const raw = `${SUPABASE_SESSION}?sslmode=require&sslrootcert=/etc/ssl/corp-ca.pem`;
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe(raw);
    expect(plan.tls.kind).toBe("verify-full");
  });

  it("leaves a URL that already opted into libpq semantics alone", () => {
    const raw = `${SUPABASE_SESSION}?sslmode=require&uselibpqcompat=true`;
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe(raw);
    expect(plan.tls.kind).toBe("encrypted-unverified");
  });

  it("does not invent TLS for a self-hosted server that never asked for it", () => {
    const raw = "postgresql://ghs:secret@pg.internal.ghs.gov.gh:5432/app_db";
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe(raw);
    expect(plan.tls.kind).toBe("driver-default");
  });

  it("touches nothing for the local sandbox database", () => {
    const raw = "postgresql://postgres:postgres@127.0.0.1:5432/app_db?sslmode=require";
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe(raw);
    expect(plan.tls.kind).toBe("none");
  });

  it("leaves sslmode=disable alone", () => {
    const raw = `${SUPABASE_SESSION}?sslmode=disable`;
    const plan = planMigrationConnection(raw);

    expect(plan.changed).toBe(false);
    expect(plan.tls.kind).toBe("none");
  });

  it("keeps credentials that URL re-serialisation would mangle", () => {
    // Percent-encoded and special characters in the password must survive verbatim.
    const raw = "postgresql://postgres.ref:p%40ss%23w%2Frd!@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require";
    const plan = planMigrationConnection(raw);

    expect(plan.url).toBe(`${raw}&uselibpqcompat=true`);
  });

  it("passes an unparseable URL straight through", () => {
    const plan = planMigrationConnection("not-a-url");

    expect(plan.changed).toBe(false);
    expect(plan.url).toBe("not-a-url");
  });
});
