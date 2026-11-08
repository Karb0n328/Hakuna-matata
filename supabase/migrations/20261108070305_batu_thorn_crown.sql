alter table public.study_room_looks
  drop constraint study_room_looks_look_check,
  add constraint study_room_looks_look_check check (
    jsonb_typeof(look) = 'object' and
    look - array['top','head','face','neck','hand','hair','skin'] = '{}'::jsonb and
    coalesce(look->>'top','') in ('','palm','les','coogi','adidas','fubu','wu','kani','velour','crop','patchwork','varsity','nylon','utility') and
    (coalesce(look->>'head','') in ('','crown','bandana','bucket','fedora','headphones','durag')
      or (look->>'head' = 'batu_thorn_crown' and user_id = '8f2cf782-f4f2-4c85-a9e9-a560c623e6d5'::uuid)) and
    coalesce(look->>'face','') in ('','patch','shades','aviators','hoops','rimless') and
    coalesce(look->>'neck','') in ('','clock','rope','pendant') and
    coalesce(look->>'hand','') in ('','glove','watch') and
    coalesce(look->>'hair','') in ('','fade','curls','braids','bob','buns') and
    coalesce(look->>'skin','') in ('','light','medium','deep')
  );
