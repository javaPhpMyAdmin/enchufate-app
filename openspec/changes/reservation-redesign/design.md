# Design: Reservation Redesign — Request + Approval + Messaging

## Technical Approach

Replace the auto-approve time-slot flow with a request/approval model. The driver taps "Reservar" on any charger (available, busy, reserved), confirms via a simple dialog, and a `pending` reservation is created with nullable `start_time`/`end_time`. The client then sends a chat message and push notification to the owner. The owner approves or rejects from a new "Solicitudes pendientes" section in the profile tab. Approval runs an overlap check (`SELECT FOR UPDATE`) before confirming.

All new mutations are `SECURITY DEFINER` RPCs — consistent with the existing pattern (no RLS INSERT/UPDATE policies). Messaging and push remain client-side, calling existing `find_or_create_conversation` + `send_message` RPCs and the `send-push` Edge Function.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Add `pending` to CHECK constraint | (A) ALTER TABLE drop + re-add constraint; (B) New migration with CHECK including all 4 values | **A** — drop + re-add | Matches the pattern in `20260715000001_add_reservations.sql` line 35–40 (chargers status). Clean, atomic. |
| Nullable `start_time`/`end_time` | (A) ALTER COLUMN DROP NOT NULL; (B) Add new columns | **A** — DROP NOT NULL | Zero data loss. Existing rows keep their values. New `pending` rows get NULL. Index `idx_reservations_charger_time` remains usable (NULLs handled by overlap query). |
| Automatic messages on request | (A) Client-side after RPC; (B) DB trigger inside RPC | **A** — Client-side | Follows existing `addMessage` pattern. Keeps RPCs focused on data integrity. Client already handles conversation cache invalidation + push. |
| Push notifications | (A) Client-side fire-and-forget via Edge Function; (B) pg_notify + worker | **A** — Client-side | Matches existing `sendPushToRecipient` in `messageStore.ts`. No infrastructure changes needed. |
| Host UI location | (A) Profile tab; (B) Separate tab; (C) Bookings host view | **A** — Profile tab | Proposal scope. Profile already has "Mis cargadores" — natural home for host actions. Keeps bookings tab for reservation list only. |
| "Reservar" on busy chargers | (A) Always show button; (B) Show only on available; (C) Show on all but disabled on busy | **A** — Always show | Spec requires requesting any charger status. Scheduling happens in chat, not slot picker. |
| Confirm dialog replacement | (A) Replace TimeSlotPicker with simple Alert/Modal; (B) Reuse bottom sheet | **A** — Simple Modal | Minimal UX. "¿Quieres reservar este cargador?" + Confirm/Cancel. No time selection. |

## Data Flow

### Request Creation

```
Driver taps "Reservar" → ReservationConfirmDialog → confirm
  ↓
reservationStore.request(chargerId)
  ↓
request_reservation_rpc(charger_id) → INSERT reservation (pending, null times)
  ↓ (client after RPC succeeds)
messageStore.findOrCreateConversation([driverId, ownerId])
  → messageStore.addMessage("Hola, me gustaria reservar tu cargador [title]")
  → sendPushToRecipient(ownerId, "Alguien quiere reservar tu cargador", ...)
  ↓
invalidateQueries(RESERVATIONS_KEY, CHARGER_QUERY_KEY)
```

### Host Approval

```
Host taps "Aceptar" in PendingRequests
  ↓
reservationStore.approve(reservationId)
  ↓
approve_reservation_rpc(reservation_id)
  → SELECT FOR UPDATE reservation
  → SELECT FOR UPDATE charger
  → Overlap check: SELECT count(*) FROM reservations
      WHERE charger_id = ? AND status = 'confirmed'
        AND tstzrange(start_time, end_time) && tstzrange(...)
  → If overlap: raise exception
  → UPDATE reservation SET status = 'confirmed'
  → UPDATE charger SET status = 'reserved'
  ↓ (client after RPC succeeds)
findOrCreateConversation([hostId, driverId])
  → addMessage("Listo! Tu reserva fue confirmada. Chateamos para coordinar.")
  → sendPushToRecipient(driverId, "Tu reserva fue confirmada", ...)
  → invalidateQueries(RESERVATIONS_KEY, CHARGER_QUERY_KEY)
```

### Host Rejection

