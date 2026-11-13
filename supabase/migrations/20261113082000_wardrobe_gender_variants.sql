-- The new Character > Kadın/Erkek selection is stored with the existing
-- outfit JSON so room snapshots show the same avatar to every member.
-- Older looks without gender remain valid (rendered as male).
-- All exclusive wearable owner checks remain unchanged.
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
    AND COALESCE(look->>'hair','') IN ('','fade','curls','braids','bob','buns')
    AND COALESCE(look->>'skin','') IN ('','light','medium','deep')
  );
