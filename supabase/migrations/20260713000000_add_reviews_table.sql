-- ============================================================================
-- Enchufate · Migration: Reviews Table
-- ============================================================================
-- Adds a reviews table so drivers can rate hosts after charging sessions.
-- Triggers auto-update the host's aggregate rating in profiles and the
-- charger's aggregate rating in chargers.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Reviews table
-- ----------------------------------------------------------------------------
-- One review per author per host per charger (prevent spam). Tied to the
-- charger and optionally to a specific charging session.

CREATE TABLE public.reviews (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references auth.users(id) on delete cascade,
  target_user_id  uuid not null references auth.users(id) on delete cascade,
  charger_id      uuid not null references public.chargers(id) on delete cascade,
  session_id      uuid references public.charger_sessions(id) on delete set null,
  rating          smallint not null check (rating >= 1 and rating <= 5),
  comment         text not null default '',
  created_at      timestamptz not null default now(),
  -- One review per author per host per charger (prevent spam)
  constraint reviews_unique_author_target_charger
    unique (author_id, target_user_id, charger_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Indexes for common query patterns
CREATE INDEX idx_reviews_target_user ON public.reviews(target_user_id);
CREATE INDEX idx_reviews_author ON public.reviews(author_id);
CREATE INDEX idx_reviews_charger ON public.reviews(charger_id);


-- ----------------------------------------------------------------------------
-- RLS policies
-- ----------------------------------------------------------------------------

-- Anyone authenticated can read reviews (public data).
CREATE POLICY "reviews_select_authenticated"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (true);

-- Only the author can insert their own reviews.
CREATE POLICY "reviews_insert_author"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Only the author can update their own reviews.
CREATE POLICY "reviews_update_author"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Only the author can delete their own reviews.
CREATE POLICY "reviews_delete_author"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);


-- ----------------------------------------------------------------------------
-- Trigger: auto-update the host's aggregate rating in profiles
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id  uuid;
  avg_rating numeric(2,1);
  rev_count  integer;
BEGIN
  -- Determine which user's rating to update
  target_id := COALESCE(NEW.target_user_id, OLD.target_user_id);

  -- Calculate new aggregates
  SELECT
    COALESCE(round(avg(rating), 1), 0)::numeric(2,1),
    count(*)::integer
  INTO avg_rating, rev_count
  FROM public.reviews
  WHERE target_user_id = target_id;

  -- Update the profile
  UPDATE public.profiles
  SET rating = avg_rating,
      review_count = rev_count,
      updated_at = now()
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_rating();


-- ----------------------------------------------------------------------------
-- Trigger: auto-update the charger's aggregate rating
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_charger_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chg_id     uuid;
  avg_rating numeric(2,1);
  rev_count  integer;
BEGIN
  chg_id := COALESCE(NEW.charger_id, OLD.charger_id);

  SELECT
    COALESCE(round(avg(rating), 1), 0)::numeric(2,1),
    count(*)::integer
  INTO avg_rating, rev_count
  FROM public.reviews
  WHERE charger_id = chg_id;

  UPDATE public.chargers
  SET rating = avg_rating,
      review_count = rev_count
  WHERE id = chg_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_charger_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_charger_rating();


-- ============================================================================
-- End of reviews migration
-- ============================================================================
