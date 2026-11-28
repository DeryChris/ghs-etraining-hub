/**
 * Load `.env.local` and `.env` for the ops scripts, the way Next.js does.
 *
 * `import "dotenv/config"` reads `.env` and nothing else. Every script in
 * `scripts/` used it, and `.env.example` tells people to copy their values into
 * `.env.local` — the file Next.js reads and dotenv does not. So the app worked
 * and `npm run db:doctor`, `staff:import`, `db:apply` and the rest all reported
 * "DIRECT_URL is not set" on a machine that had it set.
 *
 * Order matters twice over:
 *   * Within the files, `.env.local` wins — the same rule Next.js applies, so
 *     the app and these scripts cannot disagree about the database.
 *   * A variable exported in the shell still wins over both, because dotenv
 *     never overwrites a key that is already in `process.env`. That keeps
 *     `DIRECT_URL=… npm run db:apply` working as an override.
 */
import { existsSync } from "node:fs";
import { config } from "dotenv";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) config({ path: file });
}
