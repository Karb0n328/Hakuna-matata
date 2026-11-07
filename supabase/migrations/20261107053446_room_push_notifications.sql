create table public.room_push_keys(id boolean primary key default true check(id),public_key text not null,private_key text not null);
create table public.room_push_subscriptions(endpoint text primary key,user_id uuid not null references auth.users(id) on delete cascade,subscription jsonb not null,updated_at timestamptz not null default now());
create index room_push_user_idx on public.room_push_subscriptions(user_id);
create table public.room_push_events(session_id uuid primary key references public.study_room_sessions(id) on delete cascade,user_id uuid not null,created_at timestamptz not null default now());
create index room_push_event_user_time on public.room_push_events(user_id,created_at);
alter table public.room_push_keys enable row level security;
alter table public.room_push_subscriptions enable row level security;
alter table public.room_push_events enable row level security;
revoke all on public.room_push_keys,public.room_push_subscriptions,public.room_push_events from public,anon,authenticated;
grant all on public.room_push_keys,public.room_push_subscriptions,public.room_push_events to service_role;
create function public.room_push_claim(p_session uuid,p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,983));
 if not exists(select 1 from public.study_room_sessions where id=p_session and user_id=p_user and ended_at is null and started_at>now()-interval '2 minutes') then return false;end if;
 if exists(select 1 from public.room_push_events where user_id=p_user and created_at>now()-interval '5 minutes') then return false;end if;
 insert into public.room_push_events(session_id,user_id) values(p_session,p_user) on conflict do nothing;
 return found;
end $$;
revoke all on function public.room_push_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.room_push_claim(uuid,uuid) to service_role;
