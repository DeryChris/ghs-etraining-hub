/**
 * Recomputes the tamper-evident audit chain and reports breaks.
 *
 *   npx tsx scripts/verify-audit-chain.ts
 *
 * Exit code 0 = chain intact, 1 = at least one row was edited, removed or
 * re-ordered. Run it after a restore (docs/qa.md §9) and on a schedule; a silent
 * break is the one failure mode an audit trail cannot tolerate.
 */
import "dotenv/config";
import { client } from "../src/db/client";
import { verifyAuditChain } from "../src/lib/server/audit";

async function main(): Promise<void> {
  const result = await verifyAuditChain();
  if (result.valid) {
    console.log(`✔ Audit chain intact — ${result.checked} entries verified.`);
    return;
  }
  console.error(`✖ Audit chain broken — ${result.breaks} of ${result.checked} entries failed verification.`);
  process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error("✖ Verification failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
