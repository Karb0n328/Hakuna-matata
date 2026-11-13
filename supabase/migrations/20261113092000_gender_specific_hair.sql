-- Separate male/female hair keys without changing clothes, accessories or room history.
-- Convert only incompatible existing hair values before adding stricter validation.
UPDATE public.study_room_looks
SET look=jsonb_set(look,'{hair}',to_jsonb('long_wavy'::text),true)
WHERE look->>'gender'='female'
  AND COALESCE(look->>'hair','') NOT IN
    ('long_wavy','long_straight','twin_braids','buns');

UPDATE public.study_room_looks
SET look=jsonb_set(look,'{hair}',to_jsonb('fade'::text),true)
WHERE COALESCE(look->>'gender','male')='male'
  AND COALESCE(look->>'hair','') NOT IN ('','fade','curls','braids');

ALTER TABLE public.study_room_looks
  DROP CONSTRAINT study_room_looks_look_check,
  ADD CONSTRAINT study_room_looks_look_check CHECK (
    jsonb_typeof(look) = 'object'
    AND (look - ARRAY['top','head','face','neck','hand','hair','skin','gender']) = '{}'::jsonb
    AND COALESCE(look->>'gender', 'male') IN ('male','female')
    AND COALESCE(look->>'top', '') IN (
      '','palm','les','coogi','adidas','fubu','wu','kani',
      'velour','crop','patchwork','varsity','nylon','utility'
    )
    AND (
      COALESCE(look->>'head','') IN (
        '','crown','bandana','bucket','fedora','headphones','durag'
      )
      OR (look->>'head'='batu_thorn_crown'
          AND user_id='8f2cf782-f4f2-4c85-a9e9-a560c623e6d5'::uuid)
      OR (look->>'head'='batu_plush_heart_bunny'
          AND user_id='6c5b22a1-a671-4508-9f20-812a7139e785'::uuid)
    )
    AND COALESCE(look->>'face','') IN ('','patch','shades','aviators','hoops','rimless')
    AND COALESCE(look->>'neck','') IN ('','clock','rope','pendant')
    AND COALESCE(look->>'hand','') IN ('','glove','watch')
    AND (
      (COALESCE(look->>'gender','male')='male'
        AND COALESCE(look->>'hair','') IN ('','fade','curls','braids'))
      OR
      (look->>'gender'='female'
        AND COALESCE(look->>'hair','long_wavy')
          IN ('long_wavy','long_straight','twin_braids','buns'))
    )
    AND COALESCE(look->>'skin','') IN ('','light','medium','deep')
  );
