/**
 * TanStack Query hooks for reviews.
 *
 * Fetches, creates, and deletes reviews with automatic cache invalidation.
 * The database triggers handle aggregate rating updates on profiles and
 * chargers, so we only need to invalidate the relevant caches.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewService from '@/lib/reviewService';
import type { Review } from '@/data/types';

const REVIEWS_USER_KEY = (userId: string) => ['reviews', 'user', userId] as const;
const REVIEWS_CHARGER_KEY = (chargerId: string) => ['reviews', 'charger', chargerId] as const;

/** Fetch all reviews for a user (host). */
export function useReviewsForUser(userId: string | null | undefined) {
  return useQuery<Review[]>({
    queryKey: REVIEWS_USER_KEY(userId ?? ''),
    queryFn: () => reviewService.fetchReviewsForUser(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Fetch all reviews for a charger. */
export function useReviewsForCharger(chargerId: string | null | undefined) {
  return useQuery<Review[]>({
    queryKey: REVIEWS_CHARGER_KEY(chargerId ?? ''),
    queryFn: () => reviewService.fetchReviewsForCharger(chargerId!),
    enabled: !!chargerId,
    staleTime: 60_000,
  });
}

/** Create a new review, then invalidate relevant caches. */
export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewService.createReview,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: REVIEWS_USER_KEY(variables.targetUserId) });
      void qc.invalidateQueries({ queryKey: REVIEWS_CHARGER_KEY(variables.chargerId) });
      void qc.invalidateQueries({ queryKey: ['reviews', 'authors', variables.targetUserId] });
      // Also invalidate charger list (rating changes propagate via trigger)
      void qc.invalidateQueries({ queryKey: ['chargers'] });
    },
  });
}

/** Fetch reviews for a user with author profile data (via FK join). */
export function useReviewsWithAuthors(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['reviews', 'authors', userId ?? ''],
    queryFn: () => reviewService.fetchReviewsWithAuthors(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Delete a review, then invalidate relevant caches. */
export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewService.deleteReview,
    onSuccess: () => {
      // Broad invalidation — we only have the review ID, not the target user/charger.
      // The query client deduplicates so this is cheap.
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['chargers'] });
    },
  });
}
