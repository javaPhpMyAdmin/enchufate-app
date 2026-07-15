/**
 * TanStack Query hooks for reservation data fetching.
 *
 * Two separate hooks with distinct query keys:
 * - useDriverReservations: the authenticated user's own reservations
 * - useHostReservations: reservations on chargers the user owns
 *
 * Both follow the useChargersQuery pattern with 30s staleTime.
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
