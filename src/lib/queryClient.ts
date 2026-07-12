/**
 * Shared QueryClient instance.
 *
 * Imported by:
 * - app/_layout.tsx (QueryClientProvider)
 * - src/data/chargerStore.ts (imperative cache invalidation)
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes — keep in memory after unmount
      retry: 1,
      refetchOnReconnect: true,
    },
  },
});
