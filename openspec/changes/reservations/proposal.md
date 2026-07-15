# Proposal: Reservations / Bookings

## Intent

Drivers have no way to reserve a charger — the only action on the detail sheet is "Contactar". The bookings tab is an empty placeholder. Without reservation semantics, drivers must manually coordinate time slots via messages, creating friction and overlap risk. This change introduces server-side time-slot reservations so drivers can book chargers and hosts can see bookings on their chargers.

## Scope

### In Scope
- DB migration: `reservations` table (driver_id, charger_id, start_time, end_time, status enum)
- DB migration: add `'reserved'` to `charger.status` CHECK constraint (currently only `available|busy`)
- Server-side RPC `create_reservation_rpc` with SELECT FOR UPDATE overlap prevention
- RPCs: `cancel_reservation_rpc`, `get_driver_reservations_rpc`, `get_host_reservations_rpc`
- Auto-approve v1: reservation created = confirmed immediately (no host approval)
- Charger status sync: `available` → `reserved` (on create) → `available` (on complete/cancel)
- Bookings tab: dual-view — "Mis reservas" (driver) / "Reservas en mis cargadores" (host)
- Reservation item component: status badge, date/time, charger location, actions (cancel, navigate, extend, review)
- "Reservar" button on `ChargerDetailSheet` replacing or alongside "Contactar"
- Time-slot picker in reservation flow (duration selection)

### Out of Scope
- Host approval/rejection workflow (deferred to v2)
- Payment or deposit system
- Push notifications for reservation events
- Real-time status updates via Supabase Realtime
- Recurring reservations
- Cancellation policy / penalty system

## Capabilities

### New Capabilities
- `reservations`: Time-slot booking system — create, cancel, list, overlap prevention, dual-view (driver + host)

### Modified Capabilities
None — no existing specs exist in `openspec/specs/`.

## Approach

Server-side RPC with `SELECT FOR UPDATE` serializes reservation creation to prevent double-booking. TanStack Query powers the bookings tab with separate query keys for driver vs host view. Charger status updated via existing `update_charger_rpc` pattern. Auto-approve in v1 — status transitions directly to `confirmed` on creation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | `reservations` table + CHECK constraint update + 4 RPCs |
| `app/(tabs)/bookings.tsx` | Modified | Replace EmptyState with dual-view reservation list |
| `src/components/sheets/ChargerDetailSheet.tsx` | Modified | Add "Reservar" button + time-slot picker |
| `src/lib/reservationService.ts` | New | RPC calls for reservation CRUD |
| `src/data/reservationStore.ts` | New | TanStack Query store for reservations |
| `src/data/types.ts` | Modified | Add Reservation type, update ChargerStatus |
| `src/components/ReservationItem.tsx` | New | Reusable reservation card component |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Overlapping reservations under concurrent writes | Med | SELECT FOR UPDATE RPC serializes; DB enforces uniqueness |
| Stale charger status after reservation lifecycle events | Low | Status updated within same RPC transaction |
| Complex dual-view UX confusion | Low | Clear tab segment control; different query keys |

## Rollback Plan

Drop `reservations` table and associated RPCs. Remove `'reserved'` from CHECK constraint (requires new migration). Revert bookings tab to EmptyState. Remove `ReservationItem` and `reservationService`. All changes are additive — no existing data modified.

## Dependencies

- Existing `update_charger_rpc` must accept `'reserved'` status
- Supabase RPC `SECURITY DEFINER` pattern (already established)

## Success Criteria

- [ ] Driver can create a reservation on a charger without overlap
- [ ] Overlapping reservation attempt returns clear error
- [ ] Bookings tab shows driver's reservations with correct status
- [ ] Bookings tab shows host's charger reservations
- [ ] Reservation creation sets charger status to `reserved`
- [ ] Cancellation restores charger to `available`
- [ ] Auto-approve: new reservation = `confirmed` immediately
