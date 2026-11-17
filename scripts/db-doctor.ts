import "dotenv/config";
import { lookup } from "node:dns/promises";
import { Pool } from "pg";
import postgres from "postgres";
import { planMigrationConnection } from "../src/db/connection-url";

/*
 * `npm run db:doctor` — one command that says why the database tools cannot
 * reach the database, and what to change.
 *
 * It exists because the failures that cost the most time are invisible in the
 * raw errors: a Supabase hostname that no longer resolves on IPv4 (the direct
 * `db.<ref>.supabase.co` host is IPv6-only now), a transaction pooler URL
 * handed to drizzle-kit, which cannot run DDL, and a certificate chain that
 * Node refuses (`SELF_SIGNED_CERT_IN_CHAIN`) on a machine whose TLS is
 * intercepted. All three look like "connection failed" until you read the docs.
 *
 * It connects twice on purpose: with `pg` (exactly what drizzle-kit uses, so a
 * migration that would fail is caught here) and with postgres.js (exactly what
 * the app uses at runtime). A doctor that only tested the app's driver reported
 * "Connected" while `npm run db:migrate` died on TLS.
 *
 * Read-only: it connects, counts, and disconnects. It never migrates or writes.
 */

type Level = "ok" | "warn" | "fail";

const results: { level: Level; label: string; detail: string }[] = [];

function record(level: Level, label: string, detail: string) {
  results.push({ level, label, detail });
}

const TABLES = [
  "users",
  "materials",
  "material_views",
  "training_sessions",
  "regions",
  "districts",
  "sub_districts",
  "facilities",
];

