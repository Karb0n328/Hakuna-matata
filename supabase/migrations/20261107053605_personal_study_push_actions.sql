create table public.room_push_actions(token uuid primary key default gen_random_uuid(),session_id uuid not null references public.study_room_sessions(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table public.room_push_actions enable row level security;
revoke all on public.room_push_actions from public,anon,authenticated;
grant all on public.room_push_actions to service_role;
create or replace function public.room_push_claim(p_session uuid,p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.study_room_sessions where id=p_session and user_id=p_user and ended_at is null and started_at>now()-interval '2 minutes') then return false;end if;
 insert into public.room_push_events(session_id,user_id) values(p_session,p_user) on conflict do nothing;return found;
end $$;
create function public.room_push_pause(p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.room_push_actions%rowtype; r uuid;
begin
 select * into a from public.room_push_actions where token=p_token and created_at>now()-interval '7 days';
 if not found then return false;end if;
 select room_id into r from public.study_room_sessions where id=a.session_id;
 perform 1 from public.study_rooms where id=r for update;
 update public.study_room_sessions set ended_at=greatest(started_at,least(clock_timestamp(),coalesce(planned_end_at,clock_timestamp()))),duration_seconds=greatest(0,floor(extract(epoch from least(clock_timestamp(),coalesce(planned_end_at,clock_timestamp()))-started_at)))::integer where id=a.session_id and user_id=a.user_id and ended_at is null;
 update public.study_rooms set updated_at=clock_timestamp() where id=r;
 return true;
end $$;
revoke all on function public.room_push_pause(uuid) from public,anon,authenticated;
grant execute on function public.room_push_pause(uuid) to service_role;
