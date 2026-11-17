create or replace function public.study_room_snapshot_v2(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_teams jsonb;
begin
  -- The existing snapshot authorizes membership and computes the same clocks.
  v_data := public.study_room_snapshot(p_room_id);
  select jsonb_agg(jsonb_build_object(
    'number',t.team_no,'name',t.name,'captain_id',m.user_id,
    'member_limit',t.member_limit,'assigned_count',coalesce(capacity.assigned_count,0),
    'absent_seconds',coalesce(history.absent_seconds,0)
  ) order by t.team_no)
  into v_teams
  from public.study_room_teams t
  left join public.study_room_members m on m.room_id=t.room_id and m.user_id=t.captain_id
  left join (
    select team_no,count(*)::integer as assigned_count
    from public.study_room_team_members where room_id=p_room_id group by team_no
  ) capacity on capacity.team_no=t.team_no
  left join (
    select tm.team_no,sum(s.duration_seconds) as absent_seconds
    from public.study_room_team_members tm
    join public.study_room_sessions s on s.room_id=tm.room_id and s.user_id=tm.user_id
    left join public.study_room_members current_member
      on current_member.room_id=tm.room_id and current_member.user_id=tm.user_id
    where tm.room_id=p_room_id and current_member.user_id is null and s.ended_at is not null
    group by tm.team_no
  ) history on history.team_no=t.team_no
  where t.room_id=p_room_id;
  if v_teams is null then return v_data; end if;

  return v_data || jsonb_build_object(
    'teams',v_teams,
    'members',coalesce((
      select jsonb_agg(member.data || jsonb_build_object('team_number', tm.team_no) order by member.position)
      from jsonb_array_elements(v_data->'members') with ordinality member(data,position)
      left join public.study_room_team_members tm on tm.room_id=p_room_id and tm.user_id=(member.data->>'user_id')::uuid
    ),'[]'::jsonb)
  );
end
$$;