function hostOf(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function checkUrlShape(name: string, raw: string | undefined, role: "runtime" | "migrations") {
  if (!raw) {
    record(
      "fail",
      `${name} is not set`,
      role === "migrations"
        ? "drizzle-kit needs DIRECT_URL. Copy .env.example to .env.local and fill it in."
        : "The app needs DATABASE_URL. Copy .env.example to .env.local and fill it in.",
    );
    return;
  }

  const url = hostOf(raw);
  if (!url) {
    record("fail", `${name} is not a valid URL`, "It should start with postgresql://");
    return;
  }

  const host = url.hostname;
  const port = url.port || "5432";
  const isDirectHost = /^db\.[a-z0-9]+\.supabase\.co$/i.test(host);
  const isPooler = /\.pooler\.supabase\.com$/i.test(host);
  const hasSsl = url.searchParams.get("sslmode") !== null;

  record("ok", `${name} host`, `${host}:${port}`);

  if (isDirectHost) {
    record(
      "fail",
      `${name} uses the retired direct host`,
      `db.<ref>.supabase.co is IPv6-only now, so on an IPv4 network it fails with "getaddrinfo ENOTFOUND". ` +
        `Use the session pooler instead:\n` +
        `    postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require\n` +
        `    (Supabase dashboard → Connect → Session pooler gives you the exact string.)`,
    );
  }

  if (isPooler && port === "6543" && role === "migrations") {
    record(
      "fail",
      `${name} points at the transaction pooler`,
      "DDL cannot run through port 6543. Use the session pooler on 5432 for DIRECT_URL; keep the 6543 URL for the app.",
    );
  }

  if (!hasSsl && !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(host)) {
    record(
      "warn",
      `${name} has no sslmode`,
      role === "migrations"
        ? "Supabase requires TLS. Add ?sslmode=require: migrations then run with libpq semantics (encrypted, chain not verified), so a TLS-inspecting antivirus or proxy cannot break them."
        : "Supabase requires TLS. Add ?sslmode=require (or &sslmode=require).",
    );
  }

  const user = decodeURIComponent(url.username);
  if (isPooler && !/^postgres\.[a-z0-9]+$/i.test(user) && user !== "postgres") {
    record(
      "warn",
      `${name} username looks wrong for the pooler`,
      `Supavisor expects postgres.<project-ref>, not ${user}.`,
    );
  }
}

async function checkDns(name: string, raw: string | undefined) {
  const url = hostOf(raw);
  if (!url) return;
  try {
    const addresses = await lookup(url.hostname, { all: true });
    const families = [...new Set(addresses.map((address) => (address.family === 6 ? "IPv6" : "IPv4")))];
    record("ok", `${name} resolves`, `${addresses.length} address(es): ${families.join(" + ")}`);
    if (families.length === 1 && families[0] === "IPv6") {
      record(
        "warn",
        `${name} resolves to IPv6 only`,
        "Most home and office networks in Ghana are IPv4-only, so this will fail on them. Prefer the session pooler URL.",
      );
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "unknown";
    record(
      "fail",
      `${name} does not resolve`,
      code === "ENOTFOUND"
        ? "DNS has no record for this host. Check the hostname against Supabase → Connect, or switch to the session pooler."
        : `DNS lookup failed (${code}). Check your connection, VPN or proxy.`,
    );
  }
}

/* Certificate failures that mean "something on this machine re-signs TLS", not
 * "the database is unreachable". Node's own error codes for that class. */
const TLS_TRUST_ERRORS = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/*
 * The migration path, exercised with the driver drizzle-kit actually uses.
 * postgres.js (below) encrypts without verifying the chain; node-postgres does
 * not. Testing only the app driver is how "✓ Connected" sat next to
 * "Error: self-signed certificate in certificate chain" from db:migrate.
 */
async function checkMigrationDriver(raw: string | undefined) {
  if (!raw) return;
  const plan = planMigrationConnection(raw);

  if (plan.changed) {
    record(
      "ok",
      "Migrations use libpq TLS semantics",
      "Deliberate: sslmode=require encrypts without verifying the chain — the same trust level the app's\n" +
        "runtime driver uses, and what keeps TLS inspection from breaking db:migrate.\n" +
        "Use sslmode=verify-full (plus sslrootcert=<ca>.pem) to require verification.",
    );
  }

  const pool = new Pool({ connectionString: plan.url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    await pool.query("select 1");
    record("ok", "drizzle-kit can connect", `pg driver; ${plan.summary}`);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    const message = error instanceof Error ? error.message : String(error);
    if (TLS_TRUST_ERRORS.has(code)) {
      // Two different stories, and mixing them up sends people the wrong way:
      // with verification on, the fix is to trust the interceptor or stop asking;
      // with verification already off, something else is terminating TLS.
      const advice =
        plan.tls.kind === "verify-full"
          ? "DIRECT_URL asks for full chain verification and Node does not trust the chain it was given.\n" +
            "Something on this machine re-signs TLS: an antivirus HTTPS scanner or a corporate proxy\n" +
            "(Zscaler, Netskope).\n" +
            "  Fix A — stop asking for verification: change sslmode to require (drizzle.config.ts then\n" +
            "          encrypts without checking the chain, exactly as the app's driver does).\n" +
            "  Fix B — keep verification and trust the interceptor:\n" +
            "          sslmode=verify-full&sslrootcert=C:\\path\\to\\inspecting-ca.pem\n" +
            `  Fix C — exempt ${hostOf(raw)?.hostname ?? "this host"} from HTTPS scanning in the security product.`
          : "The connection is already configured not to verify the chain, so TLS is being rejected\n" +
            "before that happens. Look for a proxy that terminates connections (HTTPS_PROXY,\n" +
            "NODE_EXTRA_CA_CERTS) or a firewall between here and the database.";
      record("fail", "Migrations fail on TLS: certificate not trusted", `${message} (${code})\n${advice}`);
    } else {
      record("fail", "drizzle-kit cannot connect", message.split("\n")[0] ?? message);
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function checkDatabase(raw: string | undefined) {
  const url = hostOf(raw);
  if (!url) return;
  const sql = postgres(url.toString(), { max: 1, prepare: false, connect_timeout: 10 });
  let connected = false;
  try {
    const [{ version }] = await sql<{ version: string }[]>`select version()`;
    record("ok", "Connected", version.split(",")[0] ?? version);
    connected = true;

    const missing = await sql<{ name: string }[]>`
      select t.name
      from unnest(${sql.array(TABLES)}) as t(name)
      where to_regclass('public.' || t.name) is null
      order by t.name
    `;
    if (missing.length > 0) {
      // Stop here: the count queries below read those very tables and would
      // otherwise surface as a bogus "Could not connect" next to this failure.
      record(
        "fail",
        "Schema is behind",
        `missing: ${missing.map((row) => row.name).join(", ")} — run npm run db:migrate`,
      );
      return;
    }
    record("ok", "Schema", "every table this build expects exists");

    const [geography] = await sql<{ regions: number; districts: number; facilities: number }[]>`
      select
        (select count(*) from regions)::int as regions,
        (select count(*) from districts)::int as districts,
        (select count(*) from facilities)::int as facilities
    `;
    if (geography && geography.regions === 0) {
      record("fail", "Geography is empty", "run npm run db:seed — the sessions form has nothing to pick from otherwise");
    } else if (geography) {
      record(
        "ok",
        "Geography",
        `${geography.regions} region(s), ${geography.districts} district(s), ${geography.facilities} facilit(ies)`,
      );
    }

    const [users] = await sql<{ n: number }[]>`select count(*)::int as n from users`;
    record("ok", "Accounts", `${users?.n ?? 0} directory row(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record("fail", connected ? "Database query failed" : "Could not connect", message.split("\n")[0] ?? message);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

async function main() {
  const runtime = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL ?? runtime;

  checkUrlShape("DATABASE_URL", runtime, "runtime");
  checkUrlShape("DIRECT_URL", process.env.DIRECT_URL, "migrations");

  await checkDns("DATABASE_URL", runtime);
  await checkDns("DIRECT_URL", direct);

  await checkMigrationDriver(direct);
  await checkDatabase(direct);

  const icon: Record<Level, string> = { ok: "✓", warn: "!", fail: "✗" };
  console.log("\nGHS-TL database doctor\n");
  for (const result of results) {
    console.log(`  ${icon[result.level]} ${result.label}`);
    for (const line of result.detail.split("\n")) console.log(`      ${line}`);
  }

  const failures = results.filter((result) => result.level === "fail");
  const warnings = results.filter((result) => result.level === "warn");
  console.log(
    `\n${failures.length === 0 ? "Ready." : `${failures.length} problem(s) to fix.`}` +
      (warnings.length > 0 ? ` ${warnings.length} warning(s).` : "") +
      "\n",
  );

  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("db:doctor crashed:", error);
  process.exitCode = 1;
});
