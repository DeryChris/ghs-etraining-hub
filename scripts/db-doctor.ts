import "dotenv/config";
import { lookup } from "node:dns/promises";
import postgres from "postgres";

/*
 * `npm run db:doctor` — one command that says why the database tools cannot
 * reach the database, and what to change.
 *
 * It exists because the two failures that cost the most time are invisible in
 * the raw errors: a Supabase hostname that no longer resolves on IPv4 (the
 * direct `db.<ref>.supabase.co` host is IPv6-only now) and a transaction
 * pooler URL handed to drizzle-kit, which cannot run DDL. Both look like
 * "connection failed" until you read the docs.
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
  "programme_fields",
  "programme_areas",
  "area_facilitators",
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

function checkUrlShape(
  name: string,
  raw: string | undefined,
  role: "runtime" | "migrations",
) {
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
    record(
      "fail",
      `${name} is not a valid URL`,
      "It should start with postgresql://",
    );
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
      "Supabase requires TLS. Add ?sslmode=require (or &sslmode=require).",
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
    const families = [
      ...new Set(
        addresses.map((address) => (address.family === 6 ? "IPv6" : "IPv4")),
      ),
    ];
    record(
      "ok",
      `${name} resolves`,
      `${addresses.length} address(es): ${families.join(" + ")}`,
    );
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

/**
 * Both URLs are actually dialled, not just inspected.
 *
 * This used to connect with `DIRECT_URL` alone, which made a green doctor mean
 * "migrations can reach the database" — not "the app can". A `.env` whose
 * `DATABASE_URL` still pointed at the IPv6-only direct host passed every check
 * and then failed on every page with `write CONNECT_TIMEOUT undefined:undefined`.
 * `deep` is only true for the runtime URL, so the schema and geography counts
 * are not printed twice.
 */
async function checkDatabase(
  label: string,
  raw: string | undefined,
  deep: boolean,
) {
  const url = hostOf(raw);
  if (!url) return;
  const sql = postgres(url.toString(), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    const [{ version }] = await sql<{ version: string }[]>`select version()`;
    record("ok", `${label} connects`, version.split(",")[0] ?? version);

    if (!deep) return;

    const missing = await sql<{ name: string }[]>`
      select t.name
      from unnest(${sql.array(TABLES)}) as t(name)
      where to_regclass('public.' || t.name) is null
      order by t.name
    `;
    if (missing.length === 0) {
      record("ok", "Schema", "every table this build expects exists");
    } else {
      record(
        "fail",
        "Schema is behind",
        `missing: ${missing.map((row) => row.name).join(", ")} — run npm run db:migrate`,
      );
    }

    const [geography] = await sql<
      { regions: number; districts: number; facilities: number }[]
    >`
      select
        (select count(*) from regions)::int as regions,
        (select count(*) from districts)::int as districts,
        (select count(*) from facilities)::int as facilities
    `;
    if (geography && geography.regions === 0) {
      record(
        "fail",
        "Geography is empty",
        "run npm run db:seed:geography — the training form has nothing to pick from otherwise",
      );
    } else if (geography && geography.districts === 0) {
      record(
        "warn",
        "No districts or facilities",
        "The training form stops at Region: it needs a district and a facility. " +
          "Run npm run db:seed:geography (idempotent; no demo accounts or materials).",
      );
    } else if (geography) {
      record(
        "ok",
        "Geography",
        `${geography.regions} region(s), ${geography.districts} district(s), ${geography.facilities} facilit(ies)`,
      );
    }

    const [users] = await sql<
      { n: number }[]
    >`select count(*)::int as n from users`;
    record("ok", "Accounts", `${users?.n ?? 0} directory row(s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as NodeJS.ErrnoException).code;
    record(
      "fail",
      `${label} cannot connect`,
      `${message.split("\n")[0] ?? message}` +
        (code === "CONNECT_TIMEOUT"
          ? "\nThis is the URL the application uses on every page. Copy the host, port and username from " +
            "Supabase → Connect → Session pooler, and keep DIRECT_URL on the same host."
          : ""),
    );
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

  // The app first, then migrations: if only one of them works, that is the story.
  await checkDatabase("DATABASE_URL", runtime, true);
  if (direct !== runtime) await checkDatabase("DIRECT_URL", direct, false);

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
