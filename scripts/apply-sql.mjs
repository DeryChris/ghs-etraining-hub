/**
 * `npm run db:apply -- staff-accounts.sql` — run a `.sql` file, without psql.
 *
 * `psql` is not installed on most Windows machines, is a different package on
 * every platform, and is not needed for what these files do: one connection, one
 * file, no result set to read. This script takes the file, sends it over
 * `DIRECT_URL` (the unpooled host — DDL and big writes must not go through
 * PgBouncer), and prints what happened.
 *
 *   npm run db:apply -- staff-accounts.sql
 *   npm run db:apply -- docs/apply-0023.sql
 *   npm run db:apply -- staff-accounts.sql --dry-run     # connect, check, change nothing
 *
 * ── How the file is run ──────────────────────────────────────────────────────
 * The whole file goes over the wire as one statement string, exactly as `psql -f`
 * would run it: Postgres treats a multi-statement simple query as ONE implicit
 * transaction, so a file that fails halfway leaves nothing behind. Files that
 * carry their own `BEGIN`/`COMMIT` (the `docs/apply-*.sql` ones do) are sent
 * unwrapped, so the two do not fight.
 *
 * ── What it refuses ─────────────────────────────────────────────────────────
 * psql meta-commands (`\i`, `\set`, `\copy`). They are psql features, not SQL,
 * and failing on line 1 with the line number beats failing on statement 900 with
 * a syntax error that reads like a broken file.
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";

// `.env.local` first: it is the file `.env.example` tells people to create, and
// dotenv's own default (`.env` only) would miss it. See src/lib/load-env.ts.
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file });
}

import { readFileSync } from "node:fs";
import pg from "pg";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const fileArg = argv.find((arg) => !arg.startsWith("--"));

if (!fileArg) {
  console.error("✖ Name the file to run.\n");
  console.error("    npm run db:apply -- staff-accounts.sql");
  console.error("    npm run db:apply -- docs/apply-0023.sql --dry-run\n");
  process.exit(1);
}

if (!existsSync(fileArg)) {
  console.error(`✖ No such file: ${fileArg}`);
  console.error("  Run it from the repository root, where the file was written.");
  process.exit(1);
}

const text = readFileSync(fileArg, "utf8");
const bytes = Buffer.byteLength(text, "utf8");
const kilobytes = Math.round(bytes / 1024);

if (!text.trim()) {
  console.error(`✖ ${fileArg} is empty.`);
  process.exit(1);
}

/* psql-only lines: tell the person which one, rather than letting Postgres call
 * it a syntax error 500 statements later. */
const meta = text
  .split("\n")
  .map((line, index) => ({ line, number: index + 1 }))
  .find(({ line }) => /^\s*\\[a-z]/i.test(line));
if (meta) {
  console.error(`✖ ${fileArg}:${meta.number} is a psql meta-command: ${meta.line.trim()}`);
  console.error("  Those only work inside psql. Remove it, or run the file with psql if you have it.");
  process.exit(1);
}

/** Files that open their own transaction must not be wrapped in ours. */
const managesOwnTransaction = /^\s*(begin|commit)\s*;/im.test(text);

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✖ Set DIRECT_URL (or DATABASE_URL) in .env.local before running this.");
  console.error("  It is the unpooled Neon host — Neon → Connect → the host without -pooler.");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable URL)";
  }
})();

const pooled = /-pooler\./.test(host);
if (pooled) {
  console.error(`⚠ ${host} is the pooled host.`);
  console.error("  DDL and large batches can hang or time out through PgBouncer; use DIRECT_URL.");
}

console.log(`→ ${fileArg} — ${kilobytes} kB → ${host}${dryRun ? " (dry run)" : ""}`);
if (managesOwnTransaction) console.log("  the file manages its own transaction; sending it as-is");

if (dryRun) {
  console.log("→ Dry run: file read, connection not opened, nothing changed.");
  process.exit(0);
}

const client = new pg.Client({ connectionString: url });
const started = Date.now();

try {
  await client.connect();
} catch (error) {
  console.error(`\n✖ Could not connect: ${String(error.message).split("\n")[0]}`);
  console.error("  `npm run db:doctor` says which part of the connection string is wrong.");
  process.exit(1);
}

try {
  if (!managesOwnTransaction) await client.query("begin");
  await client.query(text);
  if (!managesOwnTransaction) await client.query("commit");
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✔ Applied ${fileArg} in ${seconds}s.`);
  if (/insert into\s+"?users"?/i.test(text)) {
    console.log("  Re-run `npm run staff:status` to count what landed.");
  }
} catch (error) {
  if (!managesOwnTransaction) await client.query("rollback").catch(() => {});
  const [first] = String(error.message).split("\n");
  console.error(`\n✖ ${first}`);
  if (error.position) {
    const before = text.slice(0, Number(error.position));
    const line = before.split("\n").length;
    console.error(`  at line ${line} of ${fileArg}`);
  }
  if (!managesOwnTransaction) console.error("  Rolled back: the database is unchanged.");
  process.exitCode = 1;
} finally {
  await client.end();
}
