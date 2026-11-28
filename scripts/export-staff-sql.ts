/**
 * `npm run staff:sql` — the staff sheet as one plain `.sql` file.
 *
 *   npm run staff:sql -- --file "Staff Data.csv"
 *   npm run staff:sql -- --file "Staff Data.csv" --out accounts.sql --no-passwords
 *
 * The import script talks to Postgres itself; this one writes the same work as
 * SQL you can run with `npm run db:apply -- <file>`, paste into the Neon SQL
 * editor, or hand
 * to somebody who has the connection string and not the repository. It exists
 * because a six-thousand-row import is a long-running Node process holding a
 * pooled connection open, and that is the part that keeps failing on a laptop
 * several thousand kilometres from the database.
 *
 * ── What the file contains ───────────────────────────────────────────────────
 *   1. A comment header: how many people, when it was generated, and what the
 *      default password is. No names, no numbers, no addresses.
 *   2. Regions, districts, sub-districts and facilities — upserted by name, so
 *      running the file twice changes nothing.
 *   3. `users`, 100 rows to a statement, `on conflict ("ghs_staff_id") do
 *      update` on the identity columns only. A password that has since been
 *      changed is never overwritten.
 *
 * ── Passwords ────────────────────────────────────────────────────────────────
 * A bcrypt hash cannot be produced in SQL without `pgcrypto`'s crypt(), and the
 * app verifies with bcryptjs, so the hashes are computed here — in parallel, one
 * worker per core — and written into the file as literals. The file therefore
 * contains a valid bcrypt hash for every person: treat it like the staff sheet
 * itself (do not commit it, delete it once it has run). `--no-passwords` writes
 * the accounts with `password_hash` null instead; those people cannot sign in
 * until `npm run user:password` is run for them.
 */
import "@/lib/load-env";
import { existsSync, writeFileSync } from "node:fs";
import {
  DISTRICT_KIND,
  FACILITY_TYPE,
  defaultPassword,
  flagNumber,
  hashPasswords,
  parseStaffSheet,
  readFlags,
  regionSlug,
  type StaffRow,
} from "./lib/staff-sheet";

const args = readFlags(process.argv, "export-staff-sql.ts");
const file = (typeof args.get("file") === "string" ? (args.get("file") as string) : null) ?? process.env.STAFF_CSV ?? null;
const out = (typeof args.get("out") === "string" ? (args.get("out") as string) : null) ?? "staff-accounts.sql";
const noPasswords = args.has("no-passwords");
const limit = flagNumber(args, "limit");
const batchSize = Math.min(Math.max(flagNumber(args, "batch") ?? 100, 1), 500);

if (!file || !existsSync(file)) {
  console.error("Usage: npm run staff:sql -- --file <path to the staff CSV> [--out staff-accounts.sql]");
  console.error("       [--batch=100] [--limit=N] [--no-passwords]");
  console.error("");
  console.error("  Writes the geography and one account per employee as plain SQL — run it with");
  console.error("  npm run db:apply -- staff-accounts.sql, or paste it into the Neon SQL editor.");
  process.exit(1);
}

/* ── Literals ──────────────────────────────────────────────────────────────── */

/** A Postgres string literal, or `null`. Quotes are doubled, NULs removed. */
function literal(value: string | null | undefined): string {
  if (value === null || value === undefined) return "null";
  const value_ = value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  if (!value_) return "null";
  return `'${value_.replace(/'/g, "''")}'`;
}

/** Same, with an explicit text cast so `values` columns have a type. */
const text = (value: string | null | undefined): string =>
  value === null || value === undefined || !value.trim() ? "null" : `${literal(value)}::text`;

function chunks<T>(items: T[], size: number): T[][] {
  const out_: T[][] = [];
  for (let index = 0; index < items.length; index += size) out_.push(items.slice(index, index + size));
  return out_;
}

const split = (key: string): string[] => key.split("||");

/* ── Main ──────────────────────────────────────────────────────────────────── */

