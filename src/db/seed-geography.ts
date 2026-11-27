import { and, eq, sql } from "drizzle-orm";
import { districts, facilities, regions, subDistricts, trainingSessions, users } from "./schema";
import type { Db } from "./client";
import {
  DISTRICT_RENAMES,
  REGIONS,
  RETIRED_PILOT_FACILITIES,
  UPPER_WEST_DISTRICTS,
  UPPER_WEST_REGION_CODE,
} from "./data/geography";

/**
 * Reference geography, separated from the demo content.
 *
 * The full seeder also creates an administrator, a facilitator and three starter
 * materials — fine on a laptop, wrong on a live database that already has real
 * accounts. Geography is the one part a real deployment genuinely needs on day
 * one (the training form cannot go below "region" without it), so it lives here
 * and both the seeder and `npm run db:seed:geography` call it.
 *
 * Everything upserts on its natural key, so re-running after GHS supplies a
 * fuller facility list adds rows instead of duplicating them.
 *
 * The file it seeds from now carries the whole establishment list, which means a
 * database seeded from the older pilot subset needs reconciling, not just adding
 * to: district spellings changed, and a unit that is no longer listed should stop
 * being offered. Both are handled here rather than in a migration, because both
 * are data decisions that need to run again whenever the list is replaced.
 *
 * No `server-only` import on purpose: this module runs under `npm run db:seed`
 * and `npm run db:seed:geography`, and that guard throws in a plain Node process.
 * It belongs on modules a Client Component must never import, not on a seeder.
 */
export async function seedGeography(
  db: Db,
): Promise<{
  regions: number;
  districts: number;
  subDistricts: number;
  facilities: number;
  renamed: number;
  retired: number;
}> {
  for (const region of REGIONS) {
    await db
      .insert(regions)
      .values(region)
      .onConflictDoUpdate({ target: regions.code, set: { name: region.name } });
  }

  const [upperWest] = await db
    .select()
    .from(regions)
    .where(eq(regions.code, UPPER_WEST_REGION_CODE))
    .limit(1);
  if (!upperWest)
    return {
      regions: REGIONS.length,
      districts: 0,
      subDistricts: 0,
      facilities: 0,
      renamed: 0,
      retired: 0,
    };

  const renamed = await reconcileDistrictNames(db, upperWest.id);
  const retired = await retirePilotFacilities(db);

  let districtCount = 0;
  let subDistrictCount = 0;
  let facilityCount = 0;

  for (const district of UPPER_WEST_DISTRICTS) {
    const [row] = await db
      .insert(districts)
      .values({
        regionId: upperWest.id,
        name: district.name,
        kind: district.kind,
        capital: district.capital,
      })
      .onConflictDoUpdate({
        target: [districts.regionId, districts.name],
        set: { kind: district.kind, capital: district.capital },
      })
      .returning({ id: districts.id });
    districtCount += 1;

    // Sub-district ids by lower-cased name, so a facility can be placed in the
    // sub-district the list puts it in without a second query per facility.
    const subDistrictIds = new Map<string, string>();
    for (const name of district.subDistricts) {
      const [sub] = await db
        .insert(subDistricts)
        .values({ districtId: row.id, name })
        .onConflictDoUpdate({
          target: [subDistricts.districtId, subDistricts.name],
          set: { name },
        })
        .returning({ id: subDistricts.id });
      subDistrictIds.set(name.toLowerCase(), sub.id);
      subDistrictCount += 1;
    }

    for (const facility of district.facilities) {
      const subDistrictId = facility.subDistrict
        ? (subDistrictIds.get(facility.subDistrict.toLowerCase()) ?? null)
        : null;
      await db
        .insert(facilities)
        .values({
          districtId: row.id,
          subDistrictId,
          name: facility.name,
          type: facility.type,
          ownership: facility.ownership ?? "GHS",
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [facilities.districtId, facilities.name],
          // `isActive: true` matters for the same reason `retirePilotFacilities`
          // exists: a unit that comes back in a later list comes back usable.
          set: { type: facility.type, ownership: facility.ownership ?? "GHS", subDistrictId, isActive: true },
        });
      facilityCount += 1;
    }
  }

  return {
    regions: REGIONS.length,
    districts: districtCount,
    subDistricts: subDistrictCount,
    facilities: facilityCount,
    renamed,
    retired,
  };
}

