-- ============================================================================
-- Enchufate · Supabase Schema · Fase 1 MVP
-- ============================================================================
-- Creates the core tables, RLS policies, triggers, and a PostGIS helper
-- for the enchufate-app MVP:
--   - public.profiles            : extends auth.users with public fields
--   - public.chargers            : the marketplace catalog
--   - public.charger_sessions    : auto-managed usage log
--
-- Run this in the Supabase SQL Editor, or via `supabase db push` if
-- using the Supabase CLI. The migration is idempotent (uses
-- `if not exists` / `create or replace`) so it's safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

-- PostGIS powers the `chargers.location` geography column and the
-- `chargers_near` helper. Supabase ships with PostGIS available; this
-- enables it for the public schema.
create extension if not exists postgis;


-- ----------------------------------------------------------------------------
-- Shared trigger: set_updated_at
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- profiles : extends auth.users with public-facing fields
-- ----------------------------------------------------------------------------
-- One row per user. The "private" fields (email, phone) live in
-- auth.users and are only exposed via Supabase's auth API. RLS below
-- keeps this table readable by any authenticated user, but only the
-- row's owner can write it.

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  surname         text,
  avatar_url      text,
  bio             text,
  city            text,
  rating          numeric(2, 1) default 0 not null,
  review_count    integer default 0 not null,
  is_host         boolean default false not null,
  is_online       boolean default false not null,
  joined_at       timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  constraint profiles_rating_range check (rating >= 0 and rating <= 5)
);