async function main() {
  const { rows, stats } = parseStaffSheet(file as string, { limit: limit ?? undefined });
  console.log(`Sheet: ${stats.rows} rows → ${stats.usable} usable`);
  if (stats.duplicates) console.log(`  ${stats.duplicates} duplicate employee numbers skipped`);
  if (stats.blank) console.log(`  ${stats.blank} rows without an employee number or name skipped`);
  if (stats.invalidEmails) console.log(`  ${stats.invalidEmails} work e-mails were not addresses`);
  if (stats.sharedEmails) console.log(`  ${stats.sharedEmails} repeated work e-mails — only the first account keeps one`);

  const hashes = noPasswords
    ? rows.map(() => null as string | null)
    : await hashPasswords(
        rows.map((row) => defaultPassword(row.staffId)),
        (done, total) => process.stdout.write(`\r  hashing: ${done}/${total}`),
      );
  if (!noPasswords) process.stdout.write("\n");

  const lines: string[] = [];
  const push = (value = "") => lines.push(value);

  push("/*");
  push(" * GHS-UWRHD Training Library — staff accounts, generated from the staffing sheet.");
  push(` * ${rows.length} people. Generated ${new Date().toISOString().slice(0, 10)} by npm run staff:sql.`);
  push(" *");
  push(" * Safe to run twice: everything is an upsert on a natural key. Existing passwords,");
  push(" * roles, programme assignments and unit-head duties are never touched.");
  push(" *");
  if (noPasswords) {
    push(" * NO PASSWORDS WERE WRITTEN. Give each person one with: npm run user:password");
  } else {
    push(" * Every account has the first password <employee no.>@123 and must change it at");
    push(" * first sign-in. This file holds bcrypt hashes: treat it like the sheet, do not");
    push(" * commit it, and delete it after it has run.");
  }
  push(" *");
  push(" *   npm run db:apply -- staff-accounts.sql   (no psql needed)");
  push(" *   — or paste it into the Neon SQL editor.");
  push(" */");
  push("");

  /* ── Geography ───────────────────────────────────────────────────────────── */

  push("-- Regions");
  for (const name of [...new Set(rows.map((row) => row.region))]) {
    push(`insert into "regions" ("code", "name") values (${literal(regionSlug(name))}, ${literal(name)}) on conflict ("name") do nothing;`);
  }
  push("");

  const districtKeys = [...new Set(rows.filter((row) => row.district).map((row) => `${row.region}||${row.district}`))];
  const districtsByRegion = new Map<string, string[]>();
  for (const key of districtKeys) {
    const [region, district] = split(key);
    const list = districtsByRegion.get(region) ?? [];
    list.push(district);
    districtsByRegion.set(region, list);
  }

  push("-- Districts");
  for (const [region, districtNames] of districtsByRegion) {
    for (const group of chunks(districtNames, batchSize)) {
      push(`insert into "districts" ("region_id", "name", "kind")`);
      push(`select r."id", v.name, v.kind`);
      push(`from (values ${group.map((name) => `(${text(name)}, ${literal(DISTRICT_KIND(name))}::"district_kind")`).join(", ")}) as v(name, kind)`);
      push(`cross join "regions" r`);
      push(`where lower(r."name") = lower(${literal(region)})`);
      push(`on conflict ("region_id", "name") do nothing;`);
      push("");
    }
  }

  const subKeys = [...new Set(rows.filter((row) => row.district && row.subDistrict).map((row) => `${row.region}||${row.district}||${row.subDistrict}`))];
  push("-- Sub-districts");
  for (const group of chunks(subKeys, batchSize)) {
    const tuples = group.map((key) => {
      const [region, district, name] = split(key);
      return `(${text(region)}, ${text(district)}, ${text(name)})`;
    });
    push(`insert into "sub_districts" ("district_id", "name")`);
    push(`select d."id", v.name`);
    push(`from (values ${tuples.join(", ")}) as v(region, district, name)`);
    push(`join "regions" r on lower(r."name") = lower(v.region)`);
    push(`join "districts" d on d."region_id" = r."id" and lower(d."name") = lower(v.district)`);
    push(`on conflict ("district_id", "name") do nothing;`);
    push("");
  }

  const facilityKeys = [
    ...new Set(
      rows
        .filter((row) => row.district && row.facility)
        .map((row) => `${row.region}||${row.district}||${row.subDistrict ?? ""}||${row.facility}`),
    ),
  ];
  push("-- Facilities");
  for (const group of chunks(facilityKeys, batchSize)) {
    const tuples = group.map((key) => {
      const [region, district, subDistrict, name] = split(key);
      return `(${text(region)}, ${text(district)}, ${text(subDistrict)}, ${text(name)}, ${literal(FACILITY_TYPE(name as string))}::"facility_type")`;
    });
    push(`insert into "facilities" ("district_id", "sub_district_id", "name", "type")`);
    push(`select d."id", sd."id", v.name, v.type`);
    push(`from (values ${tuples.join(", ")}) as v(region, district, sub_district, name, type)`);
    push(`join "regions" r on lower(r."name") = lower(v.region)`);
    push(`join "districts" d on d."region_id" = r."id" and lower(d."name") = lower(v.district)`);
    push(`left join "sub_districts" sd on sd."district_id" = d."id" and lower(sd."name") = lower(v.sub_district)`);
    push(`on conflict ("district_id", "name") do nothing;`);
    push("");
  }

  /* ── People ──────────────────────────────────────────────────────────────── */

  push("-- Accounts");
  const batches = chunks(rows, batchSize);
  let offset = 0;
  batches.forEach((group) => {
    const base = offset;
    offset += group.length;
    const tuples = group.map((row: StaffRow, indexInBatch) => {
      const hash = hashes[base + indexInBatch];
      return `(${[
        text(row.staffId),
        text(row.fullName),
        text(row.gender),
        text(row.email),
        text(row.phone),
        text(row.grade),
        text(row.region),
        text(row.district),
        text(row.subDistrict),
        text(row.facility),
        hash ? literal(hash) : "null",
      ].join(", ")})`;
    });

    push(`insert into "users" (`);
    push(`  "ghs_staff_id", "full_name", "gender", "email", "phone", "grade", "region",`);
    push(`  "district", "sub_district", "facility", "role", "password_hash", "must_change_password"`);
    push(`)`);
    push(`select`);
    push(`  v.ghs_staff_id, v.full_name, v.gender,`);
    /* `users.email` is unique across the table, not just within this file: an
     * address already held by a different account is dropped rather than allowed
     * to sink the statement. That person signs in with their employee number. */
    push(`  case`);
    push(`    when v.email is null then null`);
    push(`    when exists (select 1 from "users" u where u."email" = v.email and u."ghs_staff_id" <> v.ghs_staff_id) then null`);
    push(`    else v.email`);
    push(`  end,`);
    push(`  v.phone, v.grade, v.region, v.district, v.sub_district, v.facility,`);
    push(`  'LEARNER'::"user_role", v.password_hash, ${noPasswords ? "false" : "true"}`);
    push(`from (values`);
    tuples.forEach((tuple, index) => push(`  ${tuple}${index === tuples.length - 1 ? "" : ","}`));
    push(`) as v(ghs_staff_id, full_name, gender, email, phone, grade, region, district, sub_district, facility, password_hash)`);
    push(`on conflict ("ghs_staff_id") do update set`);
    push(`  "full_name" = excluded."full_name",`);
    push(`  "gender" = excluded."gender",`);
    push(`  "email" = excluded."email",`);
    push(`  "phone" = excluded."phone",`);
    push(`  "grade" = excluded."grade",`);
    push(`  "region" = excluded."region",`);
    push(`  "district" = excluded."district",`);
    push(`  "sub_district" = excluded."sub_district",`);
    push(`  "facility" = excluded."facility",`);
    push(`  "updated_at" = now();`);
    push("");
  });

  writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
  const kilobytes = Math.round(Buffer.byteLength(lines.join("\n"), "utf8") / 1024);
  console.log(`Wrote ${out} — ${rows.length} accounts in ${batches.length} statements, ${kilobytes} kB.`);
  console.log("");
  console.log("Run it with:");
  console.log(`  npm run db:apply -- ${out}`);
  console.log("or paste it into the Neon SQL editor (use DIRECT_URL — the unpooled host — for a file this size).");
  if (!noPasswords) console.log("Delete the file when it has run: it contains a bcrypt hash per person.");
}

main().catch((error) => {
  console.error("✖ Could not write the SQL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
