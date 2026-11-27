import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPECTED_MIGRATIONS, MIGRATIONS, pendingMigrations } from "@/lib/migrations";

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: JournalEntry[] };

describe("the migration journal", () => {
  it("matches the copy the app ships", () => {
    expect(MIGRATIONS.map((entry) => entry.tag)).toEqual(journal.entries.map((entry) => entry.tag));
    expect(MIGRATIONS.map((entry) => entry.when)).toEqual(journal.entries.map((entry) => entry.when));
    expect(EXPECTED_MIGRATIONS).toBe(journal.entries.length);
  });

  it("has strictly increasing stamps, because drizzle-kit skips anything else", () => {
    // `migrate` applies a file only when its `when` is > the newest recorded
    // created_at. Equal stamps are skipped without an error — which is how 0017
    // stayed unapplied while `db:migrate` reported success.
    for (let i = 1; i < journal.entries.length; i += 1) {
      expect(journal.entries[i].when).toBeGreaterThan(journal.entries[i - 1].when);
    }
  });

  it("indexes the journal entries in order", () => {
    expect(journal.entries.map((entry) => entry.idx)).toEqual(journal.entries.map((_, index) => index));
  });

  it("names the files a database is still missing", () => {
    expect(pendingMigrations(EXPECTED_MIGRATIONS)).toEqual([]);
    expect(pendingMigrations(EXPECTED_MIGRATIONS - 1).map((entry) => entry.tag)).toEqual([
      MIGRATIONS[MIGRATIONS.length - 1].tag,
    ]);
    // 0017 is the file that the timestamp collision silently skipped.
    expect(pendingMigrations(17).map((entry) => entry.tag)).toContain("0017_library_without_marks");
    expect(pendingMigrations(0)).toHaveLength(EXPECTED_MIGRATIONS);
  });
});
