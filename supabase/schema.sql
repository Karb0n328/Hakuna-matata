-- Hakuna Matata V2
-- First migration intentionally stores the complete legacy state as JSONB.
-- Do not normalize legacy records before verification; preserving every field is the priority.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9._-]{3,32}$')
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

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
  constraint migration_runs_local_hash_format check (local_hash ~ '^[0-9a-f]{64}$')
);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.legacy_snapshots enable row level security;
alter table public.migration_runs enable row level security;

-- Profiles: a user can only see and edit their own profile.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- App state: exact ownership by authenticated Supabase UUID.
create policy "app_state_select_own"
  on public.app_state for select
  using (auth.uid() = user_id);

create policy "app_state_insert_own"
  on public.app_state for insert
  with check (auth.uid() = user_id);

create policy "app_state_update_own"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Legacy snapshots are append-only from the client. No update/delete policies are created.
create policy "legacy_snapshots_select_own"
  on public.legacy_snapshots for select
  using (auth.uid() = user_id);

create policy "legacy_snapshots_insert_own"
  on public.legacy_snapshots for insert
  with check (auth.uid() = user_id);

-- Migration audit rows are visible and writable only by their owner.
create policy "migration_runs_select_own"
  on public.migration_runs for select
  using (auth.uid() = user_id);

create policy "migration_runs_insert_own"
  on public.migration_runs for insert
  with check (auth.uid() = user_id);

create policy "migration_runs_update_own"
  on public.migration_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at helper.
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

-- IMPORTANT:
-- Username-or-email login must be resolved server-side (Edge Function / trusted backend).
-- Do NOT expose auth.users email addresses or create an anonymous RPC that returns them.
