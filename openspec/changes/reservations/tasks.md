# Tasks: Reservations / Bookings

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB+Types) → PR 2 (Service/Store/Hooks) → PR 3 (UI+Integration) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + TypeScript types | PR 1 → main | Foundation; no UI; ~130 lines |
| 2 | Service + Store + Hooks | PR 2 → PR 1 | Data layer; ~280 lines |
| 3 | UI components + Integration | PR 3 → PR 2 | Components + tab rewrite; ~300 lines |

## Phase 1: Foundation — DB Migration & Types

- [x] 1.1 Create `supabase/migrations/20260715000001_add_reservations.sql`: `reservations` table (id uuid PK, driver_id uuid FK→profiles, charger_id uuid FK→chargers ON DELETE CASCADE, start_time timestamptz, end_time timestamptz, status text CHECK in confirmed/cancelled/completed, created_at timestamptz default now()), indexes on driver_id, charger_id, (charger_id, start_time, end_time)
- [x] 1.2 In same migration: ALTER TABLE chargers — add `'reserved'` to existing status CHECK constraint (via drop + recreate constraint with all three values)
- [x] 1.3 In same migration: RLS policies — SELECT for drivers (own rows via driver_id = auth.uid()), SELECT for hosts (rows where charger.owner_id = auth.uid()), no INSERT/UPDATE/DELETE direct (all writes via RPC)
- [x] 1.4 In same migration: CREATE FUNCTION `create_reservation_rpc(p_charger_id uuid, p_start_time timestamptz, p_end_time timestamptz)` — SECURITY DEFINER, validates no overlap via SELECT FOR UPDATE on reservations WHERE charger_id = p_charger_id AND status = 'confirmed' AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time), validates start_time > now(), end_time > start_time, charger owner ≠ caller, inserts reservation as 'confirmed', updates charger status to 'reserved' in same transaction, returns jsonb
- [x] 1.5 In same migration: CREATE FUNCTION `cancel_reservation_rpc(p_reservation_id uuid)` — SECURITY DEFINER, validates caller = driver_id, status = 'confirmed', sets status → 'cancelled', checks if any other active reservations exist for charger, if none → update charger status to 'available', returns void
- [x] 1.6 In same migration: CREATE FUNCTION `get_driver_reservations_rpc()` — SECURITY DEFINER, returns jsonb[] of driver's own reservations joined with charger metadata (id, title, address, location, power_kw, type), ordered by start_time DESC
- [x] 1.7 In same migration: CREATE FUNCTION `get_host_reservations_rpc()` — SECURITY DEFINER, returns jsonb[] of reservations on host's chargers joined with charger metadata + driver profile (id, name, surname, avatar_url), ordered by start_time DESC
- [x] 1.8 Add to `src/data/types.ts`: `ReservationStatus` type, `Reservation` interface (id, driverId, chargerId, startTime, endTime, status, createdAt), `ReservationWithCharger` interface extending Reservation with charger Pick and optional driver Pick

## Phase 2: Service Layer — RPC Wrappers, Store & Hooks

- [x] 2.1 Create `src/lib/reservationService.ts`: export `RESERVATIONS_KEY` query key constant, `createReservation(chargerId, startTime, endTime)` calling `create_reservation_rpc` and mapping response, `cancelReservation(reservationId)` calling `cancel_reservation_rpc`, `getDriverReservations()` calling `get_driver_reservations_rpc` and mapping array, `getHostReservations()` calling `get_host_reservations_rpc` and mapping array — follow chargerService.ts snake_case→camelCase pattern
- [x] 2.2 Create `src/data/reservationStore.ts`: imperative store with `create(chargerId, startTime, endTime)` and `cancel(reservationId)` mutations that call reservationService then invalidate query keys [RESERVATIONS_KEY, 'chargers'], optimistic update for cancel (remove from cache immediately)
- [x] 2.3 Create `src/hooks/useReservationsQuery.ts`: `useDriverReservations()` — useQuery with key `[RESERVATIONS_KEY, 'driver']` calling getDriverReservations, `useHostReservations()` — useQuery with key `[RESERVATIONS_KEY, 'host']` calling getHostReservations, both with staleTime 30s matching chargerStore pattern

## Phase 3: UI Components — ReservationCard & TimeSlotPicker

- [x] 3.1 Create `src/components/ReservationCard.tsx`: receive ReservationWithCharger props, render status badge (confirmed=green, cancelled=red, completed=gray), charger title + address, formatted start_time–end_time, contextual "Cancelar" action button (visible only if status=confirmed and start_time > now()), onPress navigates to charger or triggers cancel callback
- [x] 3.2 Create `src/components/TimeSlotPicker.tsx`: receive charger schedule (DaySchedule[]) and chargerId, render duration picker (1h/2h/4h options), time slot selector validated against charger's daily schedule, display price estimate (duration × pricePerHour), "Confirmar reserva" button that calls reservationStore.create() then closes sheet, show loading/error states
- [x] 3.3 Export ReservationCard from `src/components/index.ts` barrel if one exists, or ensure import path is correct

## Phase 4: Integration — Bookings Tab & ChargerDetailSheet

- [x] 4.1 Rewrite `app/(tabs)/bookings.tsx`: keep auth gate, add segmented control "Mis reservas" / "Reservas en mis cargadores" (show host tab only if user.isHost), use useDriverReservations / useHostReservations hooks, render FlatList of ReservationCard per active segment, show EmptyState per segment when empty, pull-to-refresh invalidates query
- [ ] 4.2 Modify `src/components/sheets/ChargerDetailSheet.tsx`: add "Reservar" button alongside "Contactar" for chargers with status='available' and not owned by current user, onPress opens TimeSlotPicker modal/bottom sheet, wire TimeSlotPicker confirm → reservationStore.create() → invalidate queries → close sheet
- [ ] 4.3 Verify: reservation creation flow end-to-end (map → detail sheet → time slot → confirm → bookings tab shows new entry), cancellation flow (bookings tab → cancel → status updates), host view (host sees reservations on their chargers with driver info)
