-- ============================================================================
-- Enchufate · Migration: Add push token to profiles
-- ============================================================================
-- Stores the Expo Push Token for each device so server-side Edge Functions
-- can send push notifications when new messages or reviews arrive.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token text;

COMMENT ON COLUMN public.profiles.push_token
  IS 'Expo Push Token for this device';

CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON public.profiles (push_token)
  WHERE push_token IS NOT NULL;

-- ============================================================================
-- End of push token migration
-- ============================================================================
