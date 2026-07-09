import type { Charger, ChargerFilters, LatLng } from '@/data/types';

import { haversineKm } from '@/lib/distance';

/**
 * Apply a `ChargerFilters` object to a list of chargers.
 *
 * - `filters.status`: if empty, all statuses pass.
 * - `filters.connectorTypes`: if empty, all connector types pass.
 * - `filters.powerRange` / `priceRange`: inclusive [min, max].
 * - `filters.maxDistanceKm`: when set with a `userLocation`, drops chargers
 *   outside the radius.
 *
 * When `userLocation` is provided, the result is sorted by distance ascending.
 */
export function applyFilters(
  chargers: Charger[],
  filters: ChargerFilters,
  userLocation?: LatLng | null,
): Charger[] {
  const filtered = chargers.filter((c) => {
    if (filters.status.length > 0 && !filters.status.includes(c.status)) {
      return false;
    }
    if (
      filters.connectorTypes.length > 0 &&
      !filters.connectorTypes.includes(c.type)
    ) {
      return false;
    }
    const [pMin, pMax] = filters.powerRange;
    if (c.powerKw < pMin || c.powerKw > pMax) {
      return false;
    }
    const [priceMin, priceMax] = filters.priceRange;
    if (c.pricePerHour < priceMin || c.pricePerHour > priceMax) {
      return false;
    }
    if (
      filters.maxDistanceKm !== undefined &&
      userLocation !== undefined &&
      userLocation !== null
    ) {
      const d = haversineKm(userLocation, c.location);
      if (d > filters.maxDistanceKm) return false;
    }
    return true;
  });

  if (userLocation) {
    filtered.sort(
      (a, b) =>
        haversineKm(userLocation, a.location) -
        haversineKm(userLocation, b.location),
    );
  }

  return filtered;
}

/** Group chargers by `neighborhood`. */
export function groupByNeighborhood(
  chargers: Charger[],
): Record<string, Charger[]> {
  return chargers.reduce<Record<string, Charger[]>>((acc, c) => {
    const list = acc[c.neighborhood] ?? [];
    list.push(c);
    acc[c.neighborhood] = list;
    return acc;
  }, {});
}

/** Count chargers by status (for badges in the list/map header). */
export function countByStatus(chargers: Charger[]): {
  available: number;
  reserved: number;
  busy: number;
  total: number;
} {
  const counts = { available: 0, reserved: 0, busy: 0, total: chargers.length };
  for (const c of chargers) counts[c.status] += 1;
  return counts;
}

/** Whether the charger is currently usable right now. */
export function isBookableNow(c: Charger): boolean {
  return c.status === 'available';
}
