import "dotenv/config";
import type { Config } from "drizzle-kit";

/*
 * drizzle-kit runs schema pushes, migrations and studio against the DIRECT
 * (session) connection: a transaction pooler cannot serve DDL reliably.
 * DATABASE_URL remains the runtime pool used by src/db/client.ts.
 */
const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error("Set DIRECT_URL (preferred) or DATABASE_URL before running drizzle-kit.");
}

/*
 * Preflight the two mistakes that look like "connection failed" and waste an
 * afternoon: the retired IPv6-only Supabase direct host, and the transaction
 * pooler, which cannot run DDL. Warning rather than throwing, because a network
 * with IPv6 does still reach the direct host.
 */
try {
  const url = new URL(directUrl);
  const port = url.port || "5432";
  if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(url.hostname)) {
    console.warn(
      "\n⚠ DIRECT_URL uses db.<ref>.supabase.co, which is IPv6-only. On an IPv4 network this fails with ENOTFOUND.\n" +
        "  Use the session pooler: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n" +
        "  Run `npm run db:doctor` to check both URLs before migrating.\n",
    );
  } else if (/\.pooler\.supabase\.com$/i.test(url.hostname) && port === "6543") {
    console.warn(
      "\n⚠ DIRECT_URL points at the port 6543 transaction pooler, which cannot run migrations.\n" +
        "  Use the session pooler on port 5432 for DIRECT_URL.\n",
    );
  }
} catch {
  // Not a parseable URL: let drizzle-kit report it.
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl,
  },
  strict: true,
  verbose: true,
} satisfies Config;
