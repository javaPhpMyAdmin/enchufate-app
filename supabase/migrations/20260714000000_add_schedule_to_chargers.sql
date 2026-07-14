-- ============================================================================
-- Enchufate · Add schedule (jsonb) column to chargers
-- ============================================================================
-- Adds a weekly availability schedule as a jsonb array. Each entry has:
--   { day: 0..6, enabled: bool, startTime: "HH:mm", endTime: "HH:mm" }
-- Also re-creates insert/update/fetch RPCs to include the new column.
-- ============================================================================

-- 1. Add the schedule column (nullable — existing rows have no schedule).
ALTER TABLE public.chargers
  ADD COLUMN IF NOT EXISTS schedule jsonb;

COMMENT ON COLUMN public.chargers.schedule
  IS 'Weekly availability schedule. JSON array of 7 day objects.';


-- 2. Re-create fetch_chargers_rpc — row_to_json(c.*) auto-includes schedule.
CREATE OR REPLACE FUNCTION public.fetch_chargers_rpc()
RETURNS SETOF jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    to_jsonb(c)
      - 'location'
      || jsonb_build_object('location', ST_AsGeoJSON(c.location::geometry)::jsonb)
  FROM public.chargers c;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_chargers_rpc() TO anon;
GRANT EXECUTE ON FUNCTION public.fetch_chargers_rpc() TO authenticated;


-- 3. Re-create insert_charger_rpc with p_schedule parameter.
CREATE OR REPLACE FUNCTION public.insert_charger_rpc(
  p_owner_id        uuid,
  p_title           text,
  p_description     text,
  p_connector_type  text,
  p_power_kw        numeric,
  p_price_per_hour  numeric,
  p_lat             double precision,
  p_lng             double precision,
  p_address         text,
  p_neighborhood    text,
  p_city            text,
  p_status          text        default 'available',
  p_photos          text[]      default '{}'::text[],
  p_schedule        jsonb       default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
  v_row record;
BEGIN
  INSERT INTO public.chargers (
    owner_id, title, description, connector_type,
    power_kw, price_per_hour, location, address,
    neighborhood, city, status, photos, schedule
  ) VALUES (
    p_owner_id, p_title, p_description, p_connector_type,
    p_power_kw, p_price_per_hour,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
    p_address, p_neighborhood, p_city, p_status, p_photos, p_schedule
  )
  RETURNING id INTO v_id;

  SELECT * INTO v_row FROM public.chargers WHERE id = v_id;

  RETURN to_jsonb(v_row)
    - 'location'
    || jsonb_build_object('location', ST_AsGeoJSON(v_row.location::geometry)::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_charger_rpc(
  uuid, text, text, text, numeric, numeric,
  double precision, double precision, text, text, text,
  text, text[], jsonb
) TO authenticated;


-- 4. Re-create update_charger_rpc with p_schedule and p_busy_since params.
CREATE OR REPLACE FUNCTION public.update_charger_rpc(
  p_id                           uuid,
  p_title                        text        default null,
  p_description                  text        default null,
  p_connector_type               text        default null,
  p_power_kw                     numeric     default null,
  p_price_per_hour               numeric     default null,
  p_lat                          double precision default null,
  p_lng                          double precision default null,
  p_address                      text        default null,
  p_neighborhood                 text        default null,
  p_city                         text        default null,
  p_status                       text        default null,
  p_photos                       text[]      default null,
  p_busy_since                   timestamptz default null,
  p_estimated_duration_minutes   integer     default null,
  p_schedule                     jsonb       default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row record;
BEGIN
  UPDATE public.chargers SET
    title            = COALESCE(p_title, title),
    description      = COALESCE(p_description, description),
    connector_type   = COALESCE(p_connector_type, connector_type),
    power_kw         = COALESCE(p_power_kw, power_kw),
    price_per_hour   = COALESCE(p_price_per_hour, price_per_hour),
    location         = CASE
                         WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL
                         THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
                         ELSE location
                       END,
    address          = COALESCE(p_address, address),
    neighborhood     = COALESCE(p_neighborhood, neighborhood),
    city             = COALESCE(p_city, city),
    status           = COALESCE(p_status, status),
    photos           = COALESCE(p_photos, photos),
    busy_since       = p_busy_since,
    estimated_duration_minutes = p_estimated_duration_minutes,
    schedule         = COALESCE(p_schedule, schedule)
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Charger % not found', p_id;
  END IF;

  RETURN to_jsonb(v_row)
    - 'location'
    || jsonb_build_object('location', ST_AsGeoJSON(v_row.location::geometry)::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_charger_rpc(
  uuid, text, text, text, numeric, numeric,
  double precision, double precision, text, text, text,
  text, text[], timestamptz, integer, jsonb
) TO authenticated;


-- ============================================================================
-- End of schedule migration
-- ============================================================================
