-- Atomic room mode and duration updates, plus atomic room creation.
create or replace function public.study_room_create_v2(
 p_name text,p_focus_minutes integer default 50,p_break_minutes integer default 10,
 p_mode text default 'shared'
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_mode is null or p_mode not in ('shared','free')
   then raise exception 'Geçersiz çalışma modu.';end if;
 v_id:=public.study_room_create(p_name,p_focus_minutes,p_break_minutes);
 if p_mode='free' then perform public.study_room_set_mode(v_id,p_mode);end if;
 return v_id;
end $$;

create or replace function public.study_room_configure(
 p_room_id uuid,p_focus_minutes integer,p_break_minutes integer,p_mode text
) returns boolean language plpgsql security definer set search_path='' as $$
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
 if exists(select 1 from public.study_room_sessions s
   where s.room_id=p_room_id and s.ended_at is null
     and coalesce(s.planned_end_at,now()+interval '1 minute')>now())
   then raise exception 'Ayar değiştirmeden önce devam eden bireysel etütler bitmeli.';end if;
 update public.study_rooms
  set focus_minutes=p_focus_minutes,break_minutes=p_break_minutes,
      mode=p_mode,updated_at=clock_timestamp()
  where id=p_room_id;
 return true;
end $$;

revoke all on function public.study_room_create_v2(text,integer,integer,text) from public,anon;
revoke all on function public.study_room_configure(uuid,integer,integer,text) from public,anon;
grant execute on function public.study_room_create_v2(text,integer,integer,text) to authenticated;
grant execute on function public.study_room_configure(uuid,integer,integer,text) to authenticated;
