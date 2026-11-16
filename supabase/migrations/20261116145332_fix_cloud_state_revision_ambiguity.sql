CREATE OR REPLACE FUNCTION public.hakuna_save_state(p_state jsonb, p_hash text, p_expected_revision bigint, p_device_id text DEFAULT NULL::text)
 RETURNS TABLE(revision bigint, updated_at timestamp with time zone, state_hash text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_revision bigint;
  v_updated timestamptz;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_HASH';
  end if;

  update public.app_state
     set state = p_state,
         state_hash = p_hash,
         revision = public.app_state.revision + 1,
         last_device_id = p_device_id,
         last_synced_at = now(),
         updated_at = now()
   where user_id = v_uid
     and public.app_state.revision = p_expected_revision
   returning public.app_state.revision, public.app_state.updated_at
        into v_revision, v_updated;

  if v_revision is null then
    raise exception 'HAKUNA_REVISION_CONFLICT';
  end if;

  insert into public.state_versions(user_id, revision, state, state_hash, source, device_id)
  values(v_uid, v_revision, p_state, p_hash, 'sync', p_device_id)
  on conflict do nothing;

  return query select v_revision, v_updated, p_hash;
end;
$function$;
