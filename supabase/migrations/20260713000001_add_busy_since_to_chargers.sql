-- ============================================================================
-- Enchufate · Migration: Add countdown timer fields to chargers
-- ============================================================================
-- Adds `busy_since` and `estimated_duration_minutes` columns to the chargers
-- table. These support the live countdown timer feature: hosts pick a duration
-- when toggling a charger to "busy", and clients compute the remaining time
-- client-side.
--
-- NOTE: The RPC functions `update_charger_rpc` and `fetch_chargers_rpc` must
-- also be updated in the Supabase dashboard to:
--   1. Accept p_busy_since and p_estimated_duration_minutes parameters
--   2. Return busy_since and estimated_duration_minutes in their SELECT
-- ============================================================================

-- Add the two new nullable columns.
ALTER TABLE public.chargers
  ADD COLUMN IF NOT EXISTS busy_since timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;

-- Column comments for documentation.
COMMENT ON COLUMN public.chargers.busy_since
  IS 'Timestamp when the charger was set to busy. NULL when available.';

COMMENT ON COLUMN public.chargers.estimated_duration_minutes
  IS 'Estimated duration in minutes chosen by the host. NULL when available.';

-- Index for quick lookup of busy chargers (optional but helpful for
-- future "expiring soon" queries).
CREATE INDEX IF NOT EXISTS chargers_busy_since_idx
  ON public.chargers (busy_since)
  WHERE busy_since IS NOT NULL;
