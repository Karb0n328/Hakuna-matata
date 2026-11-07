-- An account may have one active session in each room.
create unique index study_room_one_active_per_room_user
  on public.study_room_sessions(room_id,user_id) where ended_at is null;
drop index public.study_room_one_active_per_user;

CREATE OR REPLACE FUNCTION public.study_room_start(p_room_id uuid, p_task_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 update public.study_room_sessions s set
   ended_at=greatest(s.started_at,s.planned_end_at),
   duration_seconds=greatest(0,floor(extract(epoch from s.planned_end_at-s.started_at)))::integer
   where s.user_id=v_user and s.room_id=p_room_id and s.ended_at is null and s.planned_end_at<=v_now;
 select * into v_active from public.study_room_sessions
   where user_id=v_user and room_id=p_room_id and ended_at is null for update;
 if found then
   return jsonb_build_object('started_at',v_active.started_at,'server_now',v_now);
 end if;
 v_finish:=null;
 insert into public.study_room_sessions(room_id,user_id,started_at,planned_end_at,task_title)
   values(p_room_id,v_user,v_now,v_finish,v_task);
 update public.study_room_members set last_seen_at=v_now where room_id=p_room_id and user_id=v_user;
 update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
 return jsonb_build_object('started_at',v_now,'planned_end_at',v_finish,'server_now',v_now);
end $function$;

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
   'member_count',(select count(*) from public.study_room_members x where x.room_id=r.id),
   'today_seconds',mine.today_seconds,'total_seconds',mine.total_seconds,'studying',mine.studying
 ) order by r.updated_at desc),'[]'::jsonb)
 into v_rooms from public.study_rooms r join public.study_room_members m on m.room_id=r.id
 cross join lateral (
   select coalesce(sum(case when s.ended_at is null then
     greatest(0,floor(extract(epoch from least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))
     else s.duration_seconds end),0)::bigint as total_seconds,
     coalesce(sum(greatest(0,floor(extract(epoch from
       least(coalesce(s.ended_at,v_now),coalesce(s.planned_end_at,'infinity'::timestamptz))-
       greatest(s.started_at,v_today_start))))),0)::bigint as today_seconds,
     coalesce(bool_or(s.ended_at is null and coalesce(s.planned_end_at,'infinity'::timestamptz)>v_now),false) as studying
   from public.study_room_sessions s where s.room_id=r.id and s.user_id=v_user
 ) mine
 where m.user_id=v_user and r.is_active;
 select coalesce(sum(s.duration_seconds+case when s.ended_at is null
   then greatest(0,floor(extract(epoch from least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))::integer else 0 end),0)::bigint,
   coalesce(sum(greatest(0,floor(extract(epoch from
     least(coalesce(s.ended_at,v_now),coalesce(s.planned_end_at,'infinity'::timestamptz))
       -greatest(s.started_at,v_today_start))))),0)::bigint
 into v_total,v_today from public.study_room_sessions s where s.user_id=v_user;
 return jsonb_build_object('rooms',v_rooms,'total_seconds',v_total,'today_seconds',v_today,'server_now',v_now);
end $function$;