/**
 * Move a database from the pilot subset's district spellings to the list's.
 *
 * Two cases, and the second is the one that actually happens: the pilot seeder
 * wrote "Nadowli-Kaleo" while the staff importer, reading the same list this file
 * now carries, wrote "Nadowli Kaleo" — so the database holds both, and simply
 * renaming one onto the other would collide on (region, name). When both exist
 * the old row is folded into the new one: its sub-districts and facilities are
 * re-pointed (or merged where the names match), any training placed in it is
 * moved, and the empty district is removed. Nothing a person sees changes except
 * that the duplicate disappears.
 */
async function reconcileDistrictNames(db: Db, regionId: string): Promise<number> {
  let moved = 0;

  for (const { from, to } of DISTRICT_RENAMES) {
    const [legacy] = await db
      .select({ id: districts.id })
      .from(districts)
      .where(and(eq(districts.regionId, regionId), sql`lower(${districts.name}) = ${from.toLowerCase()}`))
      .limit(1);
    if (!legacy) continue;

    const [target] = await db
      .select({ id: districts.id })
      .from(districts)
      .where(and(eq(districts.regionId, regionId), sql`lower(${districts.name}) = ${to.toLowerCase()}`))
      .limit(1);

    if (!target) {
      await db.update(districts).set({ name: to }).where(eq(districts.id, legacy.id));
      moved += 1;
    } else {
      await foldDistrict(db, legacy.id, target.id);
      moved += 1;
    }

    // People carry their district as text on the account; the old spelling would
    // otherwise leave them outside every district-scoped list.
    await db
      .update(users)
      .set({ district: to })
      .where(sql`lower(${users.district}) = ${from.toLowerCase()}`);
  }

  return moved;
}

/** Folds one district row into another and removes the leftover. */
async function foldDistrict(db: Db, legacyId: string, targetId: string): Promise<void> {
  const legacySubs = await db
    .select({ id: subDistricts.id, name: subDistricts.name })
    .from(subDistricts)
    .where(eq(subDistricts.districtId, legacyId));
  const targetSubs = await db
    .select({ id: subDistricts.id, name: subDistricts.name })
    .from(subDistricts)
    .where(eq(subDistricts.districtId, targetId));
  const targetSubByName = new Map(targetSubs.map((row) => [row.name.toLowerCase(), row.id]));

  for (const sub of legacySubs) {
    const twin = targetSubByName.get(sub.name.toLowerCase());
    if (twin) {
      await db.update(facilities).set({ subDistrictId: twin }).where(eq(facilities.subDistrictId, sub.id));
      await db.update(trainingSessions).set({ subDistrictId: twin }).where(eq(trainingSessions.subDistrictId, sub.id));
      await db.delete(subDistricts).where(eq(subDistricts.id, sub.id));
    } else {
      await db.update(subDistricts).set({ districtId: targetId }).where(eq(subDistricts.id, sub.id));
    }
  }

  const legacyFacilities = await db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.districtId, legacyId));
  const targetFacilities = await db
    .select({ id: facilities.id, name: facilities.name })
    .from(facilities)
    .where(eq(facilities.districtId, targetId));
  const targetFacilityByName = new Map(targetFacilities.map((row) => [row.name.toLowerCase(), row.id]));

  for (const facility of legacyFacilities) {
    const twin = targetFacilityByName.get(facility.name.toLowerCase());
    if (twin) {
      await db.update(trainingSessions).set({ facilityId: twin }).where(eq(trainingSessions.facilityId, facility.id));
      await db.delete(facilities).where(eq(facilities.id, facility.id));
    } else {
      await db.update(facilities).set({ districtId: targetId }).where(eq(facilities.id, facility.id));
    }
  }

  await db.update(trainingSessions).set({ districtId: targetId }).where(eq(trainingSessions.districtId, legacyId));
  await db.delete(districts).where(eq(districts.id, legacyId));
}

/**
 * Deactivate the handful of units the pilot subset carried that the establishment
 * list does not. Deactivated, not deleted: a training recorded against one keeps
 * its history, but the unit stops being offered in the training form.
 */
async function retirePilotFacilities(db: Db): Promise<number> {
  let retired = 0;
  for (const name of RETIRED_PILOT_FACILITIES) {
    const rows = await db
      .update(facilities)
      .set({ isActive: false })
      .where(and(sql`lower(${facilities.name}) = ${name.toLowerCase()}`, eq(facilities.isActive, true)))
      .returning({ id: facilities.id });
    retired += rows.length;
  }
  return retired;
}
