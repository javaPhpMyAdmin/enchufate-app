-- Update cancel_reservation_rpc: allow BOTH driver AND owner to cancel.
-- Previously only driver_id could cancel.

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
  v_charger_row record;
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

  if v_reservation.status not in ('confirmed', 'pending') then
    raise exception 'Can only cancel confirmed or pending reservations';
  end if;

  -- Check if the caller is the driver
  if v_reservation.driver_id = v_user_id then
    -- Driver cancelling: check if charger needs status restore
    null; -- proceed
  else
    -- Check if the caller is the charger owner
    select id, owner_id into v_charger_row
      from public.chargers
     where id = v_reservation.charger_id;

    if not found then
      raise exception 'Charger not found';
    end if;

    if v_charger_row.owner_id != v_user_id then
      raise exception 'Permission denied: only the driver or charger owner can cancel';
    end if;
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
