/**
 * TanStack Query hook for fetching a single user profile by ID.
 *
 * Replaces the manual Map<string, User> cache + resolveOwner pattern
 * in the map screen with declarative cache management, automatic
 * deduplication, and stale-while-revalidate behavior.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchProfileById } from '@/features/auth/profileMapper';
import type { User } from '@/data/types';

const PROFILE_QUERY_KEY = ['profile'] as const;

/**
 * Fetch a single user profile by ID.
 *
 * - `enabled: false` when userId is undefined (avoids fetching).
 * - 5 min staleTime — profiles don't change often.
 * - TanStack Query deduplicates identical query keys across components,
 *   so multiple ChargerCards rendering the same owner only trigger one fetch.
 */
export function useProfileQuery(userId: string | undefined) {
  return useQuery<User>({
    queryKey: [...PROFILE_QUERY_KEY, userId],
    queryFn: () => fetchProfileById(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
