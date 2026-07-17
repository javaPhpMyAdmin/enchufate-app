-- ============================================================================
-- Reservations / Bookings feature
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. reservations table
-- ---------------------------------------------------------------------------

create table public.reservations (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.profiles(id) on delete cascade,
  charger_id  uuid not null references public.chargers(id) on delete cascade,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  status      text not null default 'confirmed'
              check (status in ('confirmed', 'cancelled', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.reservations enable row level security;

-- Indexes
create index idx_reservations_driver_id   on public.reservations (driver_id);
create index idx_reservations_charger_id  on public.reservations (charger_id);
create index idx_reservations_charger_time
  on public.reservations (charger_id, start_time, end_time);

-- ---------------------------------------------------------------------------
-- 2. Add 'reserved' to chargers status CHECK constraint
-- ---------------------------------------------------------------------------

-- The original constraint is named `chargers_status_check` (inline in the
-- create table). Drop and recreate with all three valid values.
alter table public.chargers
  drop constraint if exists chargers_status_check;

alter table public.chargers
  add constraint chargers_status_check
  check (status in ('available', 'busy', 'reserved'));

-- ---------------------------------------------------------------------------
-- 3. RLS policies — drivers see their own, hosts see on their chargers
-- ---------------------------------------------------------------------------

-- Drivers SELECT their own reservations.
create policy "reservations_select_driver"
  on public.reservations
  for select
  to authenticated
  using (driver_id = auth.uid());

-- Hosts SELECT reservations on chargers they own.
create policy "reservations_select_host"
  on public.reservations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chargers c
      where c.id = reservations.charger_id
        and c.owner_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies — all writes via SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- 4. create_reservation_rpc
-- ---------------------------------------------------------------------------

create or replace function public.create_reservation_rpc(
  p_charger_id  uuid,
  p_start_time  timestamptz,
  p_end_time    timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_charger_row record;
  v_overlap     int;
  v_reservation record;
begin
  -- Validate time range
  if p_start_time >= p_end_time then
    raise exception 'Invalid time range: end_time must be after start_time';
  end if;

  -- Cannot reserve in the past
  if p_start_time <= now() then
    raise exception 'Cannot reserve in the past';
  end if;

  -- Charger must exist and be available
  select id, owner_id, status
    into v_charger_row
    from public.chargers
   where id = p_charger_id
     for update;

  if not found then
    raise exception 'Charger not found';
  end if;

  if v_charger_row.owner_id = v_user_id then
    raise exception 'Cannot reserve your own charger';
  end if;

  if v_charger_row.status not in ('available', 'reserved') then
    raise exception 'Charger is not available for reservation';
  end if;

  -- Check for overlapping confirmed reservations
  select count(*) into v_overlap
    from public.reservations
   where charger_id = p_charger_id
     and status = 'confirmed'
     and tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  if v_overlap > 0 then
    raise exception 'Time slot conflict: charger already reserved for this period';
  end if;

  -- Insert reservation
  insert into public.reservations (driver_id, charger_id, start_time, end_time, status)
  values (v_user_id, p_charger_id, p_start_time, p_end_time, 'confirmed')
  returning * into v_reservation;

  -- Update charger status to 'reserved'
  update public.chargers
     set status = 'reserved',
         updated_at = now()
   where id = p_charger_id;

  return jsonb_build_object(
    'id',         v_reservation.id,
    'driver_id',  v_reservation.driver_id,
    'charger_id', v_reservation.charger_id,
    'start_time', v_reservation.start_time,
    'end_time',   v_reservation.end_time,
    'status',     v_reservation.status,
    'created_at', v_reservation.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. cancel_reservation_rpc
-- ---------------------------------------------------------------------------

create or replace function public.cancel_reservation_rpc(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_reservation record;
  v_active      int;
begin
  select *
    into v_reservation
    from public.reservations
   where id = p_reservation_id
     for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.driver_id != v_user_id then
    raise exception 'Permission denied: you can only cancel your own reservations';
  end if;

  if v_reservation.status != 'confirmed' then
    raise exception 'Can only cancel confirmed reservations';
  end if;

  -- Cancel the reservation
  update public.reservations
     set status = 'cancelled',
         updated_at = now()
   where id = p_reservation_id;

  -- Check if any other active reservations exist for this charger
  select count(*) into v_active
    from public.reservations
   where charger_id = v_reservation.charger_id
     and status = 'confirmed'
     and id != p_reservation_id;

  -- If no other active reservations, restore charger to available
  if v_active = 0 then
    update public.chargers
       set status = 'available',
           updated_at = now()
     where id = v_reservation.charger_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. get_driver_reservations_rpc
-- ---------------------------------------------------------------------------

create or replace function public.get_driver_reservations_rpc()
returns jsonb[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result  jsonb[];
begin
  select coalesce(array_agg(
    jsonb_build_object(
      'id',         r.id,
      'driver_id',  r.driver_id,
      'charger_id', r.charger_id,
      'start_time', r.start_time,
      'end_time',   r.end_time,
      'status',     r.status,
      'created_at', r.created_at,
      'charger', jsonb_build_object(
        'id',       c.id,
        'title',    c.title,
        'address',  c.address,
        'location', ST_AsGeoJSON(c.location::geometry)::jsonb,
        'power_kw', c.power_kw,
        'type',     c.connector_type
      )
    )
  ), '{}'::jsonb[])
  into v_result
  from public.reservations r
  join public.chargers c on c.id = r.charger_id
  where r.driver_id = v_user_id
  order by r.start_time desc;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. get_host_reservations_rpc
-- ---------------------------------------------------------------------------

create or replace function public.get_host_reservations_rpc()
returns jsonb[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result  jsonb[];
begin
  select coalesce(array_agg(
    jsonb_build_object(
      'id',         r.id,
      'driver_id',  r.driver_id,
      'charger_id', r.charger_id,
      'start_time', r.start_time,
      'end_time',   r.end_time,
      'status',     r.status,
      'created_at', r.created_at,
      'charger', jsonb_build_object(
        'id',       c.id,
        'title',    c.title,
        'address',  c.address,
        'location', ST_AsGeoJSON(c.location::geometry)::jsonb,
        'power_kw', c.power_kw,
        'type',     c.connector_type
      ),
      'driver', jsonb_build_object(
        'id',         p.id,
        'name',       p.display_name,
        'surname',    p.surname,
        'avatar_url', p.avatar_url
      )
    )
  ), '{}'::jsonb[])
  into v_result
  from public.reservations r
  join public.chargers c on c.id = r.charger_id
  join public.profiles p on p.id = r.driver_id
  where c.owner_id = v_user_id
  order by r.start_time desc;

  return v_result;
end;
$$;

-- ============================================================================
-- End of Reservations migration
-- ============================================================================
