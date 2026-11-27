/**
 * Import the GHS staff sheet: geography first, then one account per employee.
 *
 * ── How to run it ─────────────────────────────────────────────────────────────
 *   npm run staff:import -- --file "C:\path\to\Staff Data.csv" --dry-run
 *   npm run staff:import -- --file "C:\path\to\Staff Data.csv"
 *
 *   --limit=50            stop after 50 people (a smoke test on real data)
 *   --batch=100           rows per statement (lower it if the network is slow)
 *   --from=1 --to=1000    a window of the sheet, so a failed run can be resumed
 *   --users-only          skip the geography pass (the tree is already there)
 *   --reset-passwords     re-issue <employee no.>@123 to everybody
 *
 * The sheet never enters this repository: the path is an argument, nothing is
 * committed, and the only output is a count per table. Every line of PII stays in
 * this process — no names, no phone numbers, no employee numbers are printed, and
 * the audit row records the batch, not the people.
 *
 * ── What it writes ────────────────────────────────────────────────────────────
 *   regions → districts → sub_districts → facilities   (matched by name)
 *   users                                               (role LEARNER, must change password)
 *
 * Every staff member lands as a LEARNER on purpose: the account exists, it can
 * sign in, and the people who should hold a duty are promoted from the directory
 * afterwards. Assigning roles from a spreadsheet would let a typo in a "Category"
 * column hand out review authority.
 *
 * ── Passwords ─────────────────────────────────────────────────────────────────
 *   The first password is `<employee number>@123`, and `must_change_password` is
 *   set, so the first sign-in can only choose a new one. It is deliberately easy
 *   to say and easy to replace; it is never stored in plain text and never
 *   printed. Re-running the import does NOT reset a password that has since been
 *   changed — pass `--reset-passwords` if that is what you actually want.
 *
 * ── Why this used to die halfway ──────────────────────────────────────────────
 *   Three separate ceilings, all of them hit by a six-thousand-row sheet:
 *
 *   1. `users.email` is unique and the sheet repeats corporate addresses, so a
 *      batch containing two of them was rejected by the database — the whole
 *      batch, after minutes of hashing. The first row now keeps the address and
 *      the rest fall back to the employee number (see `scripts/lib/staff-sheet.ts`).
 *   2. One statement per 250 people is ~3 500 bound parameters over a pooled
 *      Neon connection, and the pool's `statement_timeout` is 30 s. Batches are
 *      now 100 rows by default, written inside a transaction with the timeout
 *      lifted for that transaction only.
 *   3. bcrypt at cost 12 is a third of a second per person: 6 377 people is
 *      over half an hour single-file, which reads as "frozen". Hashing now runs
 *      on one worker per core, and only for people who do not exist yet.
 *
 * A failed batch is retried, then reported with its Postgres code, constraint
 * and a `--from` value to resume at. Nothing is written for that batch, so
 * re-running is always safe: `ghs_staff_id` is unique and the upsert is
 * identity-only.
 *
 * There is also `npm run staff:sql`, which writes the same rows as one `.sql`
 * file for the Neon SQL editor or `psql -f` when a long-running Node process is
 * not an option.
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, client } from "@/db/index";
import { districts, facilities, regions, subDistricts, users } from "@/db/schema";
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

/* ── Arguments ─────────────────────────────────────────────────────────────── */

const args = readFlags(process.argv, "import-staff.ts");

const file = (typeof args.get("file") === "string" ? (args.get("file") as string) : null) ?? process.env.STAFF_CSV ?? null;
const dryRun = args.has("dry-run");
const resetPasswords = args.has("reset-passwords");
const usersOnly = args.has("users-only");
const limit = flagNumber(args, "limit");
const batchSize = Math.min(Math.max(flagNumber(args, "batch") ?? 100, 1), 500);
const from = Math.max(flagNumber(args, "from") ?? 1, 1);
const to = flagNumber(args, "to");

