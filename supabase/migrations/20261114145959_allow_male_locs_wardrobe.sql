-- Applied migration exported from production history; preserves every other look rule.
DO $migration$
DECLARE old_definition text; new_definition text;
BEGIN
 SELECT pg_get_constraintdef(oid) INTO STRICT old_definition
 FROM pg_constraint
 WHERE conrelid='public.study_room_looks'::regclass AND conname='study_room_looks_look_check';
 new_definition := replace(old_definition,
   'ARRAY[''''::text, ''fade''::text, ''curls''::text, ''braids''::text]',
   'ARRAY[''''::text, ''fade''::text, ''curls''::text, ''braids''::text, ''locs''::text]');
 IF new_definition = old_definition THEN
   RAISE EXCEPTION 'Expected male hair whitelist not found; no changes made';
 END IF;
 ALTER TABLE public.study_room_looks DROP CONSTRAINT study_room_looks_look_check;
 EXECUTE 'ALTER TABLE public.study_room_looks ADD CONSTRAINT study_room_looks_look_check ' || new_definition;
END $migration$;

