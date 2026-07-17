# Proposal: Reservation Redesign — Request + Approval + Messaging

## Intent

The current reservation system is "auto-approve time-slot booking": a driver picks a duration, selects from available slots in the next 7 days, and the reservation is immediately confirmed. This creates two problems: (1) the time-slot picker UX is confusing and brittle (all chargers have `schedule: null`, so it falls back to a default 08:00–22:00), and (2) hosts have zero control over who reserves their charger. The redesign shifts to a "request + owner approval" model: the driver sends a reservation request, the owner receives a push notification + automatic chat message, and the owner approves/rejects via a new host UI. Scheduling is agreed via chat, not a slot picker.

## Scope

### In Scope

- **DB migration**: Add `pending` to `reservations.status` CHECK constraint; make `start_time`/`end_time` nullable (confirmed later via chat)
- **New RPCs**: `request_reservation_rpc` (driver → owner), `approve_reservation_rpc`, `reject_reservation_rpc`
- **Automatic messaging**: On request creation, find-or-create conversation between driver and owner, send system message ("{driver} wants to reserve {charger}")
- **Push notifications**: Send push to owner when request is created
- **ChargerDetailSheet**: "Reservar" button on ALL chargers (available, busy, reserved) — not just available
- **Simple confirm dialog**: Replace `TimeSlotPicker` with a confirmation modal ("¿Quieres reservar este cargador?") — no time slots
- **Host UI**: Pending requests section in the profile tab showing requests with approve/reject actions
- **Overlap check at approval time**: Owner approves → RPC checks for conflicts before confirming

### Out of Scope

- Payment or deposit system
- Chat-based schedule picker (schedule is free-text in chat)
- Cancellation policy / penalty system
- Recurring reservations
- Real-time status updates via Supabase Realtime
- Migration of existing confirmed reservations (they remain as-is)

## Capabilities

### New Capabilities
- `reservation-request`: Request/approve/reject flow — replaces auto-approve time-slot booking with owner-controlled approval + messaging

### Modified Capabilities
- `reservations` (delta spec): Add `pending` status, nullable time fields, new RPCs for approve/reject, remove TimeSlotPicker dependency

## Approach

Single `pending` status added to existing `reservations` table. On request creation: RPC inserts reservation as `pending` with nullable start/end times, then the client creates a conversation message and fires a push notification to the owner. Owner approves via profile tab → `approve_reservation_rpc` performs overlap check (SELECT FOR UPDATE) and sets status to `confirmed`. Reject → `reject_reservation_rpc` sets status to `cancelled`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Add `pending` status, nullable start/end, 3 new RPCs |
| `src/data/types.ts` | Modified | `ReservationStatus` adds `'pending'`; `startTime`/`endTime` become optional |
| `src/lib/reservationService.ts` | Modified | New `requestReservation()`, `approveReservation()`, `rejectReservation()`, `getPendingHostRequests()` |
| `src/data/reservationStore.ts` | Modified | `request()` replaces `create()`; add `approve()`, `reject()` |
| `src/components/reservations/TimeSlotPicker.tsx` | Removed | Replaced by simple confirm dialog |
| `src/components/sheets/ChargerDetailSheet.tsx` | Modified | "Reservar" button on ALL chargers; simple confirm instead of TimeSlotPicker |
| `src/components/sheets/ReservationConfirmDialog.tsx` | New | Simple modal: "¿Quieres reservar este cargador?" with confirm/cancel |
| `src/components/profile/PendingRequests.tsx` | New | Host UI in profile tab: list pending requests with approve/reject |
| `app/(tabs)/profile.tsx` | Modified | Render PendingRequests section for hosts |
| `src/data/messageStore.ts` | Modified | `addReservationMessage()` helper for system-style reservation messages |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Owner never approves → driver stuck in limbo | Med | Auto-expire pending requests after 24h (future enhancement) |
| Overlap at approval time (race condition) | Low | SELECT FOR UPDATE in approve RPC serializes |
| Push notification fails → owner unaware | Low | Chat message is primary; push is supplementary |
| Existing confirmed reservations lack pending history | None | No migration needed — existing data stays as-is |

## Rollback Plan

Drop the 3 new RPCs. Revert `reservations.status` CHECK constraint to remove `pending`. Make `start_time`/`end_time` NOT NULL again. Remove new UI components. All changes are additive to existing table — no data loss.

## Dependencies

- Existing `send-push` Edge Function (already deployed)
- Existing `messageStore.findOrCreateConversation` + `addMessage` (already working)
- Existing `send_message` RPC (consolidated INSERT + UPDATE)

## Success Criteria

- [ ] Driver can request any charger (available, busy, or reserved) from the detail sheet
- [ ] Owner receives push notification + chat message on request
- [ ] Owner can approve/reject from profile tab
- [ ] Approval checks for overlapping confirmed reservations
- [ ] Rejected requests show as cancelled in driver's reservations
- [ ] No TimeSlotPicker — simple confirm dialog only
- [ ] Existing confirmed reservations remain unaffected
