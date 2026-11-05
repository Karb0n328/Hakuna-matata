-- All members see the same server-scheduled 3-2-1 shared-focus countdown.
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
   phase_started_at=case when p_phase='idle' then null
                         when p_phase='focus' then v_now+interval '3 seconds'
                         else v_now end,
   updated_at=v_now where id=p_room_id;
 return true;
end $$;

-- Replace only the start function body; otherwise keep v2 task/expiry semantics.
create or replace function public.study_room_start(p_room_id uuid,p_task_title text default null)
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
 if v_room.mode='shared' then
   if v_room.phase<>'focus' or v_room.phase_started_at is null
     then raise exception 'Ortak etüt henüz başlamadı.';end if;
   if v_now<v_room.phase_started_at
     then raise exception 'Ortak etüt için geri sayım henüz bitmedi.';end if;
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
