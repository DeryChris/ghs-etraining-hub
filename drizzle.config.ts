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
