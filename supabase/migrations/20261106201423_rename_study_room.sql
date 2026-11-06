create or replace function public.study_room_rename(p_room_id uuid,p_name text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_name text:=btrim(coalesce(p_name,''));
begin
 if v_user is null then raise exception 'Giriş yapman gerekiyor.';end if;
 if char_length(v_name)<3 or char_length(v_name)>60 then raise exception 'Oda adı 3–60 karakter olmalı.';end if;
 update public.study_rooms set name=v_name,updated_at=clock_timestamp()
 where id=p_room_id and owner_id=v_user and is_active;
 if not found then raise exception 'Bu odayı düzenleme yetkin yok veya oda kapalı.';end if;
 return true;
end $$;
revoke all on function public.study_room_rename(uuid,text) from public,anon;
grant execute on function public.study_room_rename(uuid,text) to authenticated;

