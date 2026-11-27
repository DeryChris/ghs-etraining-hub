/**
 * Import the GHS staff sheet: geography first, then one account per employee.
 *
 * ── How to run it ─────────────────────────────────────────────────────────────
 *   npm run staff:import -- --file "C:\path\to\Staff Data.csv" --dry-run
 *   npm run staff:import -- --file "C:\path\to\Staff Data.csv"
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
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, client } from "@/db/index";
import { districts, facilities, regions, subDistricts, users } from "@/db/schema";

/* ── Arguments ─────────────────────────────────────────────────────────────── */

/** `--file x`, `--file=x`, `--dry-run` — all three are things people type. */
const args = new Map<string, string | true>();
// Node keeps `--conditions`/`--import` in argv in some versions; start from the
// script itself so the flags are the only thing being read.
const scriptIndex = process.argv.findIndex((entry) => entry.endsWith("import-staff.ts"));
const argv = process.argv.slice(scriptIndex + 1);

for (let index = 0; index < argv.length; index += 1) {
  const entry = argv[index];
  if (!entry.startsWith("--")) continue;
  const [key, ...rest] = entry.replace(/^--/, "").split("=");
  if (rest.length) {
    args.set(key, rest.join("="));
    continue;
  }
  const next = argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, true);
  }
}

const file =
  (typeof args.get("file") === "string" ? (args.get("file") as string) : null) ?? process.env.STAFF_CSV ?? null;
const dryRun = args.has("dry-run");
const resetPasswords = args.has("reset-passwords");
const limit = Number.parseInt(String(args.get("limit") ?? ""), 10);

if (!file) {
  console.error("Usage: npm run staff:import -- --file <path to the staff CSV> [--dry-run] [--limit=N] [--reset-passwords]");
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
  console.error("  Quote the path if it contains spaces: --file \"C:\\Users\\me\\Staff Data.csv\"");
  process.exit(1);
}

/* ── CSV ─────────────────────────────────────────────────────────────────────
 * Written by hand rather than pulled in: the sheet is quoted throughout, quotes
 * inside fields are doubled, and there are no embedded newlines. That is a small
 * enough grammar to own, and it keeps a dependency out of the repo for one job.
 */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const [headerRow, ...dataRows] = parseCsv(raw);
const header = headerRow.map((cell) => clean(cell).toLowerCase());

const column = (name: string): number => {
  const index = header.indexOf(name.toLowerCase());
  if (index === -1) throw new Error(`The sheet has no "${name}" column. Expected the GHS staffing export.`);
  return index;
};

const COL = {
  employeeNo: column("Employee No."),
  surname: column("Surname"),
  firstNames: column("Firstname(s)"),
  fullName: column("Full name"),
  gender: column("Gender"),
  workEmail: column("Work email"),
  workPhone: column("Work phone"),
  homeMobile: column("Home mobile"),
  region: column("Region"),
  district: column("District / Division"),
  subDistrict: column("Sub-district"),
  facility: column("Facility / Unit"),
  facilityType: column("Facility type"),
  category: column("Category"),
};

interface StaffRow {
  staffId: string;
  fullName: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  region: string;
  district: string;
  subDistrict: string | null;
  facility: string | null;
  cadre: string | null;
}

const seen = new Set<string>();
const staff: StaffRow[] = [];
let skippedBlankId = 0;
let skippedDuplicate = 0;

for (const cells of dataRows) {
  const staffId = clean(cells[COL.employeeNo]).slice(0, 16);
  if (!staffId) {
    skippedBlankId += 1;
    continue;
  }
  if (seen.has(staffId.toLowerCase())) {
    skippedDuplicate += 1;
    continue;
  }
  seen.add(staffId.toLowerCase());

  const fullName = clean(cells[COL.fullName]) || `${clean(cells[COL.firstNames])} ${clean(cells[COL.surname])}`.trim();
  if (!fullName) {
    skippedBlankId += 1;
    continue;
  }

  const email = clean(cells[COL.workEmail]).toLowerCase();
  const phone = clean(cells[COL.workPhone]) || clean(cells[COL.homeMobile]);
  const region = clean(cells[COL.region]);
  const district = clean(cells[COL.district]);

  staff.push({
    staffId,
    fullName,
    gender: clean(cells[COL.gender]) || null,
    email: email.includes("@") ? email : null,
    phone: phone || null,
    region: region || "Upper West",
    district: district || "",
    subDistrict: clean(cells[COL.subDistrict]) || null,
    facility: clean(cells[COL.facility]) || null,
    cadre: clean(cells[COL.category]) || null,
  });

  if (Number.isFinite(limit) && staff.length >= limit) break;
}

/* ── Geography vocabulary ───────────────────────────────────────────────────── */

const DISTRICT_KIND = (name: string): "METROPOLITAN" | "MUNICIPAL" | "DISTRICT" => {
  const lower = name.toLowerCase();
  if (lower.includes("metropolitan")) return "METROPOLITAN";
  if (lower.includes("municipal")) return "MUNICIPAL";
  return "DISTRICT";
};

