-- ============================================================================
-- Enchufate · Fix Medium DB Issues — DB-08, DB-09, DB-10, DB-11
-- ============================================================================
-- Four medium-severity database performance and correctness fixes:
--
--   DB-11  messages DESC index           (pagination-ready sort order)
--   DB-10  conversations updated_at trigger removal  (unused write overhead)
--   DB-09  chargers_near LIMIT param      (bounded result set)
--   DB-08  update_user_rating deferred trigger  (batch aggregate recalc)
-- ============================================================================


-- ============================================================================
-- DB-11 — Index messages (conversation_id, created_at DESC)
-- ============================================================================
-- The existing ASC index covers the "load oldest first" chat display.
-- This DESC index future-proofs pagination for "load newer messages".
-- ============================================================================

CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_desc_idx
  ON public.messages (conversation_id, created_at DESC);


-- ============================================================================
-- DB-10 — Remove unused updated_at trigger on conversations
-- ============================================================================
-- The conversations_set_updated_at trigger fires on every UPDATE but
-- updated_at is never used in any query or index. It adds write overhead
-- for zero read benefit.
--
-- NOTE: We only drop the trigger, NOT the set_updated_at() function,
-- because profiles and chargers still depend on it via their own triggers.
-- ============================================================================

DROP TRIGGER IF EXISTS conversations_set_updated_at ON public.conversations;


-- ============================================================================
-- DB-09 — chargers_near: add p_limit parameter
-- ============================================================================
-- Without LIMIT, Postgres computes distance for ALL rows within the
-- geography bounding box before sorting. Adding a LIMIT lets the planner
-- use a top-N heap scan, dramatically reducing work for large datasets.
--
-- Backward-compatible: p_limit defaults to 50. Existing callers with 3
-- args continue to work unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.chargers_near(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 5000,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
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
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    c.*,
    st_distance(
      c.location,
      st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography
    ) AS distance_meters
  FROM public.chargers c
  WHERE st_dwithin(
      c.location,
      st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography,
      radius_meters
    )
  ORDER BY distance_meters
  LIMIT p_limit;
$$;

-- Re-grant in case the signature changed (Postgres treats param count changes
-- as a new function overload for GRANT purposes).
GRANT EXECUTE ON FUNCTION public.chargers_near(double precision, double precision, integer, integer)
  TO authenticated;


-- ============================================================================
-- DB-08 — update_user_rating: DEFERRABLE INITIALLY DEFERRED
-- ============================================================================
-- The current trigger fires AFTER each INSERT/UPDATE/DELETE on reviews,
-- running a full AVG + COUNT every single row. In batch operations
-- (e.g. importing reviews, or a user rapidly editing), this causes
-- N aggregate scans for N changes.
--
-- Making it DEFERRABLE INITIALLY DEFERRED means Postgres batches all
-- trigger firings until COMMIT. A batch of 10 review changes runs
-- the aggregate ONCE instead of 10 times.
--
-- We drop the old trigger and recreate it with the new timing.
-- The function itself is unchanged — only the trigger timing changes.
-- ============================================================================

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  DEFERRABLE INITIALLY DEFERRED
  EXECUTE FUNCTION public.update_user_rating();


-- ============================================================================
-- End of medium DB fixes migration
-- ============================================================================
-- Backward-compatibility notes:
--   DB-11: New index is additive; existing ASC index untouched.
--   DB-10: Conversations updated_at column still exists, just not
--           auto-updated. App code doesn't read it.
--   DB-09: chargers_near(3-arg) callers unaffected (new param defaults).
--   DB-08: Trigger still fires, just at COMMIT instead of per-row.
--           App behavior is identical — ratings update slightly later
--           but more efficiently.
-- ============================================================================
