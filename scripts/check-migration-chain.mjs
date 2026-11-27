/**
 * `npm run db:check-chain` — apply every migration to an empty Postgres.
 *
 * Drizzle only learns that a migration file is broken when somebody runs it on
 * a real database, and by then it is usually production. This runs the whole
 * journal, in order, against an in-process Postgres (PGlite): no server, no
 * credentials, no network. It is the check that would have caught the
 * `0009_users_password_hash` file that was missing from `_journal.json`.
 */
import { readFileSync } from "node:fs";

/**
 * PGlite is a devDependency. A checkout whose node_modules predates it fails
 * with a bare ERR_MODULE_NOT_FOUND, which says nothing about what to do — so the
 * import is explicit about the fix instead.
 */
let PGlite;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch {
  console.error(
    "✖ @electric-sql/pglite is not installed.\n" +
      "  It is a devDependency added with this check. Run `npm install` (or `npm ci`) and try again.",
  );
  process.exit(1);
}

const REQUIRED_COLUMNS = ["password_hash", "password_reset_token", "password_reset_expires_at"];

const db = new PGlite();
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
let failed = 0;

/*
 * The stamps have to be strictly increasing.
 *
 * `drizzle-kit migrate` runs a file only when its journal `when` is newer than
 * the newest row in drizzle.__drizzle_migrations. Four entries here once shared
 * one stamp, so on a real database 0017 was skipped in silence: migrate said
 * "done", the schema stayed a migration behind, and the health check could only
 * say "17 of 18". Applying the SQL directly (as this script does) cannot see
 * that, which is exactly why it went unnoticed — so the ordering is asserted
 * here as well.
 */
let previousWhen = 0;
for (const entry of journal.entries) {
  if (!(entry.when > previousWhen)) {
    console.error(
      `✖ ${entry.tag} has journal stamp ${entry.when}, not newer than the previous ${previousWhen}. ` +
        "drizzle-kit would skip it on a real database.",
    );
    failed += 1;
  }
  previousWhen = entry.when;
}

for (const entry of journal.entries) {
  let sql;
  try {
    sql = readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
  } catch {
    console.error(`✖ journal lists ${entry.tag} but drizzle/${entry.tag}.sql does not exist`);
    failed += 1;
    continue;
  }
  try {
    await db.exec(sql);
    console.log(`✔ ${entry.tag}`);
  } catch (error) {
    console.error(`✖ ${entry.tag}: ${String(error.message).split("\n")[0]}`);
    failed += 1;
  }
}

const columns = await db.query(
  `select column_name from information_schema.columns where table_name = 'users'`,
);
const present = new Set(columns.rows.map((row) => row.column_name));
for (const column of REQUIRED_COLUMNS) {
  if (!present.has(column)) {
    console.error(`✖ users.${column} is in schema.ts but no migration creates it`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n✖ ${failed} problem(s) in the migration chain.`);
  process.exit(1);
}
console.log(`\n✔ ${journal.entries.length} migrations applied to an empty database.`);
