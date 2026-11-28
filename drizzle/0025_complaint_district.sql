-- 0025_complaint_district
--
-- A complaint has always carried a person (`user_id`) and free text about where
-- they work (`region`, `facility`). Neither can be filtered on: the ids were
-- never stored, and the text is what somebody typed. District HR now needs its
-- own queue, so the district becomes a real column.
--
-- The backfill is deliberately conservative. First the person: a complaint filed
-- by somebody whose directory row now names a district inherits it. Then the
-- facility: an exact, case-insensitive name match through facility → sub-district
-- → district. What neither answers stays null, and null means "not in anybody's
-- district" — an administrator still sees it, and no district officer does. That
-- is the right way round: guessing a district would hand a complaint to the wrong
-- officer.

alter table "complaints" add column if not exists "district_id" uuid;

do $$ begin
  alter table "complaints"
    add constraint "complaints_district_id_districts_id_fk"
    foreign key ("district_id") references "public"."districts"("id") on delete set null on update no action;
exception when duplicate_object then null; end $$;

create index if not exists "complaints_district_idx" on "complaints" using btree ("district_id", "created_at");

update "complaints" as c
set "district_id" = u."district_id"
from "users" as u
where c."user_id" = u."id"
  and c."district_id" is null
  and u."district_id" is not null;

update "complaints" as c
set "district_id" = d."id"
from "facilities" as f
join "sub_districts" as s on s."id" = f."sub_district_id"
join "districts" as d on d."id" = s."district_id"
where c."district_id" is null
  and c."facility" is not null
  and lower(btrim(c."facility")) = lower(btrim(f."name"));