```
Host taps "Rechazar" → confirmation dialog
  ↓
reservationStore.reject(reservationId)
  ↓
reject_reservation_rpc(reservation_id)
  → UPDATE reservation SET status = 'cancelled'
  (charger status UNCHANGED — was never modified)
  ↓ (client after RPC succeeds)
findOrCreateConversation([hostId, driverId])
  → addMessage("Lo siento, no puedo aceptar la reserva en este momento.")
  → sendPushToRecipient(driverId, "Tu reserva no fue aceptada", ...)
  → invalidateQueries(RESERVATIONS_KEY)
```

## Database Changes

### Migration: `20260716000000_reservation_request_approval.sql`

**1. Add `pending` to CHECK constraint:**
```sql
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
```

**2. Make time fields nullable:**
```sql
ALTER TABLE public.reservations
  ALTER COLUMN start_time DROP NOT NULL;

ALTER TABLE public.reservations
  ALTER COLUMN end_time DROP NOT NULL;
```

**3. `request_reservation_rpc`:**
```sql
CREATE OR REPLACE FUNCTION public.request_reservation_rpc(
  p_charger_id uuid
) RETURNS jsonb
-- SECURITY DEFINER, set search_path = public
-- Logic:
--   1. auth.uid() = driver, validate charger exists
--   2. Cannot reserve own charger
--   3. No existing pending reservation for same driver+charger (dedup)
--   4. INSERT reservation (status='pending', start_time=NULL, end_time=NULL)
--   5. Return reservation row as jsonb
-- NOTE: No charger status change. No overlap check at request time.
```

**4. `approve_reservation_rpc`:**
```sql
CREATE OR REPLACE FUNCTION public.request_approval_rpc(
  p_reservation_id uuid
) RETURNS jsonb
-- SECURITY DEFINER
-- Logic:
--   1. SELECT reservation FOR UPDATE (must be status='pending')
--   2. Verify auth.uid() = charger owner (via JOIN)
--   3. SELECT charger FOR UPDATE
--   4. Overlap check: SELECT count(*) FROM reservations
--      WHERE charger_id = v_charger_id AND status = 'confirmed'
--        AND start_time IS NOT NULL AND end_time IS NOT NULL
--        AND tstzrange(start_time, end_time) && tstzrange(start_time, end_time)
--   5. If overlap → raise exception
--   6. UPDATE reservation SET status='confirmed'
--   7. UPDATE charger SET status='reserved'
--   8. Return reservation as jsonb
```

**5. `reject_reservation_rpc`:**
```sql
CREATE OR REPLACE FUNCTION public.request_rejection_rpc(
  p_reservation_id uuid
) RETURNS void
-- SECURITY DEFINER
-- Logic:
--   1. SELECT reservation FOR UPDATE (must be status='pending')
--   2. Verify auth.uid() = charger owner
--   3. UPDATE reservation SET status='cancelled'
--   4. Charger status UNCHANGED
```

