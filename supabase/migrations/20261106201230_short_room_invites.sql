-- Short aliases preserve every existing invite link.
alter table public.study_rooms add column short_code text unique check (short_code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$');

create function public.study_room_short_code_assign()
returns trigger language plpgsql security invoker set search_path='' as $$
declare candidate text; bytes bytea; i integer;
begin
 if new.short_code is not null then return new; end if;
 loop
  bytes:=extensions.gen_random_bytes(8);candidate:='';
  for i in 0..7 loop
   candidate:=candidate||substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',1+(get_byte(bytes,i)%32),1);
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(candidate,812));
  if not exists(select 1 from public.study_rooms where short_code=candidate) then
   new.short_code:=candidate;return new;
  end if;
 end loop;
end $$;
revoke all on function public.study_room_short_code_assign() from public,anon,authenticated;
create trigger study_room_short_code before insert or update of short_code on public.study_rooms for each row execute function public.study_room_short_code_assign();
update public.study_rooms set short_code=null where short_code is null;
alter table public.study_rooms alter column short_code set not null;

CREATE OR REPLACE FUNCTION public.study_room_join(p_invite_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
  if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
  select * into v_room from public.study_rooms
    where (invite_code=upper(regexp_replace(coalesce(p_invite_code,''),'[[:space:]-]','','g')) or short_code=upper(regexp_replace(coalesce(p_invite_code,''),'[[:space:]-]','','g'))) and is_active for update;
  if not found then raise exception 'Davet kodu geçersiz veya oda kapalı.';end if;
  if not exists(select 1 from public.study_room_members where room_id=v_room.id and user_id=v_user)
    and (select count(*) from public.study_room_members where room_id=v_room.id)>=30
    then raise exception 'Oda dolu (en fazla 30 kişi).';end if;
  insert into public.study_room_members(room_id,user_id) values(v_room.id,v_user) on conflict do nothing;
  update public.study_rooms set updated_at=clock_timestamp() where id=v_room.id;
  return v_room.id;
end $function$
;

CREATE OR REPLACE FUNCTION public.study_room_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_rooms jsonb;v_total bigint;v_today bigint;v_now timestamptz:=now();
v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'owner_id',r.owner_id,'name',r.name,'invite_code',r.short_code,
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
end $function$
;

CREATE OR REPLACE FUNCTION public.study_room_snapshot(p_room_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
     'name',v_room.name,'invite_code',v_room.short_code,'mode',v_room.mode,
     'focus_minutes',v_room.focus_minutes,'break_minutes',v_room.break_minutes,
     'phase',v_room.phase,'phase_started_at',v_room.phase_started_at,'is_active',v_room.is_active),
   'members',v_members,'server_now',v_now);
end $function$
;

