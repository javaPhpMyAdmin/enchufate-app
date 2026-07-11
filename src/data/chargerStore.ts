/**
 * In-memory CRUD store for chargers, backed by Supabase.
 *
 * Phase 3 introduces the host flow (publish / edit / delete). Previously
 * the map screen imported a frozen `mockChargers` array; now both the map
 * and the owner dashboard read from this single source of truth so newly
 * published chargers appear everywhere immediately.
 *
 * Design notes:
 * - Tiny pub/sub: `subscribe(listener)` returns an unsubscribe; listeners
 *   are notified after every successful mutation. React consumers wire up
 *   via `useChargers()` / `useMyChargers()` which use `useSyncExternalStore`
 *   (React 18+ stable).
 * - Persistence: the canonical data lives in Supabase. On first access the
 *   store fetches the full list; subsequent mutations write through to the
 *   DB and optimistically update the in-memory cache.
 * - Graceful degradation: if Supabase is unreachable the store returns an
 *   empty array rather than crashing.
 */
import { useSyncExternalStore } from 'react';

import * as chargerService from '@/lib/chargerService';
import type { Charger, ChargerStatus, ConnectorType, LatLng } from '@/data/types';

// ---------------------------------------------------------------------------
// Module-level state (singleton). The store is intentionally global so that
// all consumers (map screen, owner dashboard, publish flow) see the same
// data without prop-drilling a context.
// ---------------------------------------------------------------------------

let chargers: Charger[] = [];
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setChargers(next: Charger[]): void {
  chargers = next;
  notify();
}

/** Stable, monotonic snapshot key. `useSyncExternalStore` reads this. */
function getSnapshot(): readonly Charger[] {
  return chargers;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const next = await chargerService.fetchAllChargers();
    setChargers(next);
    isLoaded = true;
  })();
  await loadPromise;
  loadPromise = null;
}

// ---------------------------------------------------------------------------
// Public API
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
   * Force-hydrate from Supabase. Safe to call multiple times; subsequent
   * calls are no-ops. Most code paths should not call this — `useChargers`
   * triggers hydration implicitly.
   */
  async load(): Promise<void> {
    await ensureLoaded();
  },

  /** All chargers, in insertion order. */
  all(): readonly Charger[] {
    return chargers;
  },

  byId(id: string): Charger | null {
    return chargers.find((c) => c.id === id) ?? null;
  },

  byOwner(ownerId: string): Charger[] {
    return chargers.filter((c) => c.ownerId === ownerId);
  },

  async add(input: AddChargerInput): Promise<Charger> {
    await ensureLoaded();
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
    setChargers([created, ...chargers]);
    return created;
  },

  async update(id: string, patch: Partial<AddChargerInput>): Promise<Charger> {
    await ensureLoaded();
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
    const next = chargers.map((c) => (c.id === id ? updated : c));
    setChargers(next);
    return updated;
  },

  async remove(id: string): Promise<void> {
    await ensureLoaded();
    await chargerService.deleteCharger(id);
    const next = chargers.filter((c) => c.id !== id);
    setChargers(next);
  },

  /**
   * Reset the store to empty (used by tests / debug tooling).
   * Not wired to any UI in v1.
   */
  async resetToSeed(): Promise<void> {
    setChargers([]);
    isLoaded = true;
  },
};

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/** Subscribe to the full charger list. Hydrates on first mount. */
export function useChargers(): Charger[] {
  // `useSyncExternalStore` accepts a subscribe function and a snapshot
  // getter. We trigger hydration on first subscription by calling
  // `ensureLoaded()` lazily. The store re-renders subscribers once the
  // hydration promise resolves, so the component will paint the real data
  // automatically.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Kick off hydration if it hasn't started yet. We intentionally don't
  // await — the first render may show an empty list and the real data
  // lands via the subscription.
  if (!isLoaded && !loadPromise) {
    void ensureLoaded();
  }
  // Defensive: never return undefined. The snapshot is typed as
  // `readonly Charger[]` but the typecast erases that, so a caller doing
  // `arr.length` would crash if anything ever set `chargers` to undefined.
  return (snapshot ?? []) as Charger[];
}

/** Subscribe to the chargers owned by a specific user. */
export function useMyChargers(ownerId: string | null | undefined): Charger[] {
  const all = useChargers() ?? [];
  if (!ownerId) return [];
  return all.filter((c) => c.ownerId === ownerId);
}
