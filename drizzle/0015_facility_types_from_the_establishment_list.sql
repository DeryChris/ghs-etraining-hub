-- 0015_facility_types_from_the_establishment_list.sql
-- The establishment list puts staff in CHPS compounds (the majority) and in
-- regional service units — stores, the mechanical workshop, port health, RCH —
-- that are neither hospitals, health centres nor directorates. Without these two
-- values those 350-odd units have to be filed as something they are not.
ALTER TYPE "facility_type" ADD VALUE IF NOT EXISTS 'CHPS_COMPOUND';
ALTER TYPE "facility_type" ADD VALUE IF NOT EXISTS 'SERVICE_UNIT';
