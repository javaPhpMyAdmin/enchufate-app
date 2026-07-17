/**
 * TanStack Query hooks for reservation data fetching.
 *
 * Three separate hooks with distinct query keys:
 * - useDriverReservations: the authenticated user's own reservations
 * - useHostReservations: reservations on chargers the user owns (all statuses)
 * - usePendingHostRequests: pending requests on chargers the user owns
 *
 * All follow the useChargersQuery pattern with 30s staleTime.
 */
import { useQuery } from '@tanstack/react-query';
import * as reservationService from '@/lib/reservationService';
import { RESERVATIONS_KEY } from '@/lib/reservationService';

/** Fetch the authenticated driver's own reservations. */
export function useDriverReservations() {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'driver'],
    queryFn: reservationService.getDriverReservations,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Fetch reservations on chargers owned by the authenticated host. */
export function useHostReservations() {
  return useQuery({
    queryKey: [...RESERVATIONS_KEY, 'host'],
    queryFn: reservationService.getHostReservations,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Fetch pending requests on chargers owned by the authenticated host. */
export function usePendingHostRequests() {
  const hostQuery = useHostReservations();
  const pendingData = (hostQuery.data ?? []).filter((r) => r.status === 'pending');

  return {
    ...hostQuery,
    data: pendingData,
  };
}
