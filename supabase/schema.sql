-- Hakuna Matata V2
-- Zero-data-loss cloud schema.
-- The first migration stores the COMPLETE legacy state as JSONB before any normalization.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text generated always as (lower(btrim(username))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(btrim(username)) between 3 and 32),
  constraint profiles_username_chars check (username ~ '^[A-Za-z0-9._-]+$'),
  constraint profiles_username_normalized_unique unique (username_normalized)
);

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  state_hash text not null,
  revision bigint not null default 1,
  migrated_from_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_state_hash_format check (state_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists public.legacy_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  snapshot_hash text not null,
  counts jsonb not null default '{}'::jsonb,
  source_db text not null default 'hakuna-matata-db',
  source_store text not null default 'app',
  source_key text not null default 'state',
  created_at timestamptz not null default now(),
  constraint legacy_snapshots_hash_format check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  constraint legacy_snapshots_user_hash_unique unique (user_id, snapshot_hash)
);

create table if not exists public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid references public.legacy_snapshots(id) on delete restrict,
  local_hash text not null,
  cloud_snapshot_hash text,
  cloud_state_hash text,
  local_counts jsonb not null default '{}'::jsonb,
  cloud_counts jsonb not null default '{}'::jsonb,
  status text not null default 'started',
  error_message text,
  started_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint migration_runs_status_check check (status in ('started','uploaded','verified','failed')),
  constraint migration_runs_local_hash_format check (local_hash ~ '^[0-9a-f]{64}$'),
  constraint migration_runs_cloud_snapshot_hash_format check (cloud_snapshot_hash is null or cloud_snapshot_hash ~ '^[0-9a-f]{64}$'),
  constraint migration_runs_cloud_state_hash_format check (cloud_state_hash is null or cloud_state_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists legacy_snapshots_user_created_idx
  on public.legacy_snapshots (user_id, created_at desc);
create index if not exists migration_runs_user_started_idx
  on public.migration_runs (user_id, started_at desc);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.legacy_snapshots enable row level security;
alter table public.migration_runs enable row level security;

-- Supabase 2026+: newly created public tables may not be exposed to Data API automatically.
-- Explicitly expose ONLY the operations required by authenticated Hakuna clients.
revoke all on table public.profiles from anon;
revoke all on table public.app_state from anon;
revoke all on table public.legacy_snapshots from anon;
revoke all on table public.migration_runs from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.app_state from authenticated;
revoke all on table public.legacy_snapshots from authenticated;
revoke all on table public.migration_runs from authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.app_state to authenticated;
grant select, insert on table public.legacy_snapshots to authenticated;
grant select, insert, update on table public.migration_runs to authenticated;

-- Profiles: own row only.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Canonical cloud state: own row only.
drop policy if exists app_state_select_own on public.app_state;
create policy app_state_select_own on public.app_state
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists app_state_insert_own on public.app_state;
create policy app_state_insert_own on public.app_state
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists app_state_update_own on public.app_state;
create policy app_state_update_own on public.app_state
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Legacy snapshots: append-only from browser client. No UPDATE or DELETE grant/policy.
drop policy if exists legacy_snapshots_select_own on public.legacy_snapshots;
create policy legacy_snapshots_select_own on public.legacy_snapshots
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists legacy_snapshots_insert_own on public.legacy_snapshots;
create policy legacy_snapshots_insert_own on public.legacy_snapshots
for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Migration audit rows: own rows only. No DELETE permission.
drop policy if exists migration_runs_select_own on public.migration_runs;
create policy migration_runs_select_own on public.migration_runs
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists migration_runs_insert_own on public.migration_runs;
create policy migration_runs_insert_own on public.migration_runs
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists migration_runs_update_own on public.migration_runs;
create policy migration_runs_update_own on public.migration_runs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Safe updated_at helper; SECURITY INVOKER intentionally retained.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
before update on public.app_state
for each row execute function public.set_updated_at();

commit;

-- Username-or-email sign-in is resolved server-side later.
-- Never expose auth.users email addresses or a service-role key to the PWA/APK client.
