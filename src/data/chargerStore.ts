/**
 * Charger store — dual interface.
 *
 * React consumers:
 *   useChargers() / useMyChargers() delegate to TanStack Query for
 *   automatic cache management, background refetch, loading/error
 *   states, and deduplication.
 *
 * Imperative consumers (publish flow, owner dashboard):
 *   chargerStore.add() / .update() / .remove() write through to
 *   Supabase, then invalidate the TanStack Query cache so React
 *   components re-render automatically.
 *
 * Design notes:
 * - The old pub/sub + useSyncExternalStore pattern is removed.
 *   TanStack Query is the single source of truth for React rendering.
 * - Imperative methods no longer maintain a parallel in-memory cache;
 *   they rely on the query cache being invalidated after mutations.
 * - Graceful degradation: if Supabase is unreachable, queries return
 *   an empty array rather than crashing.
 */
import * as chargerService from '@/lib/chargerService';
import { queryClient } from '@/lib/queryClient';
import type { Charger, ChargerStatus, ConnectorType, LatLng } from '@/data/types';
import { useChargersQuery } from '@/hooks/useChargersQuery';

// ---------------------------------------------------------------------------
// Query key constant (must match useChargersQuery.ts)
// ---------------------------------------------------------------------------

const CHARGER_QUERY_KEY = ['chargers'] as const;

// ---------------------------------------------------------------------------
// Public API — imperative (non-React) interface
// ---------------------------------------------------------------------------

export interface AddChargerInput {
  ownerId: string;
  title: string;
  description: string;
  type: ConnectorType;
  powerKw: number;
  pricePerHour: number;
  location: LatLng;
  address: string;
  neighborhood: string;
  city: string;
  photos: string[];
  status?: ChargerStatus;
  /** ISO 8601 timestamp; defaults to "now". Tests can inject. */
  joinedAt?: string;
}

export const chargerStore = {
  /**
   * Force-hydrate from Supabase. Delegates to TanStack Query's refetch.
   * Safe to call multiple times; subsequent calls are no-ops if data is
   * still fresh (within staleTime).
   */
  async load(): Promise<void> {
    await queryClient.refetchQueries({ queryKey: CHARGER_QUERY_KEY });
  },

  /**
   * All chargers, in insertion order.
   * Returns from the query cache if available, otherwise fetches fresh.
   */
  all(): readonly Charger[] {
    return queryClient.getQueryData<Charger[]>(CHARGER_QUERY_KEY) ?? [];
  },

  byId(id: string): Charger | null {
    const all = queryClient.getQueryData<Charger[]>(CHARGER_QUERY_KEY) ?? [];
    return all.find((c) => c.id === id) ?? null;
  },

  byOwner(ownerId: string): Charger[] {
    const all = queryClient.getQueryData<Charger[]>(CHARGER_QUERY_KEY) ?? [];
    return all.filter((c) => c.ownerId === ownerId);
  },

  async add(input: AddChargerInput): Promise<Charger> {
    const created = await chargerService.insertCharger({
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      type: input.type,
      powerKw: input.powerKw,
      pricePerHour: input.pricePerHour,
      location: input.location,
      address: input.address,
      neighborhood: input.neighborhood,
      city: input.city,
      photos: input.photos,
      status: input.status ?? 'available',
    });
    // Invalidate so React components pick up the new charger.
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
    return created;
  },

  async update(id: string, patch: Partial<AddChargerInput>): Promise<Charger> {
    const updated = await chargerService.updateCharger(id, {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.powerKw !== undefined ? { powerKw: patch.powerKw } : {}),
      ...(patch.pricePerHour !== undefined ? { pricePerHour: patch.pricePerHour } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.neighborhood !== undefined ? { neighborhood: patch.neighborhood } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.photos !== undefined ? { photos: patch.photos } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
    return updated;
  },

  async remove(id: string): Promise<void> {
    await chargerService.deleteCharger(id);
    void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
  },

  /**
   * Reset the store to empty (used by tests / debug tooling).
   * Clears the query cache for chargers.
   */
  async resetToSeed(): Promise<void> {
    queryClient.setQueryData<Charger[]>(CHARGER_QUERY_KEY, []);
  },
};

// ---------------------------------------------------------------------------
// React hooks — delegate to TanStack Query
// ---------------------------------------------------------------------------

/** Subscribe to the full charger list via TanStack Query. */
export function useChargers(): Charger[] {
  const { data } = useChargersQuery();
  return data ?? [];
}

/** Subscribe to chargers owned by a specific user. */
export function useMyChargers(ownerId: string | null | undefined): Charger[] {
  const all = useChargers();
  if (!ownerId) return [];
  return all.filter((c) => c.ownerId === ownerId);
}
