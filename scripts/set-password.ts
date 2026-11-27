import "dotenv/config";
import { hash } from "bcryptjs";
import { eq, or, sql } from "drizzle-orm";
import { client, db } from "../src/db/client";
import { users } from "../src/db/schema";

/**
 * Set an account's password from the command line.
 *
 *   npm run user:password -- --email=head@ghs.gov.gh --password='a long phrase'
 *   npm run user:password -- --id=GHS-000042 --password='a long phrase'
 *   npm run user:password -- 42 'a long phrase'
 *
 * Somebody locked out is the one case where the application cannot help: there is
 * no e-mail delivery yet, so an administrator issues a reset link with
 * `npm run user:reset-password` and hands it over, or — when even that is not
 * possible — sets a known password here and passes it on.
 *
 * The account is identified by e-mail address, by employee number (`GHS-000042`,
 * `000042` or `42` — the digits are what matter, as at sign-in) or by its UUID.
 * The password is hashed with the same bcrypt cost the application uses (12) and
 * is never printed, logged or stored in shell history by this script.
 *
 * Flags:
 *   --email <address>       find by e-mail
 *   --id <staff-id|uuid>    find by employee number or row id
 *   --password <secret>     the new password (10 characters or more)
 *   --must-change           force a change at next sign-in (default: no)
 *   --dry-run               resolve the account and stop
 */
const MIN_LENGTH = 10;

function args(argv: string[]): { flags: Map<string, string | true>; positional: string[] } {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const [rawKey, inline] = token.slice(2).split("=");
    if (inline !== undefined) {
      flags.set(rawKey, inline);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags.set(rawKey, next);
      index += 1;
    } else {
      flags.set(rawKey, true);
    }
  }
  return { flags, positional };
}

function usage(message?: string): never {
  if (message) console.error(`✖ ${message}\n`);
  console.error("Usage:");
  console.error("  npm run user:password -- --email you@ghs.gov.gh --password='a long phrase'");
  console.error("  npm run user:password -- --id GHS-000042 --password='a long phrase'");
  console.error("  npm run user:password -- 42 'a long phrase'");
  console.error("\nOptional: --must-change (ask for a change at next sign-in), --dry-run.");
  process.exit(1);
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function main(): Promise<void> {
  const { flags, positional } = args(process.argv.slice(2));

  const email = typeof flags.get("email") === "string" ? (flags.get("email") as string).trim() : null;
  const id = typeof flags.get("id") === "string" ? (flags.get("id") as string).trim() : positional[0]?.trim() ?? null;
  /* A password on the command line is visible in `ps` while it runs; prefer the
   * flag, but accept the environment for shared machines: PASSWORD=… npm run … */
  const password =
    (typeof flags.get("password") === "string" ? (flags.get("password") as string) : null) ??
    process.env.PASSWORD ??
    positional[1] ??
    null;
  const mustChange = flags.has("must-change");
  const dryRun = flags.has("dry-run");

  if (!email && !id) usage("Say who: --email <address> or --id <staff id / uuid>.");
  if (!password) usage("No password given. Use --password='…' (or PASSWORD=… in the environment).");
  if (password.length < MIN_LENGTH) usage(`Passwords must be at least ${MIN_LENGTH} characters.`);

  const match = email
    ? eq(sql`lower(${users.email})`, email.toLowerCase())
    : looksLikeUuid(id as string)
      ? eq(users.id, id as string)
      : or(
          sql`ltrim(regexp_replace(lower(${users.ghsStaffId}), '[^0-9]', '', 'g'), '0') = ltrim(regexp_replace(${(id as string).toLowerCase()}, '[^0-9]', '', 'g'), '0')`,
          eq(sql`lower(${users.ghsStaffId})`, (id as string).toLowerCase()),
        );

  const rows = await db
    .select({
      id: users.id,
      staffId: users.ghsStaffId,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      isUnitHead: users.isUnitHead,
    })
    .from(users)
    .where(match)
    .limit(5);

  if (rows.length === 0) {
    console.error(`✖ No account matches ${email ?? id}. Nothing was changed.`);
    process.exitCode = 1;
    return;
  }
  if (rows.length > 1) {
    console.error(`✖ That identifier matches ${rows.length} accounts. Use --email, or the exact employee number:`);
    for (const row of rows) console.error(`   ${row.staffId}  ${row.email}  ${row.fullName}`);
    process.exitCode = 1;
    return;
  }

  const person = rows[0];
  if (!person.isActive) {
    console.error(`✖ ${person.fullName} (${person.staffId}) is deactivated. Reactivate the account first.`);
    process.exitCode = 1;
    return;
  }

  console.log(`  account   ${person.fullName}`);
  console.log(`  staff id  ${person.staffId}`);
  console.log(`  email     ${person.email}`);
  console.log(`  role      ${person.role}${person.isUnitHead ? " · unit head" : ""}`);

  if (dryRun) {
    console.log("\n  --dry-run: the password was not changed.");
    return;
  }

  const passwordHash = await hash(password, 12);

  /*
   * Also clear the lockout counters: the usual reason somebody is here is that
   * five bad attempts locked the account, and handing over a working password
   * that still cannot be used for fifteen minutes is not a fix.
   */
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: mustChange,
      failedLoginCount: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, person.id));

  /* The directory is read through caches; drop them so the next page load agrees. */
  console.log(`\n✔ Password set for ${person.fullName} (${person.staffId}).`);
  console.log(`  ${mustChange ? "They must choose a new one at next sign-in." : "It works immediately."}`);
  console.log("  They can sign in with either their employee number or their e-mail address.");
  console.log("  Other sessions stay signed in; this changes the password only.");
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
