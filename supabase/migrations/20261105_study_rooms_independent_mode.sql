-- Study rooms v2: independent focus, optional personal task, and online desk presence.
alter table public.study_rooms
  add column if not exists mode text not null default 'shared'
    check (mode in ('shared','free'));
alter table public.study_room_sessions
  add column if not exists planned_end_at timestamptz,
  add column if not exists task_title text
    check (task_title is null or char_length(task_title) between 1 and 90);
alter table public.study_room_members
  add column if not exists last_seen_at timestamptz not null default now();

create or replace function public.study_room_set_mode(p_room_id uuid,p_mode text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if p_mode not in ('shared','free') or p_mode is null then raise exception 'Geçersiz çalışma modu.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or not v_room.is_active or v_room.owner_id<>v_user
   then raise exception 'Modu yalnızca oda sahibi değiştirebilir.';end if;
 if v_room.phase<>'idle' then raise exception 'Modu değiştirmek için ortak etüdü durdur.';end if;
 if exists(
   select 1 from public.study_room_sessions
   where room_id=p_room_id and ended_at is null
     and coalesce(planned_end_at,now()+interval '1 minute')>now()
 ) then raise exception 'Mod değişikliğinden önce açık bireysel etütleri bitir.';end if;
 update public.study_rooms set mode=p_mode,updated_at=clock_timestamp() where id=p_room_id;
 return true;
end $$;

create or replace function public.study_room_touch(p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 update public.study_room_members set last_seen_at=clock_timestamp()
   where room_id=p_room_id and user_id=v_user;
 if not found then raise exception 'Bu odanın üyesi değilsin.';end if;
 return true;
end $$;

-- Replace old one-arg RPC: all callers now use the two-arg signature (second optional).
drop function if exists public.study_room_start(uuid);
create function public.study_room_start(p_room_id uuid,p_task_title text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_active public.study_room_sessions%rowtype;
 v_now timestamptz;v_finish timestamptz;v_task text;
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or not v_room.is_active then raise exception 'Oda artık aktif değil.';end if;
 if not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
   then raise exception 'Bu odanın üyesi değilsin.';end if;
 v_task:=nullif(btrim(coalesce(p_task_title,'')),'');
 if v_task is not null and char_length(v_task)>90 then raise exception 'Görev adı 90 karakteri aşamaz.';end if;
 perform pg_advisory_xact_lock(hashtext(v_user::text));
 v_now:=clock_timestamp();
 -- Safe expiry completion for abandoned/finished independent or shared timers.
 update public.study_room_sessions s set
   ended_at=greatest(s.started_at,s.planned_end_at),
   duration_seconds=greatest(0,floor(extract(epoch from s.planned_end_at-s.started_at)))::integer
   where s.user_id=v_user and s.ended_at is null and s.planned_end_at<=v_now;
 select * into v_active from public.study_room_sessions
   where user_id=v_user and ended_at is null for update;
 if found then
   if v_active.room_id<>p_room_id then
     raise exception 'Başka odadaki devam eden etüdünü önce bitir.';end if;
   return jsonb_build_object('started_at',v_active.started_at,'server_now',v_now);
 end if;
 if v_room.mode='shared' then
   if v_room.phase<>'focus' or v_room.phase_started_at is null
     then raise exception 'Ortak etüt henüz başlamadı.';end if;
   v_finish:=v_room.phase_started_at+(v_room.focus_minutes*interval '1 minute');
   if v_now>=v_finish then raise exception 'Ortak etüt tamamlandı. Yeni turu bekle.';end if;
 else
   v_finish:=v_now+(v_room.focus_minutes*interval '1 minute');
 end if;
 insert into public.study_room_sessions(room_id,user_id,started_at,planned_end_at,task_title)
   values(p_room_id,v_user,v_now,v_finish,v_task);
 update public.study_room_members set last_seen_at=v_now where room_id=p_room_id and user_id=v_user;
 update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
 return jsonb_build_object('started_at',v_now,'planned_end_at',v_finish,'server_now',v_now);
end $$;

create or replace function public.study_room_stop(p_room_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_session public.study_room_sessions%rowtype;
 v_now timestamptz:=clock_timestamp();v_end timestamptz;v_seconds integer;
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found then raise exception 'Oda bulunamadı.';end if;
 perform pg_advisory_xact_lock(hashtext(v_user::text));
 select * into v_session from public.study_room_sessions
   where user_id=v_user and room_id=p_room_id and ended_at is null for update;
 if not found then return 0;end if;
 v_end:=greatest(v_session.started_at,least(v_now,
   coalesce(v_session.planned_end_at,v_now)));
 v_seconds:=greatest(0,floor(extract(epoch from v_end-v_session.started_at)))::integer;
 update public.study_room_sessions set ended_at=v_end,duration_seconds=v_seconds where id=v_session.id;
 update public.study_room_members set last_seen_at=v_now where room_id=p_room_id and user_id=v_user;
 update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
 return v_seconds;
end $$;

create or replace function public.study_room_set_phase(p_room_id uuid,p_phase text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if p_phase is null or p_phase not in ('idle','focus','break') then raise exception 'Geçersiz etüt aşaması.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or v_room.owner_id<>v_user or not v_room.is_active
   then raise exception 'Bu işlemi yalnızca oda sahibi yapabilir.';end if;
 if v_room.mode<>'shared' then raise exception 'Serbest modda ortak etüt aşaması değiştirilemez.';end if;
 update public.study_room_sessions s set
   ended_at=greatest(s.started_at,least(v_now,coalesce(s.planned_end_at,v_now))),
   duration_seconds=greatest(0,floor(extract(epoch from
     least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer
   where s.room_id=p_room_id and s.ended_at is null;
 update public.study_rooms set phase=p_phase,
   phase_started_at=case when p_phase='idle' then null else v_now end,
   updated_at=v_now where id=p_room_id;
 return true;
end $$;

create or replace function public.study_room_leave(p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found then raise exception 'Oda bulunamadı.';end if;
 if v_room.owner_id=v_user then raise exception 'Oda sahibi ayrılmak yerine odayı kapatabilir.';end if;
 if not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
   then raise exception 'Bu odanın üyesi değilsin.';end if;
 update public.study_room_sessions s set
   ended_at=greatest(s.started_at,least(v_now,coalesce(s.planned_end_at,v_now))),
   duration_seconds=greatest(0,floor(extract(epoch from
     least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer
   where room_id=p_room_id and user_id=v_user and ended_at is null;
 delete from public.study_room_members where room_id=p_room_id and user_id=v_user;
 update public.study_rooms set updated_at=v_now where id=p_room_id;
 return true;
end $$;

create or replace function public.study_room_close(p_room_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or v_room.owner_id<>v_user then raise exception 'Odayı yalnızca sahibi kapatabilir.';end if;
 if not v_room.is_active then return true;end if;
 update public.study_room_sessions s set
   ended_at=greatest(s.started_at,least(v_now,coalesce(s.planned_end_at,v_now))),
   duration_seconds=greatest(0,floor(extract(epoch from
     least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer
   where room_id=p_room_id and ended_at is null;
 update public.study_rooms set is_active=false,phase='idle',phase_started_at=null,updated_at=v_now where id=p_room_id;
 return true;
end $$;

create or replace function public.study_room_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_rooms jsonb;v_total bigint;v_today bigint;v_now timestamptz:=now();
v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'owner_id',r.owner_id,'name',r.name,'invite_code',r.invite_code,
   'mode',r.mode,'focus_minutes',r.focus_minutes,'break_minutes',r.break_minutes,
   'phase',r.phase,'phase_started_at',r.phase_started_at,
   'member_count',(select count(*) from public.study_room_members x where x.room_id=r.id)
 ) order by r.updated_at desc),'[]'::jsonb)
 into v_rooms from public.study_rooms r join public.study_room_members m on m.room_id=r.id
 where m.user_id=v_user and r.is_active;
 select coalesce(sum(s.duration_seconds+case when s.ended_at is null
   then greatest(0,floor(extract(epoch from least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer else 0 end),0)::bigint,
   coalesce(sum(greatest(0,floor(extract(epoch from
     least(coalesce(s.ended_at,v_now),coalesce(s.planned_end_at,'infinity'::timestamptz))
       -greatest(s.started_at,v_today_start))))),0)::bigint
 into v_total,v_today from public.study_room_sessions s where s.user_id=v_user;
 return jsonb_build_object('rooms',v_rooms,'total_seconds',v_total,'today_seconds',v_today,'server_now',v_now);
end $$;

create or replace function public.study_room_snapshot(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_members jsonb;v_now timestamptz:=now();
v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id;
 if not found or not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
   then raise exception 'Bu odaya erişim iznin yok.';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'user_id',m.user_id,'username',coalesce(p.username,'Öğrenci'),
   'last_seen_at',m.last_seen_at,
   'seconds',coalesce(t.total_seconds,0),'today_seconds',coalesce(t.today_seconds,0),
   'studying',coalesce(t.studying,false),
   'active_end_at',t.active_end_at,'task_title',t.task_title
 ) order by m.joined_at),'[]'::jsonb)
 into v_members
 from public.study_room_members m
 left join public.profiles p on p.id=m.user_id
 left join lateral(
   select coalesce(sum(s.duration_seconds+case when s.ended_at is null
     then greatest(0,floor(extract(epoch from least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer
       else 0 end),0)::bigint as total_seconds,
     coalesce(sum(greatest(0,floor(extract(epoch from
       least(coalesce(s.ended_at,v_now),coalesce(s.planned_end_at,'infinity'::timestamptz))
       -greatest(s.started_at,v_today_start))))),0)::bigint as today_seconds,
     bool_or(s.ended_at is null and s.planned_end_at>v_now
       and (v_room.mode='free' or v_room.phase='focus')) as studying,
     (select ss.planned_end_at from public.study_room_sessions ss
       where ss.room_id=p_room_id and ss.user_id=m.user_id and ss.ended_at is null
       order by ss.started_at desc limit 1) as active_end_at,
     (select ss.task_title from public.study_room_sessions ss
       where ss.room_id=p_room_id and ss.user_id=m.user_id and ss.ended_at is null
       order by ss.started_at desc limit 1) as task_title
   from public.study_room_sessions s
   where s.room_id=p_room_id and s.user_id=m.user_id
 ) t on true where m.room_id=p_room_id;
 return jsonb_build_object(
   'room',jsonb_build_object('id',v_room.id,'owner_id',v_room.owner_id,
     'name',v_room.name,'invite_code',v_room.invite_code,'mode',v_room.mode,
     'focus_minutes',v_room.focus_minutes,'break_minutes',v_room.break_minutes,
     'phase',v_room.phase,'phase_started_at',v_room.phase_started_at,'is_active',v_room.is_active),
   'members',v_members,'server_now',v_now);
end $$;

revoke all on function public.study_room_set_mode(uuid,text) from public,anon;
revoke all on function public.study_room_touch(uuid) from public,anon;
revoke all on function public.study_room_start(uuid,text) from public,anon;
grant execute on function public.study_room_set_mode(uuid,text) to authenticated;
grant execute on function public.study_room_touch(uuid) to authenticated;
grant execute on function public.study_room_start(uuid,text) to authenticated;
