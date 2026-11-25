import "dotenv/config";
import type { Config } from "drizzle-kit";

/*
 * Migrations run on their own connection, and it must be the **direct** host.
 *
 * Neon hands out two: `ep-…-pooler…` (PgBouncer, transaction mode) for the app,
 * and `ep-…` for everything else. DDL through the pooler can wait on an advisory
 * lock that is never released, which reads as a migration that hangs with no
 * error and no SQL in the server log. `DIRECT_URL` wins; `DATABASE_URL` is the
 * fallback for a local Postgres where the two are the same string.
 */
const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!directUrl) {
  throw new Error("Set DIRECT_URL (or DATABASE_URL) before running drizzle-kit. Get it from Neon → Connect.");
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
