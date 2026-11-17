alter table public.study_room_teams
add column member_limit integer check (member_limit between 1 and 30);

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
    'member_limit',t.member_limit,'assigned_count',coalesce(capacity.assigned_count,0)
  ) order by t.team_no)
  into v_teams
  from public.study_room_teams t
  left join public.study_room_members m on m.room_id=t.room_id and m.user_id=t.captain_id
  left join (
    select team_no,count(*)::integer as assigned_count
    from public.study_room_team_members where room_id=p_room_id group by team_no
  ) capacity on capacity.team_no=t.team_no
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

create or replace function public.study_room_team_update(
  p_room_id uuid, p_action text, p_team_number integer,
  p_name text default null, p_captain_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_captain uuid;
  v_member uuid;
  v_limit integer;
  v_previous_team integer;
begin
  -- Existing join/leave operations take this same lock.
  select owner_id into v_owner
  from public.study_rooms where id=p_room_id and is_active for update;
  if not found or v_user is null or not exists (
    select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user
  ) then raise exception 'Bu odaya erişimin yok.'; end if;

  select captain_id,member_limit into v_captain,v_limit from public.study_room_teams
  where room_id=p_room_id and team_no=p_team_number;
  if not found then raise exception 'Takım bulunamadı.'; end if;

  case p_action
    when 'choose' then
      v_member := v_user;
    when 'captain' then
      if v_owner <> v_user then raise exception 'Kaptanı oda sahibi atayabilir.'; end if;
      if not exists (
        select 1 from public.study_room_members where room_id=p_room_id and user_id=p_captain_id
      ) then raise exception 'Kaptan odanın bir üyesi olmalı.'; end if;
      v_member := p_captain_id;
    when 'rename' then
      if v_captain is distinct from v_user then raise exception 'Takım adını kaptanı değiştirebilir.'; end if;
      if p_name is null or char_length(btrim(p_name)) not between 1 and 40 then
        raise exception 'Takım adı 1–40 karakter olmalı.';
      end if;
      update public.study_room_teams set name=btrim(p_name) where room_id=p_room_id and team_no=p_team_number;
    else raise exception 'Geçersiz takım işlemi.';
  end case;

  if v_member is not null then
    select team_no into v_previous_team from public.study_room_team_members
    where room_id=p_room_id and user_id=v_member;
    if found then
      if v_previous_team<>p_team_number then raise exception 'Takım seçimi kalıcıdır.'; end if;
    else
      if v_limit is not null and (
        select count(*) from public.study_room_team_members where room_id=p_room_id and team_no=p_team_number
      )>=v_limit then raise exception 'Bu takım dolu.'; end if;
      insert into public.study_room_team_members(room_id,user_id,team_no)
      values (p_room_id,v_member,p_team_number);
    end if;
  end if;

  if p_action='captain' then
    update public.study_room_teams set captain_id=v_member where room_id=p_room_id and team_no=p_team_number;
  end if;

  update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
  return public.study_room_snapshot_v2(p_room_id);
end
$$;

create function public.study_room_team_manage(
  p_room_id uuid, p_action text, p_team_number integer default null,
  p_member_limit integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team integer;
begin
  -- All team changes take the same room lock, including member selection.
  perform 1 from public.study_rooms where id=p_room_id and owner_id=v_user and is_active for update;
  if not found then raise exception 'Takımları oda sahibi yönetebilir.'; end if;
  if p_member_limit is not null and p_member_limit not between 1 and 30 then
    raise exception 'Kişi sınırı 1–30 arasında olmalı.';
  end if;
  select max(team_no) into v_team from public.study_room_teams where room_id=p_room_id;
  if v_team is null then raise exception 'Bu oda takımsız.'; end if;

  case p_action
    when 'add' then
      if v_team>=30 then raise exception 'Bir odada en fazla 30 takım olabilir.'; end if;
      v_team:=v_team+1;
      insert into public.study_room_teams(room_id,team_no,name,member_limit)
      values (p_room_id,v_team,'Takım ' || v_team,p_member_limit);
    when 'limit' then
      if p_member_limit is not null and p_member_limit<(
        select count(*) from public.study_room_team_members where room_id=p_room_id and team_no=p_team_number
      ) then raise exception 'Sınır, takımda yeri olan kişi sayısından az olamaz.'; end if;
      update public.study_room_teams set member_limit=p_member_limit where room_id=p_room_id and team_no=p_team_number;
      if not found then raise exception 'Takım bulunamadı.'; end if;
    else raise exception 'Geçersiz takım işlemi.';
  end case;

  update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
  return public.study_room_snapshot_v2(p_room_id);
end
$$;

revoke execute on function public.study_room_team_manage(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.study_room_team_manage(uuid,text,integer,integer) to authenticated;