**6. Update existing RPCs:**
- `get_host_reservations_rpc`: Add `pending` to filter (hosts need to see pending)
- `get_driver_reservations_rpc`: Already returns all statuses — no change needed
- `cancel_reservation_rpc`: Allow cancelling `pending` status too (driver-initiated cancel)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260716000000_reservation_request_approval.sql` | Create | New migration: CHECK constraint, nullable columns, 3 new RPCs, update existing RPCs |
| `src/data/types.ts` | Modify | `ReservationStatus` adds `'pending'`; `startTime`/`endTime` become `string \| null`; `RESERVATION_STATUS_LABELS` adds `pending` |
| `src/lib/reservationService.ts` | Modify | Add `requestReservation()`, `approveReservation()`, `rejectReservation()`, `getPendingHostRequests()`. Update `ReservationRow` type for nullable times. Remove `getChargerReservations()` (no longer needed). |
| `src/data/reservationStore.ts` | Modify | Add `request()` method (replaces `create()`), add `approve()`, `reject()`. Each calls new RPC + invalidates caches. |
| `src/hooks/useReservationsQuery.ts` | Modify | Add `usePendingHostRequests()` hook using new query key `[...RESERVATIONS_KEY, 'pending-host']` |
| `src/components/reservations/TimeSlotPicker.tsx` | Delete | No longer needed — replaced by simple confirm dialog |
| `src/components/reservations/index.ts` | Modify | Remove `TimeSlotPicker` export |
| `src/components/sheets/ChargerDetailSheet.tsx` | Modify | Remove `TimeSlotPicker` ref + usage. "Reservar" button always shown (any status). On press: show `ReservationConfirmDialog` instead of opening TimeSlotPicker. |
| `src/components/sheets/ReservationConfirmDialog.tsx` | Create | Simple modal: "¿Quieres reservar este cargador?" with Confirm/Cancel. Calls `reservationStore.request()`. |
| `src/components/profile/PendingRequests.tsx` | Create | Host UI: FlatList of pending requests with driver avatar, charger title, Approve/Reject buttons. Calls `approve()`/`reject()`. |
| `app/(tabs)/profile.tsx` | Modify | Render `PendingRequests` section for hosts (between "Mis cargadores" and "Editar perfil") |
| `src/components/reservations/ReservationCard.tsx` | Modify | Handle nullable `startTime`/`endTime` — show "Horario a coordinar" when null. Add `pending` status tone (e.g., amber). |
| `app/(tabs)/bookings.tsx` | Modify | Pass `isPending` prop to ReservationCard for pending display. No structural changes. |
| `src/data/messageStore.ts` | Modify | Export `sendPushToRecipient` or create `addReservationMessage()` helper that wraps `findOrCreateConversation` + `addMessage` + push in one call |

## Interfaces / Contracts

### TypeScript Types

```typescript
// src/data/types.ts
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Reservation {
  id: string;
  driverId: string;
  chargerId: string;
  startTime: string | null;  // nullable — confirmed via chat
  endTime: string | null;    // nullable — confirmed via chat
  status: ReservationStatus;
  createdAt: string;
}
```

### RPC Signatures

```typescript
// request_reservation_rpc
supabase.rpc('request_reservation_rpc', { p_charger_id: string })
// Returns: { id, driver_id, charger_id, start_time: null, end_time: null, status: 'pending', created_at }

// approve_reservation_rpc
supabase.rpc('approve_reservation_rpc', { p_reservation_id: string })
// Returns: { id, driver_id, charger_id, start_time, end_time, status: 'confirmed', created_at }

// reject_reservation_rpc
supabase.rpc('reject_reservation_rpc', { p_reservation_id: string })
// Returns: void
```

### Component Props

```typescript
// ReservationConfirmDialog
interface ReservationConfirmDialogProps {
  visible: boolean;
  chargerId: string;
  chargerTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

// PendingRequests
interface PendingRequestsProps {
  userId: string;
}
```

## Sequencing

```
Phase 1 — Database (no UI dependency)
  ├── Migration: CHECK constraint + nullable columns
  ├── 3 new RPCs
  └── Update existing RPCs (cancel_reservation_rpc, get_host_reservations_rpc)

Phase 2 — Service + Store Layer (depends on Phase 1)
  ├── src/data/types.ts updates
  ├── src/lib/reservationService.ts new functions
  ├── src/data/reservationStore.ts new methods
  └── src/hooks/useReservationsQuery.ts new hook

Phase 3 — UI (depends on Phase 2, parallelizable within)
  ├── ReservationConfirmDialog.tsx (new) ─┐
  ├── ChargerDetailSheet.tsx (modify)     ├── parallel
  ├── ReservationCard.tsx (modify)        ─┘
  ├── PendingRequests.tsx (new)  ─┐
  └── profile.tsx (modify)        ─┘ parallel

Phase 4 — Cleanup
  ├── Delete TimeSlotPicker.tsx
  └── Update reservations/index.ts
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| RPC | `request_reservation_rpc`: happy path, own charger, dedup pending | `supabase db reset` + manual SQL tests |
| RPC | `approve_reservation_rpc`: happy path, overlap rejection, non-owner denial | SQL test scripts |
| RPC | `reject_reservation_rpc`: happy path, non-owner denial | SQL test scripts |
| Integration | Request → conversation created → message sent | Manual flow test |
| UI | Confirm dialog renders, calls RPC, shows success/error | Visual manual test |
| UI | PendingRequests loads, approve/reject works | Visual manual test |
| UI | ChargerDetailSheet "Reservar" on all statuses | Visual manual test |

## Migration / Rollout

Single migration file. Additive changes only — no data loss. Existing `confirmed`/`cancelled`/`completed` rows unaffected. New `pending` rows will have NULL `start_time`/`end_time`. Rollback: drop new RPCs, revert CHECK constraint, re-add NOT NULL (safe since no pending rows would exist after rollback).

## Open Questions

- None — all decisions resolved by proposal scope and existing codebase patterns.
