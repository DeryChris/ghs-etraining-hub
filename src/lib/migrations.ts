/**
 * The migration journal, in TypeScript.
 *
 * `drizzle/meta/_journal.json` is the file drizzle-kit reads, and its `when`
 * stamps are not decoration: `migrate` applies a file only when its stamp is
 * strictly newer than the newest row in `drizzle.__drizzle_migrations`. Four
 * entries once shared one stamp, so 0017 was skipped in silence on every
 * database that ran 0014–0016 — `db:migrate` reported success and the schema
 * stayed one migration behind. The stamps below are strictly increasing, and
 * `src/lib/migrations.test.ts` fails if this list and the journal disagree.
 *
 * Pure module: no database or server-only imports, so tests and the health
 * route can read it without pulling in the client.
 */
export interface MigrationEntry {
  tag: string;
  when: number;
}

export const MIGRATIONS: readonly MigrationEntry[] = [
  { tag: "0000_baseline", when: 1794845477357 },
  { tag: "0001_integrity_and_indexes", when: 1794845496388 },
  { tag: "0002_certificates_unique", when: 1794845707888 },
  { tag: "0003_fat_paladin", when: 1794921592812 },
  { tag: "0004_programme_taxonomy_and_trainings", when: 1794996145596 },
  { tag: "0005_programme_areas_replace_spaces", when: 1794998436637 },
  { tag: "0006_complaints_and_unit_head", when: 1795100000000 },
  { tag: "0007_complaint_thread", when: 1795200000000 },
  { tag: "0008_users_email_index", when: 1795300000000 },
  { tag: "0009_users_password_hash", when: 1795400000000 },
  { tag: "0010_password_reset_tokens", when: 1795500000000 },
  { tag: "0011_training_review_and_resources", when: 1795600000000 },
  { tag: "0012_staff_directory_and_first_login", when: 1795700000000 },
  { tag: "0013_retire_the_award", when: 1795800000000 },
  { tag: "0014_notification_types_for_this_service", when: 1795840000000 },
  { tag: "0015_facility_types_from_the_establishment_list", when: 1795860000000 },
  { tag: "0016_drop_award_columns", when: 1795880000000 },
  { tag: "0017_library_without_marks", when: 1796000000000 },
  { tag: "0018_review_requests", when: 1796100000000 },
  { tag: "0019_complaint_training_and_document_issues", when: 1796400000000 },
  { tag: "0020_retire_the_marks", when: 1796500000000 },
  { tag: "0021_retire_the_signature", when: 1796600000000 },
  { tag: "0022_grade_not_cadre", when: 1796700000000 },
  { tag: "0023_redact_legacy_complaint_passwords", when: 1796800000000 },
  { tag: "0024_district_hr", when: 1796900000000 },
  { tag: "0025_complaint_district", when: 1797000000000 },
];

export const EXPECTED_MIGRATIONS = MIGRATIONS.length;

/** The migrations a database that has applied `applied` files is still missing. */
export function pendingMigrations(applied: number): readonly MigrationEntry[] {
  if (!Number.isFinite(applied) || applied <= 0) return MIGRATIONS;
  return MIGRATIONS.slice(Math.trunc(applied));
}
