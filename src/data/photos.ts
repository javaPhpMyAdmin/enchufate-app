/**
 * Placeholder photo pool for the publish wizard (Phase 3 v1).
 *
 * We use 8 stable picsum.photos URLs — each seed produces a deterministic
 * image so the same slot always shows the same photo between sessions.
 * Real uploads via Supabase Storage land in a later phase; until then the
 * host picks a representative image from this pool.
 *
 * Why picsum.photos and not inline data URIs:
 * - Data URIs are bulletproof offline but bloat the bundle (kilobytes per
 *   image) and force a re-render of the FlatList on every selection.
 * - picsum.photos is a tiny text URL, the images are reasonably fast on
 *   most connections, and the stable-seed approach keeps the UX consistent
 *   across runs. If offline becomes a real concern, we can swap this file
 *   for a bundle of static assets without touching any call site.
 */
export const CHARGER_PHOTO_POOL: ReadonlyArray<string> = [
  'https://picsum.photos/seed/enchufate-charger-01/800/600',
  'https://picsum.photos/seed/enchufate-charger-02/800/600',
  'https://picsum.photos/seed/enchufate-charger-03/800/600',
  'https://picsum.photos/seed/enchufate-charger-04/800/600',
  'https://picsum.photos/seed/enchufate-charger-05/800/600',
  'https://picsum.photos/seed/enchufate-charger-06/800/600',
  'https://picsum.photos/seed/enchufate-charger-07/800/600',
  'https://picsum.photos/seed/enchufate-charger-08/800/600',
];

/** Convenience accessor: pool member by stable index (wraps around). */
export function photoAt(index: number): string {
  const pool = CHARGER_PHOTO_POOL;
  if (pool.length === 0) {
    throw new Error('CHARGER_PHOTO_POOL is empty');
  }
  const i = ((index % pool.length) + pool.length) % pool.length;
  return pool[i]!;
}
