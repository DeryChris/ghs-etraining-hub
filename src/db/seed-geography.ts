import { eq } from "drizzle-orm";
import { districts, facilities, regions, subDistricts } from "./schema";
import type { Db } from "./client";
import {
  REGIONS,
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
}> {
  for (const region of REGIONS) {
    await db
      .insert(regions)
      .values(region)
      .onConflictDoUpdate({ target: regions.code, set: { name: region.name } });
  }

  let districtCount = 0;
  let subDistrictCount = 0;
  let facilityCount = 0;

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
    };

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
      .returning();
    districtCount += 1;

    for (const name of district.subDistricts) {
      await db
        .insert(subDistricts)
        .values({ districtId: row.id, name })
        .onConflictDoUpdate({
          target: [subDistricts.districtId, subDistricts.name],
          set: { name },
        });
      subDistrictCount += 1;
    }

    for (const facility of district.facilities) {
      await db
        .insert(facilities)
        .values({
          districtId: row.id,
          name: facility.name,
          type: facility.type,
          ownership: facility.ownership ?? "GHS",
        })
        .onConflictDoUpdate({
          target: [facilities.districtId, facilities.name],
          set: { type: facility.type, ownership: facility.ownership ?? "GHS" },
        });
      facilityCount += 1;
    }
  }

  return {
    regions: REGIONS.length,
    districts: districtCount,
    subDistricts: subDistrictCount,
    facilities: facilityCount,
  };
}
