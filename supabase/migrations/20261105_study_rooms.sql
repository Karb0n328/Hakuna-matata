-- Hakuna Matata shared study rooms. All mutations go through authenticated, checked RPCs.
-- No existing user or plan data is altered.
create table if not exists public.study_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 60),
  invite_code text not null unique check (invite_code ~ '^[0-9A-F]{18}$'),
  focus_minutes integer not null default 50 check (focus_minutes between 5 and 180),
  break_minutes integer not null default 10 check (break_minutes between 1 and 60),
  phase text not null default 'idle' check (phase in ('idle','focus','break')),
  phase_started_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.study_room_members (
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create index if not exists study_room_members_user_idx on public.study_room_members(user_id);
create table if not exists public.study_room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  constraint study_room_sessions_end_check check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists study_room_one_active_per_user
  on public.study_room_sessions(user_id) where ended_at is null;
create index if not exists study_room_sessions_room_user_idx
  on public.study_room_sessions(room_id,user_id,started_at desc);

alter table public.study_rooms enable row level security;
alter table public.study_room_members enable row level security;
alter table public.study_room_sessions enable row level security;
revoke all on public.study_rooms, public.study_room_members, public.study_room_sessions from anon, authenticated;
grant select on public.study_rooms, public.study_room_members, public.study_room_sessions to authenticated;

-- Membership's policy only checks the current row; room policy therefore has no RLS recursion.
create policy "study_room_members_read_self" on public.study_room_members
  for select to authenticated using (user_id=(select auth.uid()));
create policy "study_rooms_read_members" on public.study_rooms
  for select to authenticated using (
    exists(select 1 from public.study_room_members m where m.room_id=id and m.user_id=(select auth.uid()))
  );
create policy "study_sessions_read_self" on public.study_room_sessions
  for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.study_room_create(
  p_name text,p_focus_minutes integer default 50,p_break_minutes integer default 10
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_id uuid;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  if char_length(btrim(coalesce(p_name,''))) not between 3 and 60
    then raise exception 'Oda adı 3-60 karakter olmalı.';end if;
  if p_focus_minutes not between 5 and 180 or p_break_minutes not between 1 and 60
    then raise exception 'Etüt veya mola süresi geçersiz.';end if;
  if (select count(*) from public.study_rooms where owner_id=v_user and is_active)>=10
    then raise exception 'En fazla 10 aktif oda oluşturabilirsin.';end if;
  insert into public.study_rooms(owner_id,name,invite_code,focus_minutes,break_minutes)
  values(v_user,btrim(p_name),
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),
    p_focus_minutes,p_break_minutes) returning id into v_id;
  insert into public.study_room_members(room_id,user_id) values(v_id,v_user);
  return v_id;
end $$;

create or replace function public.study_room_join(p_invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms
    where invite_code=upper(btrim(coalesce(p_invite_code,''))) and is_active for update;
  if not found then raise exception 'Davet kodu geçersiz veya oda kapalı.';end if;
  if not exists(select 1 from public.study_room_members where room_id=v_room.id and user_id=v_user)
    and (select count(*) from public.study_room_members where room_id=v_room.id)>=30
    then raise exception 'Oda dolu (en fazla 30 kişi).';end if;
  insert into public.study_room_members(room_id,user_id) values(v_room.id,v_user) on conflict do nothing;
  update public.study_rooms set updated_at=clock_timestamp() where id=v_room.id;
  return v_room.id;
end $$;

create or replace function public.study_room_leave(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();v_end timestamptz;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found then raise exception 'Oda bulunamadı.';end if;
  if v_room.owner_id=v_user then raise exception 'Oda sahibi ayrılmak yerine odayı kapatabilir.';end if;
  if not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
    then raise exception 'Bu odanın üyesi değilsin.';end if;
  v_end:=case when v_room.phase='focus'
    then least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute'))
    else v_now end;
  update public.study_room_sessions s set
    ended_at=greatest(s.started_at,v_end),
    duration_seconds=greatest(0,floor(extract(epoch from v_end-s.started_at)))::integer
    where room_id=p_room_id and user_id=v_user and ended_at is null;
  delete from public.study_room_members where room_id=p_room_id and user_id=v_user;
  update public.study_rooms set updated_at=v_now where id=p_room_id;
  return true;
end $$;

create or replace function public.study_room_settings(
  p_room_id uuid,p_focus_minutes integer,p_break_minutes integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found or v_room.owner_id<>v_user or not v_room.is_active
    then raise exception 'Bu işlemi yalnızca oda sahibi yapabilir.';end if;
  if v_room.phase<>'idle' then raise exception 'Süreyi değiştirmek için önce etüdü durdur.';end if;
  if p_focus_minutes not between 5 and 180 or p_break_minutes not between 1 and 60
    then raise exception 'Etüt veya mola süresi geçersiz.';end if;
  update public.study_rooms set focus_minutes=p_focus_minutes,break_minutes=p_break_minutes,
    updated_at=clock_timestamp() where id=p_room_id;
  return true;
end $$;

create or replace function public.study_room_set_phase(p_room_id uuid,p_phase text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();v_end timestamptz;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  if p_phase is null or p_phase not in ('idle','focus','break') then raise exception 'Geçersiz etüt aşaması.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found or v_room.owner_id<>v_user or not v_room.is_active
    then raise exception 'Bu işlemi yalnızca oda sahibi yapabilir.';end if;
  v_end:=case when v_room.phase='focus'
    then least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute'))
    else v_now end;
  update public.study_room_sessions s set
    ended_at=greatest(s.started_at,v_end),
    duration_seconds=greatest(0,floor(extract(epoch from v_end-s.started_at)))::integer
    where s.room_id=p_room_id and s.ended_at is null;
  update public.study_rooms set phase=p_phase,
    phase_started_at=case when p_phase='idle' then null else v_now end,
    updated_at=v_now where id=p_room_id;
  return true;
end $$;

create or replace function public.study_room_start(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_active public.study_room_sessions%rowtype;v_now timestamptz;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found or not v_room.is_active then raise exception 'Oda artık aktif değil.';end if;
  if not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
    then raise exception 'Bu odanın üyesi değilsin.';end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  v_now:=clock_timestamp();
  select * into v_active from public.study_room_sessions where user_id=v_user and ended_at is null for update;
  if found then
    if v_active.room_id<>p_room_id then raise exception 'Başka bir odada devam eden etüdünü önce bitir.';end if;
    return jsonb_build_object('started_at',v_active.started_at,'server_now',v_now);
  end if;
  if v_room.phase<>'focus' or v_room.phase_started_at is null or
    v_now>=v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute')
    then raise exception 'Çalışma süresi başlamadı veya tamamlandı. Oda sahibinin yeni etüdü başlatmasını bekle.';end if;
  insert into public.study_room_sessions(room_id,user_id,started_at)
    values(p_room_id,v_user,v_now);
  update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
  return jsonb_build_object('started_at',v_now,'server_now',v_now);
end $$;

create or replace function public.study_room_stop(p_room_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_session public.study_room_sessions%rowtype;v_now timestamptz:=clock_timestamp();v_end timestamptz;v_seconds integer;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found then raise exception 'Oda bulunamadı.';end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  select * into v_session from public.study_room_sessions
    where user_id=v_user and room_id=p_room_id and ended_at is null for update;
  if not found then return 0;end if;
  v_end:=case when v_room.phase='focus'
    then least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute'))
    else v_now end;
  v_end:=greatest(v_session.started_at,v_end);
  v_seconds:=greatest(0,floor(extract(epoch from v_end-v_session.started_at)))::integer;
  update public.study_room_sessions set ended_at=v_end,duration_seconds=v_seconds where id=v_session.id;
  update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
  return v_seconds;
end $$;

create or replace function public.study_room_close(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();v_end timestamptz;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id for update;
  if not found or v_room.owner_id<>v_user then raise exception 'Odayı yalnızca sahibi kapatabilir.';end if;
  if not v_room.is_active then return true;end if;
  v_end:=case when v_room.phase='focus'
    then least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute'))
    else v_now end;
  update public.study_room_sessions s set
    ended_at=greatest(s.started_at,v_end),
    duration_seconds=greatest(0,floor(extract(epoch from v_end-s.started_at)))::integer
    where s.room_id=p_room_id and s.ended_at is null;
  update public.study_rooms set is_active=false,phase='idle',phase_started_at=null,updated_at=v_now where id=p_room_id;
  return true;
end $$;

-- Include running focus time, but never time after the scheduled focus deadline.
create or replace function public.study_room_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_rooms jsonb;v_total bigint;v_today bigint;
v_now timestamptz:=now();v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'owner_id',r.owner_id,'name',r.name,'invite_code',r.invite_code,
      'focus_minutes',r.focus_minutes,'break_minutes',r.break_minutes,
      'phase',r.phase,'phase_started_at',r.phase_started_at,
      'member_count',(select count(*) from public.study_room_members x where x.room_id=r.id)
    ) order by r.updated_at desc),'[]'::jsonb)
    into v_rooms from public.study_rooms r join public.study_room_members m on m.room_id=r.id
    where m.user_id=v_user and r.is_active;
  select coalesce(sum(s.duration_seconds + case when s.ended_at is null
      then greatest(0,floor(extract(epoch from
        least(v_now,r.phase_started_at+(r.focus_minutes*interval '1 minute'))-s.started_at)))::integer
      else 0 end),0)::bigint,
    coalesce(sum(greatest(0,floor(extract(epoch from
      coalesce(s.ended_at,least(v_now,r.phase_started_at+(r.focus_minutes*interval '1 minute')))
      - greatest(s.started_at,v_today_start))))),0)::bigint
    into v_total,v_today
    from public.study_room_sessions s join public.study_rooms r on r.id=s.room_id
    where s.user_id=v_user;
  return jsonb_build_object('rooms',v_rooms,'total_seconds',v_total,'today_seconds',v_today,'server_now',v_now);
end $$;

create or replace function public.study_room_snapshot(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_members jsonb;v_now timestamptz:=now();
v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms where id=p_room_id;
  if not found or not exists (select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
    then raise exception 'Bu odaya erişim iznin yok.';end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',m.user_id,'username',coalesce(p.username,'Öğrenci'),
    'seconds',coalesce(t.total_seconds,0),'today_seconds',coalesce(t.today_seconds,0),
    'studying',coalesce(t.studying,false)) order by m.joined_at),'[]'::jsonb)
    into v_members
    from public.study_room_members m left join public.profiles p on p.id=m.user_id
    left join lateral (
      select coalesce(sum(s.duration_seconds + case when s.ended_at is null
        then greatest(0,floor(extract(epoch from
          least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute'))-s.started_at)))::integer
        else 0 end),0)::bigint as total_seconds,
        coalesce(sum(greatest(0,floor(extract(epoch from
          coalesce(s.ended_at,least(v_now,v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute')))
            - greatest(s.started_at,v_today_start))))),0)::bigint as today_seconds,
        bool_or(s.ended_at is null and v_room.phase='focus'
          and v_now<v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute')) as studying
      from public.study_room_sessions s where s.room_id=p_room_id and s.user_id=m.user_id
    ) t on true
    where m.room_id=p_room_id;
  return jsonb_build_object(
    'room',jsonb_build_object(
      'id',v_room.id,'owner_id',v_room.owner_id,'name',v_room.name,'invite_code',v_room.invite_code,
      'focus_minutes',v_room.focus_minutes,'break_minutes',v_room.break_minutes,
      'phase',v_room.phase,'phase_started_at',v_room.phase_started_at,'is_active',v_room.is_active),
    'members',v_members,'server_now',v_now);
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly close every entry point.
revoke all on function public.study_room_create(text,integer,integer) from public,anon;
revoke all on function public.study_room_join(text) from public,anon;
revoke all on function public.study_room_leave(uuid) from public,anon;
revoke all on function public.study_room_settings(uuid,integer,integer) from public,anon;
revoke all on function public.study_room_set_phase(uuid,text) from public,anon;
revoke all on function public.study_room_start(uuid) from public,anon;
revoke all on function public.study_room_stop(uuid) from public,anon;
revoke all on function public.study_room_close(uuid) from public,anon;
revoke all on function public.study_room_overview() from public,anon;
revoke all on function public.study_room_snapshot(uuid) from public,anon;
grant execute on function public.study_room_create(text,integer,integer) to authenticated;
grant execute on function public.study_room_join(text) to authenticated;
grant execute on function public.study_room_leave(uuid) to authenticated;
grant execute on function public.study_room_settings(uuid,integer,integer) to authenticated;
grant execute on function public.study_room_set_phase(uuid,text) to authenticated;
grant execute on function public.study_room_start(uuid) to authenticated;
grant execute on function public.study_room_stop(uuid) to authenticated;
grant execute on function public.study_room_close(uuid) to authenticated;
grant execute on function public.study_room_overview() to authenticated;
grant execute on function public.study_room_snapshot(uuid) to authenticated;

-- Member-visible room update events; session and other data remain RLS-protected.
do $$begin
 if not exists(select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='study_rooms')
 then alter publication supabase_realtime add table public.study_rooms;end if;
end $$;
