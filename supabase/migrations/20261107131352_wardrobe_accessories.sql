alter table public.study_room_looks
  drop constraint study_room_looks_look_check,
  add constraint study_room_looks_look_check check (
    jsonb_typeof(look) = 'object' and
    look - array['top','head','face','neck','hand','hair','skin'] = '{}'::jsonb and
    coalesce(look->>'top','') in ('','palm','les','coogi','adidas','fubu','wu','kani') and
    coalesce(look->>'head','') in ('','crown','bandana','bucket','fedora','headphones') and
    coalesce(look->>'face','') in ('','patch','shades','aviators') and
    coalesce(look->>'neck','') in ('','clock','rope','pendant') and
    coalesce(look->>'hand','') in ('','glove','watch') and
    coalesce(look->>'hair','') in ('','fade','curls','braids') and
    coalesce(look->>'skin','') in ('','light','medium','deep')
  );
