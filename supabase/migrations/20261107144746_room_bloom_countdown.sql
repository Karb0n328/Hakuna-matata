ALTER TABLE public.study_rooms ADD COLUMN bloom_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.study_room_snapshot(p_room_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_room public.study_rooms%rowtype;v_members jsonb;v_room_total bigint;v_bloom_started_at timestamptz;v_now timestamptz:=now();
v_today_start timestamptz:=(date_trunc('day',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 select * into v_room from public.study_rooms where id=p_room_id;
 if not found or not exists(select 1 from public.study_room_members where room_id=p_room_id and user_id=v_user)
   then raise exception 'Bu odaya erişim iznin yok.';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'user_id',m.user_id,'username',coalesce(p.username,'Öğrenci'),
   'last_seen_at',m.last_seen_at,
   'look',coalesce(l.look,'{}'::jsonb),
   'seconds',coalesce(t.total_seconds,0),'today_seconds',coalesce(t.today_seconds,0),
   'studying',coalesce(t.studying,false),
   'active_started_at',t.active_started_at,'active_end_at',t.active_end_at,'task_title',t.task_title
 ) order by m.joined_at),'[]'::jsonb)
 into v_members
 from public.study_room_members m
 left join public.profiles p on p.id=m.user_id
 left join public.study_room_looks l on l.user_id=m.user_id
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
 -- Include completed work even when the contributor leaves the room.
 select coalesce(sum(case when s.ended_at is null then
   greatest(0,floor(extract(epoch from least(v_now,coalesce(s.planned_end_at,v_now))-s.started_at)))
   else s.duration_seconds end),0)::bigint
 into v_room_total from public.study_room_sessions s where s.room_id=p_room_id;
 v_bloom_started_at:=v_room.bloom_started_at;
 if v_bloom_started_at is null and v_room.is_active and v_room_total>=400*3600 then
   -- Record the first observed bloom once for every device.
   update public.study_rooms set bloom_started_at=v_now
   where id=p_room_id and bloom_started_at is null and is_active
   returning bloom_started_at into v_bloom_started_at;
   if not found then
     select bloom_started_at into v_bloom_started_at
     from public.study_rooms where id=p_room_id;
   end if;
 end if;
 return jsonb_build_object(
   'room',jsonb_build_object('id',v_room.id,'owner_id',v_room.owner_id,
     'name',v_room.name,'invite_code',v_room.short_code,'mode',v_room.mode,
     'focus_minutes',v_room.focus_minutes,'break_minutes',v_room.break_minutes,
     'phase',v_room.phase,'phase_started_at',v_room.phase_started_at,'is_active',v_room.is_active),
   'members',v_members,'room_total_seconds',v_room_total,'bloom_started_at',v_bloom_started_at,'server_now',v_now);
end $function$;
