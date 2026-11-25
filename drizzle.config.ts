import "dotenv/config";
import type { Config } from "drizzle-kit";

/*
 * Neon is serverless Postgres — no PgBouncer, no transaction pooler quirks,
 * no separate direct URL needed. A single connection string handles both
 * runtime queries and DDL migrations.
 */
const directUrl = process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error("Set DATABASE_URL before running drizzle-kit. Get it from Neon → Project → Connection string.");
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