if (!file) {
  console.error("Usage: npm run staff:import -- --file <path to the staff CSV> [--dry-run] [--limit=N] [--batch=N]");
  console.error("       [--from=N] [--to=N] [--users-only] [--reset-passwords]");
  console.error("");
  console.error("  The CSV is the GHS staffing export with columns: Employee No., Surname, Firstname(s),");
  console.error("  Full name, Gender, Work email, Work phone, Home mobile, Region, District / Division,");
  console.error("  Sub-district, Facility / Unit, Facility type, Category.");
  console.error("  It is never committed — pass its path, or set STAFF_CSV in the environment.");
  console.error("  Reference data (regions, districts, facilities) is written by `npm run db:seed`.");
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`✖ No file at ${file}.`);
  console.error('  Quote the path if it contains spaces: --file "C:\\Users\\me\\Staff Data.csv"');
  process.exit(1);
}

const sheet = parseStaffSheet(file, { limit: limit ?? undefined });
const staff = sheet.rows.filter((_, index) => index + 1 >= from && (to === null || index + 1 <= to));

/* ── Geography ─────────────────────────────────────────────────────────────── */

async function geo() {
  // Regions present in the sheet (one today, but the loop costs nothing).
  const regionNames = [...new Set(staff.map((row) => row.region))];
  const regionIds = new Map<string, string>();

  for (const name of regionNames) {
    const [existing] = await db.select({ id: regions.id }).from(regions).where(sql`lower(${regions.name}) = ${name.toLowerCase()}`).limit(1);
    if (existing) {
      regionIds.set(name, existing.id);
      continue;
    }
    const [inserted] = await db
      .insert(regions)
      .values({ code: regionSlug(name), name })
      .onConflictDoUpdate({ target: regions.name, set: { name } })
      .returning({ id: regions.id });
    regionIds.set(name, inserted.id);
  }

  // Districts, keyed by region + name.
  const districtIds = new Map<string, string>();
  const districtKeys = [...new Set(staff.filter((row) => row.district).map((row) => `${row.region}||${row.district}`))];

  for (const key of districtKeys) {
    const [regionName, districtName] = key.split("||");
    const regionId = regionIds.get(regionName)!;
    const [existing] = await db
      .select({ id: districts.id })
      .from(districts)
      .where(and(eq(districts.regionId, regionId), sql`lower(${districts.name}) = ${districtName.toLowerCase()}`))
      .limit(1);
    if (existing) {
      districtIds.set(key, existing.id);
      continue;
    }
    const [inserted] = await db
      .insert(districts)
      .values({ regionId, name: districtName, kind: DISTRICT_KIND(districtName) })
      .returning({ id: districts.id });
    districtIds.set(key, inserted.id);
  }

  // Sub-districts, keyed by district + name.
  const subDistrictIds = new Map<string, string>();
  const subKeys = [
    ...new Set(staff.filter((row) => row.district && row.subDistrict).map((row) => `${row.region}||${row.district}||${row.subDistrict}`)),
  ];

  for (const key of subKeys) {
    const [regionName, districtName, subName] = key.split("||");
    const districtId = districtIds.get(`${regionName}||${districtName}`)!;
    const [existing] = await db
      .select({ id: subDistricts.id })
      .from(subDistricts)
      .where(and(eq(subDistricts.districtId, districtId), sql`lower(${subDistricts.name}) = ${subName.toLowerCase()}`))
      .limit(1);
    if (existing) {
      subDistrictIds.set(key, existing.id);
      continue;
    }
    const [inserted] = await db.insert(subDistricts).values({ districtId, name: subName }).returning({ id: subDistricts.id });
    subDistrictIds.set(key, inserted.id);
  }

  // Facilities, unique per district by name.
  const facilityKeys = [...new Set(staff.filter((row) => row.facility).map((row) => `${row.region}||${row.district || ""}||${row.facility}`))];
  let facilitiesCreated = 0;

  for (const key of facilityKeys) {
    const [regionName, districtName, facilityName] = key.split("||");
    const districtId = districtIds.get(`${regionName}||${districtName}`);
    if (!districtId) continue;
    const [existing] = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(and(eq(facilities.districtId, districtId), sql`lower(${facilities.name}) = ${facilityName.toLowerCase()}`))
      .limit(1);
    if (existing) continue;
    const subKey = `${regionName}||${districtName}||${staff.find((row) => row.facility === facilityName)?.subDistrict ?? ""}`;
    await db.insert(facilities).values({
      districtId,
      subDistrictId: subDistrictIds.get(subKey) ?? null,
      name: facilityName,
      type: FACILITY_TYPE(facilityName),
    });
    facilitiesCreated += 1;
  }

  return {
    regions: regionNames.length,
    districts: districtKeys.length,
    subDistricts: subKeys.length,
    facilities: facilityKeys.length,
    facilitiesCreated,
  };
}

