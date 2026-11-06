-- Personal sessions are independent from the optional shared countdown.
CREATE OR REPLACE FUNCTION public.study_room_configure(p_room_id uuid, p_focus_minutes integer, p_break_minutes integer, p_mode text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if p_mode is null or p_mode not in ('shared','free')
   then raise exception 'Geçersiz çalışma modu.';end if;
 if p_focus_minutes not between 5 and 180 or p_break_minutes not between 1 and 60
   then raise exception 'Etüt veya mola süresi geçersiz.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or not v_room.is_active or v_room.owner_id<>v_user
   then raise exception 'Ayarları yalnızca oda sahibi değiştirebilir.';end if;
 if v_room.phase<>'idle' then raise exception 'Ayarları değiştirmek için ortak etüdü durdur.';end if;
 update public.study_rooms
  set focus_minutes=p_focus_minutes,break_minutes=p_break_minutes,
      mode=p_mode,updated_at=clock_timestamp()
  where id=p_room_id;
 return true;
end $function$
;
CREATE OR REPLACE FUNCTION public.study_room_set_mode(p_room_id uuid, p_mode text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if p_mode not in ('shared','free') or p_mode is null then raise exception 'Geçersiz çalışma modu.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or not v_room.is_active or v_room.owner_id<>v_user
   then raise exception 'Modu yalnızca oda sahibi değiştirebilir.';end if;
 if v_room.phase<>'idle' then raise exception 'Modu değiştirmek için ortak etüdü durdur.';end if;
 update public.study_rooms set mode=p_mode,updated_at=clock_timestamp() where id=p_room_id;
 return true;
end $function$
;
CREATE OR REPLACE FUNCTION public.study_room_set_phase(p_room_id uuid, p_phase text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_now timestamptz:=clock_timestamp();
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if p_phase is null or p_phase not in ('idle','focus','break') then raise exception 'Geçersiz etüt aşaması.';end if;
 select * into v_room from public.study_rooms where id=p_room_id for update;
 if not found or v_room.owner_id<>v_user or not v_room.is_active
   then raise exception 'Bu işlemi yalnızca oda sahibi yapabilir.';end if;
 update public.study_rooms set phase=p_phase,
   phase_started_at=case when p_phase='idle' then null
                         when p_phase='focus' then v_now+interval '3 seconds'
                         else v_now end,
   updated_at=v_now where id=p_room_id;
 return true;
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
   'active_started_at',t.active_started_at,'active_end_at',t.active_end_at,'task_title',t.task_title
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
     bool_or(s.ended_at is null and (s.planned_end_at is null or s.planned_end_at>v_now)) as studying,
     (select ss.started_at from public.study_room_sessions ss
       where ss.room_id=p_room_id and ss.user_id=m.user_id and ss.ended_at is null
       order by ss.started_at desc limit 1) as active_started_at,
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
   where s.user_id=v_user and s.ended_at is null and s.planned_end_at<=v_now;
 select * into v_active from public.study_room_sessions
   where user_id=v_user and ended_at is null for update;
 if found then
   if v_active.room_id<>p_room_id then raise exception 'Başka odadaki devam eden etüdünü önce bitir.';end if;
   return jsonb_build_object('started_at',v_active.started_at,'server_now',v_now);
 end if;
 v_finish:=null;
 insert into public.study_room_sessions(room_id,user_id,started_at,planned_end_at,task_title)
   values(p_room_id,v_user,v_now,v_finish,v_task);
 update public.study_room_members set last_seen_at=v_now where room_id=p_room_id and user_id=v_user;
 update public.study_rooms set updated_at=clock_timestamp() where id=p_room_id;
 return jsonb_build_object('started_at',v_now,'planned_end_at',v_finish,'server_now',v_now);
end $function$
;

