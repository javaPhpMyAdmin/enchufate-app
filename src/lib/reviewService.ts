/**
 * Review service — Supabase operations for the reviews table.
 *
 * The trigger-based approach means create/update/delete automatically
 * recalculate the host's aggregate rating in profiles and the charger's
 * aggregate rating in chargers — no app-level bookkeeping needed.
 */
import { supabase } from '@/lib/supabase';
import type { Review } from '@/data/types';

/** Fetch all reviews for a given host (target user). */
export async function fetchReviewsForUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('[reviewService] fetchReviewsForUser failed', error?.message);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    targetUserId: row.target_user_id,
    authorId: row.author_id,
    chargerId: row.charger_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

/** Fetch reviews for a specific charger. */
export async function fetchReviewsForCharger(chargerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('charger_id', chargerId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('[reviewService] fetchReviewsForCharger failed', error?.message);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    targetUserId: row.target_user_id,
    authorId: row.author_id,
    chargerId: row.charger_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

/** Create a new review. The trigger will auto-update the user's rating. */
export async function createReview(review: {
  authorId: string;
  targetUserId: string;
  chargerId: string;
  sessionId?: string;
  rating: number;
  comment: string;
}): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      author_id: review.authorId,
      target_user_id: review.targetUserId,
      charger_id: review.chargerId,
      session_id: review.sessionId ?? null,
      rating: review.rating,
      comment: review.comment,
    })
    .select()
    .single();

  if (error || !data) {
    console.warn('[reviewService] createReview failed', error?.message);
    return null;
  }
  return {
    id: data.id,
    targetUserId: data.target_user_id,
    authorId: data.author_id,
    chargerId: data.charger_id,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
  };
}

/** Delete a review. The trigger will auto-update the user's rating. */
export async function deleteReview(reviewId: string): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.warn('[reviewService] deleteReview failed', error?.message);
    return false;
  }
  return true;
}
