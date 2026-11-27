--
-- "Grade", not "cadre": one name for one thing.
--
-- The GHS establishment sheet calls the column "Category", the old portal called
-- it a cadre, and the people it describes call it their grade. "Grade" is what
-- every form, table and import asks for now, so the two columns that held the
-- word are renamed rather than left to be translated in three places. The values
-- do not change, and nothing reads the old names.
--
ALTER TABLE "users" RENAME COLUMN "cadre" TO "grade";
--> statement-breakpoint
ALTER TABLE "programme_areas" RENAME COLUMN "audience_cadre" TO "audience_grade";