/* ── Writes ────────────────────────────────────────────────────────────────── */

/** Everything a person's row puts into `users`, whichever statement writes it. */
function identityOf(row: StaffRow) {
  return {
    ghsStaffId: row.staffId,
    fullName: row.fullName,
    gender: row.gender,
    email: row.email,
    phone: row.phone,
    cadre: row.cadre,
    region: row.region,
    district: row.district || null,
    subDistrict: row.subDistrict,
    facility: row.facility,
  };
}

/**
 * `update … from (values …)`: one statement for the people who already exist.
 *
 * The alternative — an insert that conflicts and an update clause that leaves
 * `password_hash` alone — needs a hash in the values list for every row, which
 * is exactly the cost a re-import is trying to avoid.
 */
async function updateExisting(tx: typeof db, rows: StaffRow[]) {
  const tuples = rows.map((row) => {
    const person = identityOf(row);
    return sql`(${person.ghsStaffId}::text, ${person.fullName}::text, ${person.gender}::text, ${person.email}::text, ${person.phone}::text, ${person.cadre}::text, ${person.region}::text, ${person.district}::text, ${person.subDistrict}::text, ${person.facility}::text)`;
  });

  await tx.execute(sql`
    update "users" as u set
      "full_name" = v.full_name,
      "gender" = v.gender,
      "email" = v.email,
      "phone" = v.phone,
      "cadre" = v.cadre,
      "region" = v.region,
      "district" = v.district,
      "sub_district" = v.sub_district,
      "facility" = v.facility,
      "updated_at" = now()
    from (values ${sql.join(tuples, sql`, `)}) as v(ghs_staff_id, full_name, gender, email, phone, cadre, region, district, sub_district, facility)
    where u."ghs_staff_id" = v.ghs_staff_id
  `);
}

/** Postgres errors carry the useful half in fields `message` does not. */
function describeError(error: unknown): string {
  const detail = error as { message?: string; code?: string; detail?: string; hint?: string; constraint?: string };
  const lines = [detail.message ?? String(error)];
  if (detail.code) lines.push(`  code: ${detail.code}`);
  if (detail.constraint) lines.push(`  constraint: ${detail.constraint}`);
  if (detail.detail) lines.push(`  detail: ${detail.detail}`);
  if (detail.hint) lines.push(`  hint: ${detail.hint}`);
  return lines.join("\n");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Three attempts, then the batch is reported instead of guessed at. */
async function writeBatch(run: () => Promise<void>, label: string) {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await run();
      return;
    } catch (error) {
      last = error;
      if (attempt < 3) await sleep(attempt * 750);
    }
  }
  throw new Error(`Batch ${label} failed after 3 attempts.\n${describeError(last)}`);
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

