# Design: Reservations / Bookings

## Technical Approach

Map the spec's RPC-first pattern to the existing codebase conventions. Four new PostgreSQL RPCs (`create_reservation_rpc`, `cancel_reservation_rpc`, `get_driver_reservations_rpc`, `get_host_reservations_rpc`) handle all writes with `SECURITY DEFINER` + `SELECT FOR UPDATE` serialization. Service → store → hook → component layers follow the established charger pattern exactly.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `SELECT FOR UPDATE` vs optimistic locking vs advisory locks | OFU is simplest for single-row serialization; advisory locks overkill for this cardinality | **SELECT FOR UPDATE** |
| SECURITY DEFINER RPCs vs client-side RLS for writes | RPCs centralize validation; RLS alone can't do cross-table transactions | **RPCs** (matches existing pattern) |
| TanStack Query + imperative store vs useSyncExternalStore | Query gives dedup, background refetch, stale-while-revalidate; SWS needs manual cache | **TanStack Query** (matches chargerStore) |
| Optimistic cache vs refetch-on-mutate | Optimistic = instant UI; risk of stale if RPC fails | **Optimistic** for cancel/create (matches messageStore pattern) |
| Segmented control vs separate screens for dual-view | Segmented = one screen, less nav; separate = more isolation | **Segmented control** (lighter, single query key switch) |

## Data Flow

**Create reservation (driver taps "Reservar"):**
```
ChargerDetailSheet → TimeSlotPicker → reservationStore.create()
  → reservationService.createReservation() → Supabase RPC
  → invalidate [driver-reservations] + [host-reservations] + [chargers]
  → BookingsTab re-renders with new entry
```

**Cancel reservation (driver taps "Cancelar"):**
```
ReservationCard → reservationStore.cancel()
  → reservationService.cancelReservation() → Supabase RPC
  → optimistic update removes from local cache
  → invalidate [chargers] (status → available)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDD000000_add_reservations.sql` | Create | `reservations` table, CHECK constraint update, 4 RPCs, RLS |
| `src/data/types.ts` | Modify | Add `Reservation`, `ReservationStatus`, `ReservationWithCharger`; `ChargerStatus` already includes `'reserved'` |
| `src/lib/reservationService.ts` | Create | RPC wrappers (snake_case → camelCase mapping); query key constant |
| `src/data/reservationStore.ts` | Create | Imperative store (create, cancel) + `useDriverReservations()` / `useHostReservations()` hooks |
| `src/hooks/useReservationsQuery.ts` | Create | TanStack Query hooks delegating to reservationService |
| `app/(tabs)/bookings.tsx` | Modify | Replace EmptyState with segmented control + FlatList of ReservationCards |
| `src/components/ReservationCard.tsx` | Create | Status badge, datetime, charger info, contextual cancel action |
| `src/components/TimeSlotPicker.tsx` | Create | Duration picker, validates within charger schedule, confirms booking |
| `src/components/sheets/ChargerDetailSheet.tsx` | Modify | Add "Reservar" button for available chargers; wire TimeSlotPicker flow |

## Interfaces / Contracts

```typescript
type ReservationStatus = 'confirmed' | 'cancelled' | 'completed';

interface Reservation {
  id: string;
  driverId: string;
  chargerId: string;
  startTime: string; // ISO 8601
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
}

interface ReservationWithCharger extends Reservation {
  charger: Pick<Charger, 'id' | 'title' | 'address' | 'location' | 'powerKw' | 'type'>;
  driver?: Pick<User, 'id' | 'name' | 'surname' | 'avatarUrl'>; // host view only
}
```

RPC signatures: `create_reservation_rpc(p_charger_id, p_start_time, p_end_time)` returns `jsonb`. `cancel_reservation_rpc(p_reservation_id)` returns `void`. `get_driver_reservations_rpc()` returns `jsonb[]`. `get_host_reservations_rpc()` returns `jsonb[]`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service | RPC call + row mapping | Unit test reservationService functions with mocked Supabase client |
| Store | create/cancel mutations + cache invalidation | Unit test with QueryClient testing utilities |
| Hook | Data fetch returns correctly shaped data | Render with QueryClientProvider wrapper, assert data |
| E2E | Full flow: map → detail sheet → time slot → reservation → bookings tab | Detox or manual flow test |

## Migration / Rollout

1. `reservations` table with indexes on `driver_id`, `charger_id`, `(charger_id, start_time, end_time)`
2. `ALTER TABLE chargers ADD CONSTRAINT chargers_status_check` — add `'reserved'` to existing CHECK
3. RLS: SELECT for drivers (own rows) and hosts (own chargers); no INSERT/UPDATE/DELETE (all via RPC)
4. Four SECURITY DEFINER RPCs created in the same migration
5. No data migration — all additive; `reserved` status was already in the TS type but unused

## Open Questions

- None — all decisions resolved against existing codebase patterns
