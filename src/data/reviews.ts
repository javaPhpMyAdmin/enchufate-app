/**
 * Reviews query helpers.
 *
 * Phase 4 ships a static mock dataset (`mocks/reviews.ts`). Phase 6 will
 * replace this with a real store + write path. To keep the public
 * profile screen and the future Phase 6 writer behind the same
 * interface, every consumer in Phase 4 imports `getReviewsForUser` from
 * here, not directly from the mock.
 */
import { mockReviews } from './mocks/reviews';
import type { Review } from './types';

/**
 * Latest N reviews for a given user, sorted by `createdAt` desc.
 *
 * Returns an empty array if the user has no reviews (or doesn't exist
 * in the dataset). Never throws.
 */
export function getReviewsForUser(
  userId: string,
  limit = 3,
): Review[] {
  return mockReviews
    .filter((r) => r.targetUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(0, limit));
}

/** Total number of reviews for a user. */
export function getReviewCountForUser(userId: string): number {
  return mockReviews.reduce(
    (count, r) => (r.targetUserId === userId ? count + 1 : count),
    0,
  );
}
