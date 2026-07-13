/**
 * Reviews query helpers — backed by the `reviews` Supabase table.
 *
 * `getReviewsForUser` fetches the latest N reviews for a given host,
 * sorted by creation date descending. `getReviewCountForUser` returns
 * the total count. Both are async and never throw.
 */
import { supabase } from '@/lib/supabase';
import type { Review } from './types';

/** Shape of a raw `reviews` row from Supabase. */
interface ReviewRow {
  id: string;
  author_id: string;
  target_user_id: string;
  charger_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    authorId: row.author_id,
    targetUserId: row.target_user_id,
    chargerId: row.charger_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

/**
 * Latest N reviews for a given user, sorted by `createdAt` desc.
 *
 * Returns an empty array if the user has no reviews. Never throws.
 */
export async function getReviewsForUser(
  userId: string,
  limit = 3,
): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as ReviewRow[]).map(rowToReview);
}

/** Total number of reviews for a user. */
export async function getReviewCountForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('target_user_id', userId);

  if (error) return 0;
  return count ?? 0;
}
