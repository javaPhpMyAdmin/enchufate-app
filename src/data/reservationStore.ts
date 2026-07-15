/**
 * Reservation store — imperative interface.
 *
 * React consumers use the hooks in `useReservationsQuery.ts` which
 * delegate to TanStack Query. Imperative consumers (ChargerDetailSheet's
 * TimeSlotPicker flow) call `reservationStore.create()` / `.cancel()`
 * which write through to Supabase, then invalidate the query cache.
 *
 * Design notes:
 * - Follows the chargerStore pattern: imperative methods that invalidate
 *   TanStack Query caches after mutations.
 * - Optimistic cache removal on cancel for instant UI feedback.
 */
import * as reservationService from '@/lib/reservationService';
import { RESERVATIONS_KEY } from '@/lib/reservationService';
import { CHARGER_QUERY_KEY } from '@/lib/chargerService';
import { queryClient } from '@/lib/queryClient';
import type { ReservationWithCharger } from '@/data/types';

export const reservationStore = {
  /**
   * Create a reservation and invalidate all related caches.
   * Throws on RPC error so the caller can show an alert.
   */
  async create(
    chargerId: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    await reservationService.createReservation(chargerId, startTime, endTime);
    // Invalidate reservations + chargers (status changed to 'reserved')
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
  },

  /**
   * Cancel a reservation with optimistic cache removal.
   * Immediately removes the reservation from the local driver cache
   * so the UI reflects the cancellation instantly.
   */
  async cancel(reservationId: string): Promise<void> {
    // Optimistic: remove from driver reservations cache immediately
    queryClient.setQueriesData<ReservationWithCharger[]>(
      { queryKey: [...RESERVATIONS_KEY, 'driver'] },
      (prev) => prev?.filter((r) => r.id !== reservationId),
    );

    try {
      await reservationService.cancelReservation(reservationId);
    } catch (err) {
      // Revert optimistic update on failure by invalidating
      void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
      throw err;
    }

    // Invalidate all reservation caches + chargers (status may revert to 'available')
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
  },
};
