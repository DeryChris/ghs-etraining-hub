/**
 * `npm run db:repair` — apply the migrations the journal says are pending.
 *
 * Why this exists next to `db:migrate`: drizzle-kit decides what to run by
 * comparing a migration's journal stamp with the newest row in
 * `drizzle.__drizzle_migrations`. Four entries once carried the same stamp, so
 * `db:migrate` printed success while 0017 never ran — "17 of 18" with nothing to
 * point at. This script takes the count instead of the stamps, applies the files
 * after it, and records them, so the ledger and the schema end up agreeing even
 * on a database that was skipped once.
 *
 * It refuses to guess: a database with tables but no migration ledger was built
 * with `db:push`, and replaying the baseline over it would fail halfway.
 *
 *   node scripts/db-repair.mjs --dry-run
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✖ Set DIRECT_URL (or DATABASE_URL) before running this. It is the unpooled Neon host.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const migrations = journal.entries;

const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable URL)";
  }
})();
console.log(`→ ${host}${dryRun ? " (dry run)" : ""}`);

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query("create schema if not exists drizzle");
  await client.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text,
      created_at bigint
    )
  `);

  const { rows: countRows } = await client.query("select count(*)::int as applied from drizzle.__drizzle_migrations");
  const applied = countRows[0].applied;
  console.log(`  ledger: ${applied} of ${migrations.length} migrations recorded`);

  if (applied >= migrations.length) {
    console.log("✔ Nothing to repair — the ledger already covers every migration in this build.");
    process.exit(0);
  }

  if (applied === 0) {
    const { rows: existing } = await client.query("select to_regclass('public.users') as t");
    if (existing[0]?.t) {
      console.error(
        "✖ This database has tables but no migration ledger, so it was built with `db:push`.\n" +
          "  Replaying the baseline over it would fail halfway. Take a backup first; if the schema\n" +
          "  matches this build, record the chain by hand (see docs/data-model.md §4).",
      );
      process.exit(1);
    }
  }

  const pending = migrations.slice(applied);
  console.log(`  pending: ${pending.map((entry) => entry.tag).join(", ")}`);
  if (dryRun) {
    console.log("→ Dry run: nothing applied.");
    process.exit(0);
  }

  for (const entry of pending) {
    const sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    process.stdout.write(`  ${entry.tag} … `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
        [createHash("sha256").update(sql).digest("hex"), entry.when],
      );
      await client.query("commit");
      console.log("applied");
    } catch (error) {
      await client.query("rollback");
      console.log("failed");
      console.error(`\n✖ ${entry.tag}: ${String(error.message).split("\n")[0]}`);
      console.error("  Nothing from this file was recorded. Fix the statement above and run again.");
      process.exit(1);
    }
  }

  const { rows: after } = await client.query("select count(*)::int as applied from drizzle.__drizzle_migrations");
  console.log(`✔ ${after[0].applied} of ${migrations.length} migrations recorded. Restart the app so it re-reads the schema.`);
} finally {
  await client.end();
}
