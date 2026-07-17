-- Fix: add 'extensions' to search_path so PostGIS geometry type is available
-- in get_driver_reservations_rpc and get_host_reservations_rpc

-- get_driver_reservations_rpc
create or replace function public.get_driver_reservations_rpc()
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

-- get_host_reservations_rpc
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
  order by r.start_time desc;

  return v_result;
end;
$$;
