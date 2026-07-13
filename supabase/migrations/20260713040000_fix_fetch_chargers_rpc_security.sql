-- ============================================================================
-- Enchufate · Fix fetch_chargers_rpc: SECURITY DEFINER for public access
-- ============================================================================
-- The chargers RLS policy only allows SELECT to authenticated users, but the
-- map screen is public (all users land on tabs). fetch_chargers_rpc must be
-- SECURITY DEFINER so it bypasses RLS and returns chargers to everyone.
--
-- This also ensures the function returns all columns including busy_since
-- and estimated_duration_minutes (added in the dashboard migration).
-- ============================================================================

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

-- Grant EXECUTE to both anon (unauthenticated) and authenticated.
-- SECURITY DEFINER bypasses RLS, but the caller still needs EXECUTE permission.
GRANT EXECUTE ON FUNCTION public.fetch_chargers_rpc() TO anon;
GRANT EXECUTE ON FUNCTION public.fetch_chargers_rpc() TO authenticated;
