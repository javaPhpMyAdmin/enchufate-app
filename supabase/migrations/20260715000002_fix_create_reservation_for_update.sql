CREATE OR REPLACE FUNCTION public.create_reservation_rpc(
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
  if p_start_time >= p_end_time then
    raise exception 'Invalid time range: end_time must be after start_time';
  end if;

  if p_start_time <= now() then
    raise exception 'Cannot reserve in the past';
  end if;

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

  select count(*) into v_overlap
    from public.reservations
   where charger_id = p_charger_id
     and status = 'confirmed'
     and tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);

  if v_overlap > 0 then
    raise exception 'Time slot conflict: charger already reserved for this period';
  end if;

  insert into public.reservations (driver_id, charger_id, start_time, end_time, status)
  values (v_user_id, p_charger_id, p_start_time, p_end_time, 'confirmed')
  returning * into v_reservation;

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
