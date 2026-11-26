alter table public.room_push_actions add column paused_at timestamptz;

create function public.room_push_control(p_token uuid, p_action text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  notification public.room_push_actions%rowtype;
  previous_session public.study_room_sessions%rowtype;
  target_room uuid;
  new_session uuid;
  next_token uuid;
  action_time timestamptz;
  ended_time timestamptz;
begin
  select s.room_id into target_room
  from public.room_push_actions a
  join public.study_room_sessions s on s.id = a.session_id
  where a.token = p_token and a.created_at > now() - interval '7 days';
  if not found then return null; end if;

  perform 1 from public.study_rooms
  where id = target_room and is_active for update;
  if not found then return null; end if;

  select * into notification from public.room_push_actions
  where token = p_token and created_at > now() - interval '7 days' for update;
  if not found then return null; end if;

  perform pg_advisory_xact_lock(hashtext(notification.user_id::text));
  perform 1 from public.study_room_members
  where room_id = target_room and user_id = notification.user_id for update;
  if not found then return null; end if;

  select * into previous_session from public.study_room_sessions
  where id = notification.session_id and room_id = target_room
    and user_id = notification.user_id for update;
  if not found then return null; end if;

  action_time := clock_timestamp();
  if p_action = 'pause' then
    if notification.paused_at is not null or previous_session.ended_at is not null
      or previous_session.planned_end_at <= action_time then return null; end if;
    ended_time := greatest(previous_session.started_at, action_time);
    update public.study_room_sessions
    set ended_at = ended_time,
        duration_seconds = floor(extract(epoch from ended_time - previous_session.started_at))::integer
    where id = previous_session.id;
    update public.room_push_actions set paused_at = ended_time where token = p_token;
    next_token := p_token;
  elsif p_action = 'resume' then
    if notification.paused_at is null or previous_session.ended_at is distinct from notification.paused_at
      or exists (
        select 1 from public.study_room_sessions
        where room_id = target_room and user_id = notification.user_id
          and (ended_at is null or started_at > previous_session.started_at)
      ) then return null; end if;

    insert into public.study_room_sessions (room_id, user_id, started_at, task_title)
    values (target_room, notification.user_id, action_time, previous_session.task_title)
    returning id into new_session;
    delete from public.room_push_actions where token = p_token;
    insert into public.room_push_actions (session_id, user_id)
    values (new_session, notification.user_id) returning token into next_token;
  else
    return null;
  end if;

  update public.study_room_members set last_seen_at = action_time
  where room_id = target_room and user_id = notification.user_id;
  update public.study_rooms set updated_at = action_time where id = target_room;
  return next_token;
end;
$$;

revoke all on function public.room_push_control(uuid, text) from public, anon, authenticated;
grant execute on function public.room_push_control(uuid, text) to service_role;

create function public.room_push_group_control(p_tokens uuid[], p_action text)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  token uuid;
  next_token uuid;
  next_tokens uuid[] := '{}';
  matched integer;
  owners integer;
begin
  if cardinality(p_tokens) not between 2 and 50 then return null; end if;

  select count(*), count(distinct a.user_id) into matched, owners
  from public.room_push_actions a where a.token = any(p_tokens);
  if matched <> cardinality(p_tokens) or owners <> 1 then return null; end if;

  -- Follow the single-room room-before-user locking order across the group.
  perform 1 from public.study_rooms r
  where r.id in (
    select s.room_id from public.study_room_sessions s
    join public.room_push_actions a on a.session_id = s.id
    where a.token = any(p_tokens)
  )
  order by r.id for update;

  begin
    foreach token in array p_tokens loop
      next_token := public.room_push_control(token, p_action);
      if next_token is null then raise sqlstate 'P0002'; end if;
      next_tokens := array_append(next_tokens, next_token);
    end loop;
  exception when no_data_found then
    return null;
  end;
  return next_tokens;
end;
$$;

revoke all on function public.room_push_group_control(uuid[], text) from public, anon, authenticated;
grant execute on function public.room_push_group_control(uuid[], text) to service_role;
