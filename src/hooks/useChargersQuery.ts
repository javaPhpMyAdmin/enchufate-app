/**
 * TanStack Query hooks for charger CRUD.
 *
 * Replaces the manual pub/sub + useSyncExternalStore pattern in
 * chargerStore.ts with declarative cache management, automatic
 * background refetch, loading/error states, and deduplication.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import * as chargerService from '@/lib/chargerService';
import { queryClient } from '@/lib/queryClient';
import type { Charger } from '@/data/types';

const CHARGER_QUERY_KEY = ['chargers'] as const;

/** Fetch all chargers. Shows loading state on first mount, stale-while-revalidate after. */
export function useChargersQuery() {
  return useQuery<Charger[]>({
    queryKey: CHARGER_QUERY_KEY,
    queryFn: chargerService.fetchAllChargers,
    staleTime: 30_000,       // 30s — don't re-fetch within this window
    gcTime: 5 * 60_000,      // 5 min — keep in cache after unmount
    refetchOnWindowFocus: true,
  });
}

/** Mutation: insert a new charger, then invalidate the list cache. */
export function useInsertCharger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chargerService.insertCharger,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
    },
  });
}

/** Mutation: update a charger, then invalidate the list cache. */
export function useUpdateCharger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof chargerService.updateCharger>[1];
    }) => chargerService.updateCharger(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
    },
  });
}

/** Mutation: delete a charger, then invalidate the list cache. */
export function useDeleteCharger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: chargerService.deleteCharger,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
    },
  });
}

/**
 * Invalidate the charger query cache from imperative (non-hook) code.
 * Used by chargerStore.add/update/remove so the UI re-renders after
 * imperative mutations without requiring the full pub/sub pattern.
 */
export function invalidateChargerCache(): void {
  void queryClient.invalidateQueries({ queryKey: CHARGER_QUERY_KEY });
}
