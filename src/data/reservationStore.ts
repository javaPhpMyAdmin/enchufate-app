/**
 * Reservation store — imperative interface.
 *
 * React consumers use the hooks in `useReservationsQuery.ts` which
 * delegate to TanStack Query. Imperative consumers call the store's
 * `request()` / `approve()` / `reject()` / `cancel()` methods
 * which write through to Supabase, then invalidate the query cache.
 *
 * Design notes:
 * - Follows the chargerStore pattern: imperative methods that invalidate
 *   TanStack Query caches after mutations.
 * - Messaging and push notifications are fire-and-forget after RPC success.
 */
import * as reservationService from '@/lib/reservationService';
import { RESERVATIONS_KEY } from '@/lib/reservationService';
import { CHARGER_QUERY_KEY } from '@/lib/chargerService';
import { queryClient } from '@/lib/queryClient';
import { messageStore } from '@/data/messageStore';
import { supabase } from '@/lib/supabase';
import type { ReservationWithCharger } from '@/data/types';

export const reservationStore = {
  /**
   * Request to reserve a charger (creates a pending reservation).
   * After RPC succeeds, sends a chat message + push to the owner.
   * Throws on RPC error so the caller can show an alert.
   */
  async request(
    chargerId: string,
    chargerTitle: string,
    ownerId: string,
  ): Promise<void> {
    const reservation = await reservationService.requestReservation(chargerId);

    // Invalidate reservations (driver sees pending) + chargers (no status change)
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });

    // Fire-and-forget: message + push to owner
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      void messageStore.addReservationMessage(
        [user.id, ownerId],
        chargerTitle,
        'request',
        user.id,
      );
    }
  },

  /**
   * Approve a pending reservation (host action).
   * After RPC succeeds, sends a chat message + push to the driver.
   */
  async approve(
    reservationId: string,
    driverId: string,
    chargerTitle: string,
  ): Promise<void> {
    await reservationService.approveReservation(reservationId);

    // Invalidate all reservation caches + chargers (status → reserved)
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });

    // Fire-and-forget: message + push to driver
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      void messageStore.addReservationMessage(
        [user.id, driverId],
        chargerTitle,
        'approved',
        user.id,
      );
    }
  },

  /**
   * Reject a pending reservation (host action).
   * After RPC succeeds, sends a chat message + push to the driver.
   */
  async reject(
    reservationId: string,
    driverId: string,
    chargerTitle: string,
  ): Promise<void> {
    await reservationService.rejectReservation(reservationId);

    // Invalidate reservation caches (status → cancelled)
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });

    // Fire-and-forget: message + push to driver
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      void messageStore.addReservationMessage(
        [user.id, driverId],
        chargerTitle,
        'rejected',
        user.id,
      );
    }
  },

  /**
   * Cancel a reservation with messaging.
   * Notifies the other party (driver or owner) via chat message.
   */
  async cancel(
    reservationId: string,
    otherPartyId?: string,
    chargerTitle?: string,
  ): Promise<void> {
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

    // Fire-and-forget: message to the other party
    if (otherPartyId && chargerTitle) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        void messageStore.addReservationMessage(
          [user.id, otherPartyId],
          chargerTitle,
          'cancelled',
          user.id,
        );
      }
    }
  },
};
