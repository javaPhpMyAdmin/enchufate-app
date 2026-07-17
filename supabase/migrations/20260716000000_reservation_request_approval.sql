-- ============================================================================
-- Reservation Request + Approval feature
-- Adds 'pending' status, nullable time fields, 3 new RPCs, updates existing RPCs
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add 'pending' to reservations status CHECK constraint
-- ---------------------------------------------------------------------------

alter table public.reservations
  drop constraint if exists reservations_status_check;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

-- ---------------------------------------------------------------------------
-- 2. Make start_time / end_time nullable (pending has no schedule yet)
-- ---------------------------------------------------------------------------

alter table public.reservations
  alter column start_time drop not null;

alter table public.reservations
  alter column end_time drop not null;

-- ---------------------------------------------------------------------------
-- 3. request_reservation_rpc — driver requests to reserve a charger
-- ---------------------------------------------------------------------------

create or replace function public.request_reservation_rpc(
  p_charger_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id     uuid := auth.uid();
  v_charger_row record;
  v_existing    record;
  v_reservation record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Charger must exist
  select id, owner_id
    into v_charger_row
    from public.chargers
   where id = p_charger_id;

  if not found then
    raise exception 'Charger not found';
  end if;

  -- Cannot reserve your own charger
  if v_charger_row.owner_id = v_user_id then
    raise exception 'Cannot reserve your own charger';
  end if;

  -- Dedup: no existing pending reservation for same driver+charger
  select id into v_existing
    from public.reservations
   where driver_id = v_user_id
     and charger_id = p_charger_id
     and status = 'pending';

  if found then
    raise exception 'You already have a pending request for this charger';
  end if;

  -- Insert reservation as pending with null times
  insert into public.reservations (driver_id, charger_id, status, start_time, end_time)
  values (v_user_id, p_charger_id, 'pending', null, null)
  returning * into v_reservation;

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
-- 4. approve_reservation_rpc — host approves a pending request
-- ---------------------------------------------------------------------------

create or replace function public.approve_reservation_rpc(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id     uuid := auth.uid();
  v_reservation record;
  v_charger_row record;
  v_overlap     int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the reservation row
  select *
    into v_reservation
    from public.reservations
   where id = p_reservation_id
     for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status != 'pending' then
    raise exception 'Can only approve pending reservations';
  end if;

  -- Verify caller is the charger owner
  select id, owner_id, status
    into v_charger_row
    from public.chargers
   where id = v_reservation.charger_id
     for update;

  if not found then
    raise exception 'Charger not found';
  end if;

  if v_charger_row.owner_id != v_user_id then
    raise exception 'Permission denied: only the charger owner can approve';
  end if;

  -- Overlap check: only relevant if the pending reservation has times set
  -- Since pending reservations have null times, we skip overlap check here.
  -- Times are coordinated via chat and the owner can confirm later.
  -- If times are ever set (future enhancement), this is where the overlap
  -- check would go:
  --
  -- if v_reservation.start_time is not null and v_reservation.end_time is not null then
  --   select count(*) into v_overlap
  --     from public.reservations
  --    where charger_id = v_reservation.charger_id
  --      and status = 'confirmed'
  --      and id != p_reservation_id
  --      and start_time is not null and end_time is not null
  --      and tstzrange(start_time, end_time) && tstzrange(v_reservation.start_time, v_reservation.end_time);
  --   if v_overlap > 0 then
  --     raise exception 'Time slot conflict: charger already reserved for this period';
  --   end if;
  -- end if;

  -- Confirm the reservation
  update public.reservations
     set status = 'confirmed',
         updated_at = now()
   where id = p_reservation_id;

  -- Mark charger as reserved
  update public.chargers
     set status = 'reserved',
         updated_at = now()
   where id = v_reservation.charger_id;

  return jsonb_build_object(
    'id',         v_reservation.id,
    'driver_id',  v_reservation.driver_id,
    'charger_id', v_reservation.charger_id,
    'start_time', v_reservation.start_time,
    'end_time',   v_reservation.end_time,
    'status',     'confirmed',
    'created_at', v_reservation.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. reject_reservation_rpc — host rejects a pending request
-- ---------------------------------------------------------------------------

create or replace function public.reject_reservation_rpc(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id     uuid := auth.uid();
  v_reservation record;
  v_charger_row record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the reservation row
  select *
    into v_reservation
    from public.reservations
   where id = p_reservation_id
     for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status != 'pending' then
    raise exception 'Can only reject pending reservations';
  end if;

  -- Verify caller is the charger owner
  select id, owner_id
    into v_charger_row
    from public.chargers
   where id = v_reservation.charger_id;

  if not found then
    raise exception 'Charger not found';
  end if;

  if v_charger_row.owner_id != v_user_id then
    raise exception 'Permission denied: only the charger owner can reject';
  end if;

  -- Cancel the reservation (charger status unchanged — was never modified)
  update public.reservations
     set status = 'cancelled',
         updated_at = now()
   where id = p_reservation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Update get_host_reservations_rpc — include 'pending' in results
-- ---------------------------------------------------------------------------

create or replace function public.get_host_reservations_rpc()
returns jsonb[]
language plpgsql
security definer
set search_path = public, extensions
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
  order by r.created_at desc;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Update cancel_reservation_rpc — allow cancelling 'pending' too
-- ---------------------------------------------------------------------------

create or replace function public.cancel_reservation_rpc(
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
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

  if v_reservation.status not in ('confirmed', 'pending') then
    raise exception 'Can only cancel confirmed or pending reservations';
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
-- 8. Grant EXECUTE to anon + authenticated for new RPCs
-- ---------------------------------------------------------------------------

grant execute on function public.request_reservation_rpc(uuid) to anon, authenticated;
grant execute on function public.approve_reservation_rpc(uuid) to anon, authenticated;
grant execute on function public.reject_reservation_rpc(uuid) to anon, authenticated;

-- ============================================================================
-- End of Reservation Request + Approval migration
-- ============================================================================