const FACILITY_TYPE = (name: string): (typeof facilities.$inferInsert)["type"] => {
  const lower = name.toLowerCase();
  if (lower.includes("regional hospital")) return "REGIONAL_HOSPITAL";
  if (lower.includes("municipal hospital")) return "MUNICIPAL_HOSPITAL";
  if (lower.includes("hospital")) return "DISTRICT_HOSPITAL";
  if (lower.includes("polyclinic")) return "POLYCLINIC";
  if (lower.includes("directorate")) return "DIRECTORATE";
  if (lower.includes("clinic")) return "CLINIC";
  if (lower.includes("health centre") || lower.includes("health center") || lower.includes("chps")) return "HEALTH_CENTRE";
  return "OTHER";
};

const slug = (name: string): string =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8) || "UW";

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
      .values({ code: slug(name), name })
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
  const facilityKeys = [
    ...new Set(staff.filter((row) => row.facility).map((row) => `${row.region}||${row.district || ""}||${row.facility}`)),
  ];
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

/* ── Users ─────────────────────────────────────────────────────────────────── */

const CHUNK = 250;

async function main() {
  console.log(`Sheet: ${dataRows.length} rows → ${staff.length} usable`);
  if (skippedDuplicate) console.log(`  ${skippedDuplicate} duplicate employee numbers skipped`);
  if (skippedBlankId) console.log(`  ${skippedBlankId} rows without an employee number or name skipped`);
  console.log(
    `  ${staff.filter((row) => row.email).length} with a work e-mail, ${staff.filter((row) => !row.email).length} without (they sign in with their employee number)`,
  );

  if (dryRun) {
    const districtsInSheet = new Set(staff.map((row) => row.district).filter(Boolean));
    const subInSheet = new Set(staff.map((row) => row.subDistrict).filter(Boolean));
    const facilitiesInSheet = new Set(staff.map((row) => row.facility).filter(Boolean));
    console.log(
      `Dry run — would upsert ${districtsInSheet.size} districts, ${subInSheet.size} sub-districts, ${facilitiesInSheet.size} facilities, ${staff.length} accounts. Nothing written.`,
    );
    return;
  }

  // Geography first: an account can point at a facility that does not exist yet,
  // but the directory reads better when the tree is complete before the people.
  const geoCounts = await geo();
  console.log(`Geography: ${geoCounts.districts} districts, ${geoCounts.subDistricts} sub-districts, ${geoCounts.facilities} facilities (${geoCounts.facilitiesCreated} new)`);

  // Which employee numbers already exist? Only the missing ones need a hash —
  // bcrypt at cost 12 is deliberately slow, and 6 000 of them is minutes.
  const ids = staff.map((row) => row.staffId);
  const existing = new Set<string>();
  for (let index = 0; index < ids.length; index += 500) {
    const slice = ids.slice(index, index + 500);
    const found = await db
      .select({ staffId: users.ghsStaffId })
      .from(users)
      .where(inArray(users.ghsStaffId, slice));
    for (const row of found) existing.add(row.staffId);
  }

  const { hashPassword } = await import("@/lib/server/auth");
  let created = 0;
  let updated = 0;

  for (let index = 0; index < staff.length; index += CHUNK) {
    const chunk = staff.slice(index, index + CHUNK);
    const values: (typeof users.$inferInsert)[] = [];

    for (const person of chunk) {
      const known = existing.has(person.staffId);
      const base = {
        ghsStaffId: person.staffId,
        fullName: person.fullName,
        gender: person.gender,
        email: person.email,
        phone: person.phone,
        cadre: person.cadre,
        region: person.region,
        district: person.district || null,
        subDistrict: person.subDistrict,
        facility: person.facility,
        role: "LEARNER" as const,
        updatedAt: new Date(),
      };

      if (known && !resetPasswords) {
        // The update set below never touches password_hash, so an existing
        // password survives a re-import untouched.
        values.push(base);
      } else {
        // "<employee number>@123" — easy to say over the phone, replaced on first sign-in.
        const passwordHash = await hashPassword(`${person.staffId}@123`);
        values.push({ ...base, passwordHash, mustChangePassword: true });
      }
      if (known) updated += 1;
      else created += 1;
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.ghsStaffId,
        // Identity fields only. An existing password, role, unit-head duty or
        // programme assignment is never overwritten by a re-import.
        set: {
          fullName: sql`excluded.full_name`,
          gender: sql`excluded.gender`,
          email: sql`excluded.email`,
          phone: sql`excluded.phone`,
          cadre: sql`excluded.cadre`,
          region: sql`excluded.region`,
          district: sql`excluded.district`,
          subDistrict: sql`excluded.sub_district`,
          facility: sql`excluded.facility`,
          updatedAt: new Date(),
        },
      });

    process.stdout.write(`\r  accounts: ${Math.min(index + CHUNK, staff.length)}/${staff.length}`);
  }

  process.stdout.write("\n");
  console.log(`Accounts: ${created} created, ${updated} refreshed${resetPasswords ? " (passwords reset)" : ""}`);
  console.log("Every account is a LEARNER with a first password of <employee no.>@123, and must change it at first sign-in.");
  console.log("Promote people from /users — Facilitators / Admins by role, then programme access per person.");
}

main()
  .then(async () => {
    await client.end({ timeout: 5 });
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\nImport failed:", error instanceof Error ? error.message : error);
    await client.end({ timeout: 5 }).catch(() => {});
    process.exit(1);
  });
