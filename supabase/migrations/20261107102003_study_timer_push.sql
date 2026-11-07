create extension if not exists pg_cron;

create table public.study_timer_push_jobs (
  endpoint text primary key references public.room_push_subscriptions(endpoint) on delete cascade,
  user_id uuid not null,
  due_at timestamptz not null,
  claimed_at timestamptz
);
create index study_timer_push_due on public.study_timer_push_jobs(due_at) where claimed_at is null;

create table public.study_timer_push_dispatch (
  id boolean primary key default true check (id),
  token uuid not null default gen_random_uuid()
);
insert into public.study_timer_push_dispatch default values;

alter table public.study_timer_push_jobs enable row level security;
alter table public.study_timer_push_dispatch enable row level security;
revoke all on public.study_timer_push_jobs, public.study_timer_push_dispatch from public, anon, authenticated;
grant all on public.study_timer_push_jobs to service_role;
grant select on public.study_timer_push_dispatch to service_role;

create function public.study_timer_push_schedule(p_user uuid, p_endpoint text, p_due timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_due is null then
    delete from public.study_timer_push_jobs where endpoint = p_endpoint and user_id = p_user;
    return;
  end if;
  insert into public.study_timer_push_jobs(endpoint, user_id, due_at)
    select endpoint, user_id, p_due
    from public.room_push_subscriptions
    where endpoint = p_endpoint and user_id = p_user
  on conflict (endpoint) do update set user_id = excluded.user_id, due_at = excluded.due_at, claimed_at = null
    where study_timer_push_jobs.due_at <> excluded.due_at or study_timer_push_jobs.user_id <> excluded.user_id;
end;
$$;

create function public.study_timer_push_claim(p_token text)
returns table(subscription jsonb, due_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.study_timer_push_dispatch where token::text = p_token) then
    raise insufficient_privilege;
  end if;
  return query
    with due as (
      select j.endpoint from public.study_timer_push_jobs j
      where j.claimed_at is null and j.due_at between now() - interval '5 minutes' and now()
      order by j.due_at limit 30 for update skip locked
    ), claimed as (
      update public.study_timer_push_jobs j set claimed_at = now()
      from due where j.endpoint = due.endpoint
      returning j.endpoint, j.user_id, j.due_at
    )
    select s.subscription, c.due_at from claimed c
    join public.room_push_subscriptions s on s.endpoint = c.endpoint and s.user_id = c.user_id;
end;
$$;
revoke all on function public.study_timer_push_schedule(uuid,text,timestamptz), public.study_timer_push_claim(text) from public, anon, authenticated;
grant execute on function public.study_timer_push_schedule(uuid,text,timestamptz), public.study_timer_push_claim(text) to service_role;

select cron.schedule('hakuna-study-timer-push', '15 seconds', $job$
  select net.http_post(
    url := 'https://zyrbbkbwrijnnykbgjvc.supabase.co/functions/v1/room-notifications',
    headers := jsonb_build_object('Content-Type','application/json','x-timer-dispatch',token::text),
    body := '{"action":"timer-dispatch"}'::jsonb,
    timeout_milliseconds := 12000
  )
  from public.study_timer_push_dispatch
  where exists (
    select 1 from public.study_timer_push_jobs
    where claimed_at is null and due_at between now() - interval '5 minutes' and now()
  );
$job$);
