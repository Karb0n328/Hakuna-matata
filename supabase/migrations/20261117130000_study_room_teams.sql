create table public.study_room_teams (
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  team_no integer not null check (team_no between 1 and 30),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  captain_id uuid references auth.users(id) on delete set null,
  primary key (room_id, team_no),
  unique (room_id, captain_id)
);

-- A choice belongs to the room and account, so leaving and rejoining retains it.
create table public.study_room_team_members (
  room_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_no integer not null,
  primary key (room_id, user_id),
  foreign key (room_id, team_no) references public.study_room_teams(room_id, team_no) on delete cascade
);

alter table public.study_room_teams enable row level security;
alter table public.study_room_team_members enable row level security;
revoke all on public.study_room_teams, public.study_room_team_members from public, anon, authenticated;

create function public.study_room_create_teams(p_name text, p_team_count integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_room uuid;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.'; end if;
  if p_team_count is null or p_team_count not between 2 and 30 then
    raise exception 'Takım sayısı 2–30 arasında olmalı.';
  end if;

  v_room := public.study_room_create_v2(p_name, 50, 10, 'shared');
  insert into public.study_room_teams(room_id,team_no,name,captain_id)
  select v_room,n,'Takım ' || n,case when n=1 then v_user end
  from generate_series(1,p_team_count) n;
  insert into public.study_room_team_members(room_id,user_id,team_no)
  values (v_room,v_user,1);
  return v_room;
end
$$;

create function public.study_room_snapshot_v2(p_room_id uuid)
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
    'number',t.team_no,'name',t.name,'captain_id',m.user_id
  ) order by t.team_no)
  into v_teams
  from public.study_room_teams t
  left join public.study_room_members m on m.room_id=t.room_id and m.user_id=t.captain_id
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

create function public.study_room_team_update(
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
begin
  -- Existing join/leave operations take this same lock.
  select owner_id into v_owner
  from public.study_rooms where id=p_room_id and is_active for update;
  if not found or v_user is null or not exists (
    select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user
  ) then raise exception 'Bu odaya erişimin yok.'; end if;

  select captain_id into v_captain from public.study_room_teams
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
    insert into public.study_room_team_members(room_id,user_id,team_no)
    values (p_room_id,v_member,p_team_number) on conflict do nothing;
    if not exists (
      select 1 from public.study_room_team_members
      where room_id=p_room_id and user_id=v_member and team_no=p_team_number
    ) then raise exception 'Takım seçimi kalıcıdır.'; end if;
  end if;

  if p_action='captain' then
    update public.study_room_teams set captain_id=v_member where room_id=p_room_id and team_no=p_team_number;
  end if;

  update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
  return public.study_room_snapshot_v2(p_room_id);
end
$$;

revoke execute on function public.study_room_create_teams(text,integer),
  public.study_room_snapshot_v2(uuid),
  public.study_room_team_update(uuid,text,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.study_room_create_teams(text,integer),
  public.study_room_snapshot_v2(uuid),
  public.study_room_team_update(uuid,text,integer,text,uuid) to authenticated;
