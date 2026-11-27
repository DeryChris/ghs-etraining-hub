/**
 * The GHS staffing sheet, read once and cleaned once.
 *
 * `npm run staff:import` writes the rows straight into Postgres, and
 * `npm run staff:sql` writes the same rows as a `.sql` file. Both must produce
 * the same people with the same employee numbers and the same decisions about
 * dirty columns, so the reading lives here rather than in either script: a
 * second copy of this logic is a second opinion about who works where.
 *
 * ── What the sheet looks like ────────────────────────────────────────────────
 * The GHS export: Employee No., Surname, Firstname(s), Full name, Gender, Work
 * email, Work phone, Home mobile, Region, District / Division, Sub-district,
 * Facility / Unit, Facility type, Category. Quoted throughout, quotes doubled,
 * no embedded newlines — small enough to parse by hand rather than add a
 * dependency for one job.
 *
 * ── What is dirty, and what is done about it ─────────────────────────────────
 *   • `0` and `2147483647` in the phone columns: sentinels for "not recorded",
 *     written as null rather than printed on somebody's profile.
 *   • E-mails that are not addresses at all (`waeastdaha-@2019`), and the same
 *     corporate address on a dozen rows. `users.email` is unique, so a duplicate
 *     is a failed import, not a cosmetic problem: the first row keeps it and the
 *     rest fall back to signing in with their employee number, which is what
 *     most of this sheet does anyway.
 *   • "UpperWest" typed as a region, grade typos, trailing spaces: cleaned, not
 *     corrected. Guessing that "Human ResourceManager" is a grade is somebody
 *     else's job; this files it as written.
 *
 * Nothing here prints anything: no names, no numbers, no addresses. The counts
 * it returns are the only thing that leaves.
 */
import { availableParallelism } from "node:os";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { Worker } from "node:worker_threads";
import type { facilities } from "@/db/schema";

/* ── CSV ───────────────────────────────────────────────────────────────────── */

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

/* ── The shape both writers need ───────────────────────────────────────────── */

export interface StaffRow {
  staffId: string;
  fullName: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  region: string;
  district: string;
  subDistrict: string | null;
  facility: string | null;
  grade: string | null;
}

export interface SheetStats {
  /** Data rows in the file, header excluded. */
  rows: number;
  /** Rows that became a person. */
  usable: number;
  /** Same employee number twice in the sheet. */
  duplicates: number;
  /** No employee number, or no name to file under it. */
  blank: number;
  /** Rows whose e-mail column was not an address. */
  invalidEmails: number;
  /** Second and later rows carrying an address already claimed. */
  sharedEmails: number;
  withEmail: number;
  withoutEmail: number;
}

export interface ParsedSheet {
  rows: StaffRow[];
  stats: SheetStats;
}

/**
 * Placeholders that mean "no number recorded". Kept out of the directory so a
 * profile does not show `2147483647` as somebody's mobile.
 */
const NOT_A_PHONE = new Set(["0", "0000000000", "2147483647", "-", "n/a", "none", "nil"]);

const looksLikeEmail = (value: string): boolean => /^[^\s@<>()[\]",;:]+@[^\s@<>()[\]",;:]+\.[a-z]{2,24}$/i.test(value);

export interface ParseOptions {
  /** Stop after this many usable people. Used by `--limit`. */
  limit?: number;
}

export function parseStaffSheet(file: string, options: ParseOptions = {}): ParsedSheet {
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const [headerRow, ...dataRows] = parseCsv(raw);
  const header = (headerRow ?? []).map((cell) => clean(cell).toLowerCase());

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
    category: column("Category"),
  };

  const seenIds = new Set<string>();
  const claimedEmails = new Set<string>();
  const rows: StaffRow[] = [];
  const stats: SheetStats = {
    rows: dataRows.length,
    usable: 0,
    duplicates: 0,
    blank: 0,
    invalidEmails: 0,
    sharedEmails: 0,
    withEmail: 0,
    withoutEmail: 0,
  };

  for (const cells of dataRows) {
    const staffId = clean(cells[COL.employeeNo]).slice(0, 16);
    if (!staffId) {
      stats.blank += 1;
      continue;
    }
    if (seenIds.has(staffId.toLowerCase())) {
      stats.duplicates += 1;
      continue;
    }

    const fullName = clean(cells[COL.fullName]) || `${clean(cells[COL.firstNames])} ${clean(cells[COL.surname])}`.trim();
    if (!fullName) {
      stats.blank += 1;
      continue;
    }
    seenIds.add(staffId.toLowerCase());

    /* An e-mail is a way in, not a fact about the person: dropping a bad one
     * costs nothing because the employee number is the primary way in. */
    let email: string | null = clean(cells[COL.workEmail]).toLowerCase();
    if (email && !looksLikeEmail(email)) {
      email = null;
      stats.invalidEmails += 1;
    } else if (email && claimedEmails.has(email)) {
      email = null;
      stats.sharedEmails += 1;
    } else if (email) {
      claimedEmails.add(email);
    }
    // An empty cell is "no address", not an empty string: `users.email` is unique
    // and '' would collide with every other blank row.
    email = email || null;

    const phoneRaw = clean(cells[COL.workPhone]) || clean(cells[COL.homeMobile]);
    const phone = NOT_A_PHONE.has(phoneRaw.toLowerCase()) ? null : phoneRaw || null;

    const region = clean(cells[COL.region]);
    const district = clean(cells[COL.district]);

    rows.push({
      staffId,
      fullName,
      gender: clean(cells[COL.gender]) || null,
      email,
      phone,
      region: region ? normalizeRegion(region) : "Upper West",
      district,
      subDistrict: clean(cells[COL.subDistrict]) || null,
      facility: clean(cells[COL.facility]) || null,
      grade: clean(cells[COL.category]) || null,
    });

    if (Number.isFinite(options.limit) && rows.length >= (options.limit as number)) break;
  }

  stats.usable = rows.length;
  stats.withEmail = rows.filter((row) => row.email).length;
  stats.withoutEmail = rows.length - stats.withEmail;
  return { rows, stats };
}

