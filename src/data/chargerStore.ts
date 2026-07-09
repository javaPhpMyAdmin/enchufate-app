/**
 * In-memory CRUD store for chargers, persisted to AsyncStorage.
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
 * - Persistence: hydrated lazily on first `load()` (or on first `useChargers`
 *   call). If `enchufate.chargers` is empty in AsyncStorage, the 20 mock
 *   chargers from `mocks/chargers.ts` are used as the default seed.
 * - Validation: chargers round-trip through a Zod check on read so a
 *   corrupted payload (older schema, manual edit) cannot crash callers.
 */
import { useSyncExternalStore } from 'react';

import { storage } from '@/lib/storage';
import type { Charger, ChargerStatus, ConnectorType, LatLng } from '@/data/types';

import { mockChargers } from './mocks/chargers';
import { newChargerInputSchema, chargerSchema } from './chargerStore.schema';

const STORAGE_KEY = 'enchufate.chargers';

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

async function persist(): Promise<void> {
  await storage.setJSON(STORAGE_KEY, chargers);
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

async function hydrateFromStorage(): Promise<Charger[]> {
  const raw = await storage.getJSON<unknown>(STORAGE_KEY);
  if (raw == null) {
    // First run (or storage was cleared): use the curated mock seed.
    return mockChargers;
  }
  if (!Array.isArray(raw)) {
    console.warn('[chargerStore] persisted payload is not an array, using seed');
    return mockChargers;
  }
  const parsed: Charger[] = [];
  for (const item of raw) {
    const result = chargerSchema.safeParse(item);
    if (result.success) {
      parsed.push(result.data);
    } else {
      console.warn('[chargerStore] dropping invalid charger from storage', result.error.message);
    }
  }
  // If the persisted list was fully invalid, fall back to the seed so the
  // user still sees something on first paint.
  return parsed.length > 0 ? parsed : mockChargers;
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const next = await hydrateFromStorage();
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

function generateId(): string {
  return `c_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export const chargerStore = {
  /**
   * Force-hydrate from AsyncStorage. Safe to call multiple times; subsequent
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
    // `joinedAt` is accepted on the input (for tests / seed injection) but
    // is intentionally not persisted on the public `Charger` shape. Only
    // `User` carries a `joinedAt` field in this app.
    const next: Charger = {
      id: generateId(),
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      type: input.type,
      powerKw: input.powerKw,
      pricePerHour: input.pricePerHour,
      status: input.status ?? 'available',
      location: input.location,
      address: input.address,
      neighborhood: input.neighborhood,
      city: input.city,
      rating: 0,
      reviewCount: 0,
      photos: input.photos,
    };
    // Re-validate through Zod so the in-memory shape is always consistent
    // with the persisted shape.
    const parsed = newChargerInputSchema.parse(input);
    void parsed; // schema is the source of truth; parsed result is unused here.
    setChargers([...chargers, next]);
    await persist();
    return next;
  },

  async update(id: string, patch: Partial<AddChargerInput>): Promise<Charger> {
    await ensureLoaded();
    const idx = chargers.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`chargerStore.update: charger not found: ${id}`);
    }
    const current = chargers[idx]!;
    const merged: Charger = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title } : null),
      ...(patch.description !== undefined ? { description: patch.description } : null),
      ...(patch.type !== undefined ? { type: patch.type } : null),
      ...(patch.powerKw !== undefined ? { powerKw: patch.powerKw } : null),
      ...(patch.pricePerHour !== undefined
        ? { pricePerHour: patch.pricePerHour }
        : null),
      ...(patch.location !== undefined ? { location: patch.location } : null),
      ...(patch.address !== undefined ? { address: patch.address } : null),
      ...(patch.neighborhood !== undefined
        ? { neighborhood: patch.neighborhood }
        : null),
      ...(patch.city !== undefined ? { city: patch.city } : null),
      ...(patch.photos !== undefined ? { photos: patch.photos } : null),
      ...(patch.status !== undefined ? { status: patch.status } : null),
    };
    const next = [...chargers];
    next[idx] = merged;
    setChargers(next);
    await persist();
    return merged;
  },

  async remove(id: string): Promise<void> {
    await ensureLoaded();
    const next = chargers.filter((c) => c.id !== id);
    if (next.length === chargers.length) return;
    setChargers(next);
    await persist();
  },

  /**
   * Reset the store back to the seed (used by tests / debug tooling).
   * Not wired to any UI in v1.
   */
  async resetToSeed(): Promise<void> {
    setChargers(mockChargers);
    isLoaded = true;
    await persist();
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
  return snapshot as Charger[];
}

/** Subscribe to the chargers owned by a specific user. */
export function useMyChargers(ownerId: string | null | undefined): Charger[] {
  const all = useChargers();
  if (!ownerId) return [];
  return all.filter((c) => c.ownerId === ownerId);
}