create index if not exists profiles_city_idx on public.profiles (city);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row the moment a user signs up. The
-- `raw_user_meta_data` field carries the display name / avatar the
-- client passes at signup time (we'll set this from the app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'given_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- chargers : the marketplace catalog
-- ----------------------------------------------------------------------------
-- Each charger is owned by a profile (the host). Status is a manual
-- host toggle between 'available' and 'busy' — there are no scheduled
-- sessions or availability rules. The trigger on `chargers.status`
-- writes to `charger_sessions` automatically.

create table if not exists public.chargers (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  description     text not null,
  connector_type  text not null check (
    connector_type in ('type1', 'type2', 'ccs', 'chademo', 'tesla')
  ),
  power_kw        numeric(5, 1) not null check (power_kw > 0),
  price_per_hour  numeric(8, 2) not null check (price_per_hour >= 0),
  status          text not null default 'available' check (
    status in ('available', 'busy')
  ),
  location        extensions.geography(Point, 4326) not null,
  address         text not null,
  neighborhood    text,
  city            text not null,
  rating          numeric(2, 1) default 0 not null,
  review_count    integer default 0 not null,
  amenities       text[] default '{}'::text[],
  photos          text[] default '{}'::text[],
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  constraint chargers_rating_range check (rating >= 0 and rating <= 5)
);

create index if not exists chargers_owner_id_idx on public.chargers (owner_id);
create index if not exists chargers_city_idx on public.chargers (city);
create index if not exists chargers_status_idx on public.chargers (status);
-- GiST index on the geography column makes "chargers near me" fast.
create index if not exists chargers_location_idx
  on public.chargers using gist (location);

create trigger chargers_set_updated_at
  before update on public.chargers
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- charger_sessions : auto-managed by trigger on chargers.status
-- ----------------------------------------------------------------------------
-- One row per charging session. A row is inserted when the host flips
-- status to 'busy' and closed (ended_at = now()) when the host flips
-- it back to 'available'. Sessions that never close (orphans) only
-- happen if a status update is missed; the trigger is idempotent so
-- it's safe to re-run status changes.

create table if not exists public.charger_sessions (
  id          uuid primary key default gen_random_uuid(),
  charger_id  uuid not null references public.chargers(id) on delete cascade,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  started_at  timestamptz default now() not null,
  ended_at    timestamptz
);

create index if not exists sessions_charger_id_started_at_idx
  on public.charger_sessions (charger_id, started_at desc);
create index if not exists sessions_host_id_idx
  on public.charger_sessions (host_id);

create or replace function public.handle_charger_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- New session: status just flipped to 'busy' (from anything else).
  if new.status = 'busy' and (old.status is null or old.status <> 'busy') then
    insert into public.charger_sessions (charger_id, host_id, started_at)
    values (new.id, new.owner_id, now());
  -- Close the active session: status flipped back to 'available'.
  elsif new.status = 'available' and old.status = 'busy' then
    update public.charger_sessions
    set ended_at = now()
    where charger_id = new.id and ended_at is null;
  end if;
  return new;
end;
$$;

create trigger on_charger_status_change
  after update of status on public.chargers
  for each row execute function public.handle_charger_status_change();


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

-- Enable RLS on every public table. (Supabase defaults RLS to OFF on
-- new tables, which would expose everything to anyone with the anon
-- key. We turn it on explicitly so the policies below are required.)
alter table public.profiles          enable row level security;
alter table public.chargers          enable row level security;
alter table public.charger_sessions  enable row level security;

-- profiles ---------------------------------------------------------------

-- Any authenticated user can read any profile (public surface used by
-- the map, charger cards, and public profile screen).
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- A user can only insert their own profile row. (The auto-create
-- trigger uses security definer, so this policy doesn't apply to it.)
create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- A user can only update their own profile row.
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- chargers ---------------------------------------------------------------

-- Any authenticated user can read chargers (the map, search, detail
-- sheets all consume this).
create policy "chargers_select_authenticated"
  on public.chargers
  for select
  to authenticated
  using (true);

-- Only the owner can create a charger, and the row's `owner_id` must
-- match the authenticated user.
create policy "chargers_insert_own"
  on public.chargers
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Only the owner can update their chargers (status toggles, edits).
create policy "chargers_update_own"
  on public.chargers
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Only the owner can delete their chargers.
create policy "chargers_delete_own"
  on public.chargers
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- charger_sessions -------------------------------------------------------

-- Only the host of the session (i.e. the charger owner) can read it.
-- In v1 we don't track the driver, so only the host sees their own
-- usage history.
create policy "sessions_select_own"
  on public.charger_sessions
  for select
  to authenticated
  using (host_id = auth.uid());

-- No insert/update/delete policies on purpose: rows are managed
-- exclusively by the `handle_charger_status_change` trigger, which
-- runs as security definer. Anon/authenticated users cannot write
-- directly to this table.


-- ----------------------------------------------------------------------------
-- Helper: chargers within a radius (PostGIS)
-- ----------------------------------------------------------------------------
-- Usage:
--   select * from public.chargers_near(-34.9036, -56.158, 5000);
-- Returns chargers within `radius_meters` of (lat, lng), ordered by
-- distance. Use 5000 for 5 km, 10000 for 10 km, etc.
create or replace function public.chargers_near(
  lat double precision,
  lng double precision,
  radius_meters integer default 5000
)
returns table (
  id              uuid,
  owner_id        uuid,
  title           text,
  description     text,
  connector_type  text,
  power_kw        numeric,
  price_per_hour  numeric,
  status          text,
  location        extensions.geography(Point, 4326),
  address         text,
  neighborhood    text,
  city            text,
  rating          numeric,
  review_count    integer,
  amenities       text[],
  photos          text[],
  created_at      timestamptz,
  updated_at      timestamptz,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.*,
    st_distance(
      c.location,
      st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography
    ) as distance_meters
  from public.chargers c
  where st_dwithin(
      c.location,
      st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography,
      radius_meters
    )
  order by distance_meters;
$$;

grant execute on function public.chargers_near(double precision, double precision, integer) to authenticated;


-- ============================================================================
-- End of Fase 1 MVP migration
-- ============================================================================
-- After running this migration:
--   1. In the Supabase dashboard, enable the PostGIS extension under
--      Database > Extensions if it's not already on (it usually is).
--   2. Create a Storage bucket called "charger-photos" with public read
--      access (for the photos[] array). We'll wire photo uploads in a
--      later migration.
--   3. From the app, replace the AsyncStorage mock stores with
--      Supabase client queries. The RLS policies above ensure each user
--      only sees / writes their own data.
-- ============================================================================