async function main() {
  const { stats } = sheet;
  console.log(`Sheet: ${stats.rows} rows → ${stats.usable} usable`);
  if (stats.duplicates) console.log(`  ${stats.duplicates} duplicate employee numbers skipped`);
  if (stats.blank) console.log(`  ${stats.blank} rows without an employee number or name skipped`);
  if (stats.invalidEmails) console.log(`  ${stats.invalidEmails} work e-mails were not addresses — those staff sign in by employee number`);
  if (stats.sharedEmails) console.log(`  ${stats.sharedEmails} repeated work e-mails — only the first account keeps one`);
  console.log(`  ${stats.withEmail} with a work e-mail, ${stats.withoutEmail} without (they sign in with their employee number)`);
  if (from > 1 || to !== null) console.log(`  window: rows ${from}–${to ?? stats.usable} of the sheet (${staff.length} people)`);

  if (dryRun) {
    const districtsInSheet = new Set(staff.map((row) => row.district).filter(Boolean));
    const subInSheet = new Set(staff.map((row) => row.subDistrict).filter(Boolean));
    const facilitiesInSheet = new Set(staff.map((row) => row.facility).filter(Boolean));
    console.log(
      `Dry run — would upsert ${districtsInSheet.size} districts, ${subInSheet.size} sub-districts, ${facilitiesInSheet.size} facilities, ${staff.length} accounts.`,
    );
    /*
     * Said plainly, and last, because "Nothing written" on the line above a prompt
     * is easy to skim past — this is the command somebody runs, sees a success
     * message and a count, and then wonders why the directory is still empty.
     */
    console.log("");
    console.log("  NOTHING WAS WRITTEN. This was a dry run.");
    console.log("  Run the same command again without --dry-run to create the accounts:");
    console.log(`    npm run staff:import -- --file "${file}"`);
    return;
  }

  if (!usersOnly) {
    // Geography first: an account can point at a facility that does not exist yet,
    // but the directory reads better when the tree is complete before the people.
    const geoCounts = await geo();
    console.log(
      `Geography: ${geoCounts.districts} districts, ${geoCounts.subDistricts} sub-districts, ${geoCounts.facilities} facilities (${geoCounts.facilitiesCreated} new)`,
    );
  }

  // Which employee numbers already exist? Only the missing ones need a hash —
  // bcrypt at cost 12 is deliberately slow, and 6 000 of them is minutes.
  const existing = new Set<string>();
  for (let index = 0; index < staff.length; index += 500) {
    const slice = staff.slice(index, index + 500).map((row) => row.staffId);
    const found = await db.select({ staffId: users.ghsStaffId }).from(users).where(inArray(users.ghsStaffId, slice));
    for (const row of found) existing.add(row.staffId);
  }

  /* An address already used by a *different* account is a unique violation that
   * would sink whichever batch it landed in. Drop it here instead: the person
   * still gets an account, and signs in with the employee number. */
  const emails = [...new Set(staff.map((row) => row.email).filter((value): value is string => Boolean(value)))];
  const owners = new Map<string, string>();
  for (let index = 0; index < emails.length; index += 500) {
    const slice = emails.slice(index, index + 500).map((value) => value.toLowerCase());
    const found = await db
      .select({ staffId: users.ghsStaffId, email: users.email })
      .from(users)
      .where(inArray(sql`lower(${users.email})`, slice));
    for (const row of found) if (row.email) owners.set(row.email.toLowerCase(), row.staffId);
  }
  let freed = 0;
  for (const row of staff) {
    const owner = row.email ? owners.get(row.email) : undefined;
    if (owner && owner !== row.staffId) {
      row.email = null;
      freed += 1;
    }
  }
  if (freed) console.log(`  ${freed} addresses already belong to another account here — left to the employee number`);

  const fresh = staff.filter((row) => !existing.has(row.staffId) || resetPasswords);
  const known = staff.filter((row) => existing.has(row.staffId) && !resetPasswords);

  console.log(`Accounts: ${fresh.length} to create${resetPasswords ? " (passwords reset)" : ""}, ${known.length} to refresh`);
  if (fresh.length >= 200) {
    // 0.33 s per bcrypt hash at cost 12, split across the cores doing the work.
    const cores = Math.max(1, Math.min(8, availableParallelism()));
    const minutes = Math.max(1, Math.round((fresh.length * 0.33) / cores / 60));
    console.log(`  hashing ${fresh.length} first passwords on ${cores} cores — about ${minutes} min. Ctrl-C is safe: re-run and it continues.`);
  }

  const hashes = await hashPasswords(
    fresh.map((row) => defaultPassword(row.staffId)),
    (done, total) => process.stdout.write(`\r  hashing: ${done}/${total}`),
  );
  if (fresh.length) process.stdout.write("\n");

  const hashOf = new Map<string, string>();
  fresh.forEach((row, index) => hashOf.set(row.staffId, hashes[index]));

  let created = 0;
  let refreshed = 0;

  for (let index = 0; index < staff.length; index += batchSize) {
    const batch = staff.slice(index, index + batchSize);
    const creations = batch.filter((row) => hashOf.has(row.staffId));
    const refreshes = batch.filter((row) => !hashOf.has(row.staffId));

    await writeBatch(
      async () => {
        await db.transaction(async (tx) => {
          // The pool's 30 s ceiling is for a page request, not for a batch of
          // 100 payroll rows over a pooled connection in another continent.
          await tx.execute(sql`set local statement_timeout = 0`);

          if (creations.length) {
            const values = creations.map((row) => ({
              ...identityOf(row),
              role: "LEARNER" as const,
              passwordHash: hashOf.get(row.staffId)!,
              mustChangePassword: true,
              updatedAt: new Date(),
            }));
            await tx
              .insert(users)
              .values(values)
              .onConflictDoUpdate({
                target: users.ghsStaffId,
                // Identity fields only. An existing password, role, unit-head duty
                // or programme assignment is never overwritten by a re-import.
                set: {
                  fullName: sql`excluded.full_name`,
                  gender: sql`excluded.gender`,
                  // The sheet owns the address. Null means the sheet has none (or
                  // another account holds it), which is how a person signs in by
                  // employee number instead.
                  email: sql`excluded.email`,
                  phone: sql`excluded.phone`,
                  cadre: sql`excluded.cadre`,
                  region: sql`excluded.region`,
                  district: sql`excluded.district`,
                  subDistrict: sql`excluded.sub_district`,
                  facility: sql`excluded.facility`,
                  ...(resetPasswords
                    ? { passwordHash: sql`excluded.password_hash`, mustChangePassword: sql`excluded.must_change_password` }
                    : {}),
                  updatedAt: new Date(),
                },
              });
          }

          if (refreshes.length) await updateExisting(tx as unknown as typeof db, refreshes);
        });
      },
      `${index + 1}–${index + batch.length} of ${staff.length}`,
    );

    created += creations.length;
    refreshed += refreshes.length;
    process.stdout.write(`\r  accounts: ${Math.min(index + batchSize, staff.length)}/${staff.length}`);
  }

  process.stdout.write("\n");
  console.log(`Accounts: ${created} created, ${refreshed} refreshed${resetPasswords ? " (passwords reset)" : ""}`);
  console.log("Every account holds the Staff role (stored as LEARNER) with a first password of <employee no.>@123,");
  console.log("and must choose a new one at first sign-in. Nothing else is printed: the sheet is never echoed.");
  console.log("Check the result with: npm run staff:status");
  console.log("Promote people from /users — Facilitators / Admins by role, then programme access per person.");
}

main()
  .then(async () => {
    await client.end({ timeout: 5 });
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\nImport failed:", error instanceof Error ? error.message : describeError(error));
    console.error("");
    console.error("  Nothing from the failed batch was written. Re-run the same command — rows that");
    console.error("  already exist are refreshed, not duplicated. To skip the work that is done:");
    console.error(`    npm run staff:import -- --file "${file}" --from=<first row of the failed batch>`);
    console.error("  Or use the plain-SQL route: npm run staff:sql -- --file <csv>");
    await client.end({ timeout: 5 }).catch(() => {});
    process.exit(1);
  });
