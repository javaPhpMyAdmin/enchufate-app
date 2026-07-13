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

/** Reject non-UUID strings (e.g. mock IDs like "u_01"). */
function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Fetch a single user profile by ID.
 *
 * - `enabled: false` when userId is undefined or is a non-UUID mock ID
 *   (avoids invalid queries to Supabase).
 * - 5 min staleTime — profiles don't change often.
 * - TanStack Query deduplicates identical query keys across components,
 *   so multiple ChargerCards rendering the same owner only trigger one fetch.
 */
export function useProfileQuery(userId: string | undefined) {
  const enabled = !!userId && isValidUuid(userId);
  return useQuery<User>({
    queryKey: [...PROFILE_QUERY_KEY, userId],
    queryFn: () => fetchProfileById(userId!),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