/* ── Geography vocabulary ──────────────────────────────────────────────────── */

export const DISTRICT_KIND = (name: string): "METROPOLITAN" | "MUNICIPAL" | "DISTRICT" => {
  const lower = name.toLowerCase();
  if (lower.includes("metropolitan")) return "METROPOLITAN";
  if (lower.includes("municipal")) return "MUNICIPAL";
  return "DISTRICT";
};

export const FACILITY_TYPE = (name: string): (typeof facilities.$inferInsert)["type"] => {
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

/**
 * The region written the way the product writes it.
 *
 * The sheet says "Upper West", "Upper West Region" and "UpperWest" in the same
 * column, and each spelling used to become its own row in `regions` — which
 * then split every district and facility count three ways. The service covers
 * one region (Upper West), so anything that reduces to `upperwest` is that
 * region; anything else is left exactly as typed rather than guessed at.
 */
export const normalizeRegion = (name: string): string => {
  const squashed = name.toLowerCase().replace(/[^a-z]/g, "");
  if (squashed === "upperwest" || squashed === "upperwestregion") return "Upper West";
  return name
    .replace(/\s+region$/i, "")
    .trim();
};

export const regionSlug = (name: string): string =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8) || "UW";

/* ── Passwords ─────────────────────────────────────────────────────────────── */

/** `<employee number>@123` — easy to say down a phone line, replaced at first sign-in. */
export const defaultPassword = (staffId: string): string => `${staffId}@123`;

/**
 * bcrypt at cost 12 costs about a third of a second, and this sheet has six
 * thousand people: one at a time is half an hour of a terminal that looks
 * frozen. `bcryptjs` is pure JavaScript, so a promise pool buys nothing — the
 * work has to leave the main thread, one worker per core.
 *
 * The import only needs hashes for people it is creating, so a re-run over an
 * existing directory hashes nothing and takes seconds.
 */
const HASH_COST = 12;

export interface HashProgress {
  (done: number, total: number): void;
}

export async function hashPasswords(
  passwords: string[],
  onProgress?: HashProgress,
): Promise<string[]> {
  if (passwords.length === 0) return [];

  const concurrency = Math.max(1, Math.min(availableParallelism?.() ?? 4, 8, passwords.length));

  /* The worker is plain JavaScript on purpose: tsx loads this module, but a
   * worker started from a string cannot go through the TypeScript loader, so it
   * requires bcryptjs by its resolved path instead. */
  const require_ = createRequire(import.meta.url);
  const bcryptPath = require_.resolve("bcryptjs");
  const source = `
    const { parentPort, workerData } = require("node:worker_threads");
    const bcrypt = require(${JSON.stringify(bcryptPath)});
    (async () => {
      const out = [];
      for (const password of workerData.passwords) out.push(await bcrypt.hash(password, workerData.cost));
      parentPort.postMessage(out);
    })().catch((error) => { throw error; });
  `;

  const chunkSize = Math.ceil(passwords.length / concurrency);
  const chunks: string[][] = [];
  for (let index = 0; index < passwords.length; index += chunkSize) {
    chunks.push(passwords.slice(index, index + chunkSize));
  }

  let done = 0;
  const results: string[][] = [];
  try {
    await Promise.all(
      chunks.map(
        (chunk, chunkIndex) =>
          new Promise<void>((resolve, reject) => {
            const worker = new Worker(source, { eval: true, workerData: { passwords: chunk, cost: HASH_COST } });
            worker.once("message", (hashes: string[]) => {
              done += chunk.length;
              onProgress?.(done, passwords.length);
              results[chunkIndex] = hashes;
              void worker.terminate();
              resolve();
            });
            worker.once("error", reject);
            worker.once("exit", (code) => {
              if (code !== 0 && !results[chunkIndex]) reject(new Error(`Password hashing worker exited with code ${code}.`));
            });
          }),
      ),
    );
  } catch {
    /* Workers are an optimisation, never a requirement: a locked-down machine
     * that refuses them still gets its accounts, just slower. */
    const { hash } = await import("bcryptjs");
    const serial: string[] = [];
    for (const password of passwords) {
      serial.push(await hash(password, HASH_COST));
      onProgress?.(serial.length, passwords.length);
    }
    return serial;
  }

  return results.flat();
}

/* ── Shared argument reading ───────────────────────────────────────────────── */

/** `--file x`, `--file=x`, `--dry-run` — all three are things people type. */
export function readFlags(argv: string[], scriptName: string): Map<string, string | true> {
  const args = new Map<string, string | true>();
  const scriptIndex = argv.findIndex((entry) => entry.endsWith(scriptName));
  const rest = argv.slice(scriptIndex === -1 ? 2 : scriptIndex + 1);

  for (let index = 0; index < rest.length; index += 1) {
    const entry = rest[index];
    if (!entry.startsWith("--")) continue;
    const [key, ...value] = entry.replace(/^--/, "").split("=");
    if (value.length) {
      args.set(key, value.join("="));
      continue;
    }
    const next = rest[index + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      index += 1;
    } else {
      args.set(key, true);
    }
  }
  return args;
}

export const flagNumber = (args: Map<string, string | true>, key: string): number | null => {
  const value = args.get(key);
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
