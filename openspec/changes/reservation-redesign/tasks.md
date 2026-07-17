# Tasks: Reservation Redesign — Request + Approval + Messaging

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR with `size:exception` (delivery: single-pr) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

> **Rationale**: 1 new migration (~150 lines), 3 new components (~250 lines), 8 modified files (~300 lines). Total exceeds 400-line budget but the orchestrator specifies `single-pr` delivery. Mark `size:exception` and proceed as one PR.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All work (single PR) | PR 1 | `size:exception` — migration + types + service + store + UI + cleanup. 14 files. |

## Phase 1: Database Migration

- [x] 1.1 Create `supabase/migrations/20260716000000_reservation_request_approval.sql`: DROP + re-add `reservations_status_check` with `'pending'`; `ALTER COLUMN start_time/end_time DROP NOT NULL`. Files: `supabase/migrations/`
- [x] 1.2 Create `request_reservation_rpc(p_charger_id uuid) RETURNS jsonb` in same migration: validates auth.uid(), prevents self-reserve, dedup pending, INSERT status='pending' times=NULL. Files: `supabase/migrations/20260716000000_*.sql`
- [x] 1.3 Create `approve_reservation_rpc(p_reservation_id uuid) RETURNS jsonb`: SELECT FOR UPDATE, verify owner, overlap check on confirmed, UPDATE confirmed + charger reserved. Files: `supabase/migrations/20260716000000_*.sql`
- [x] 1.4 Create `reject_reservation_rpc(p_reservation_id uuid) RETURNS void`: SELECT FOR UPDATE, verify owner, UPDATE cancelled. Files: `supabase/migrations/20260716000000_*.sql`
- [x] 1.5 Update `get_host_reservations_rpc` to include `'pending'` in filter. Update `cancel_reservation_rpc` to allow cancelling `'pending'`. Grant EXECUTE to `anon` + `authenticated` for all 3 new RPCs. Files: `supabase/migrations/20260716000000_*.sql`
- [x] 1.6 Run `supabase db reset` and manually test: request own charger (denied), request another (pending created), approve (confirmed + reserved), approve overlapping (error), reject (cancelled). Files: `supabase/migrations/`

## Phase 2: Types & Service Layer

- [x] 2.1 Update `ReservationStatus` to `'pending' | 'confirmed' | 'cancelled' | 'completed'`. Make `startTime`/`endTime` nullable (`string | null`). Add `'pending'` to `RESERVATION_STATUS_LABELS`. Files: `src/data/types.ts`
- [x] 2.2 Add `requestReservation(chargerId: string)`, `approveReservation(reservationId: string)`, `rejectReservation(reservationId: string)` to reservationService. Update `ReservationRow` type for nullable times. Files: `src/lib/reservationService.ts`
- [x] 2.3 Add `request()`, `approve()`, `reject()` methods to reservationStore. Each calls corresponding RPC, then invalidates `RESERVATIONS_KEY` + `CHARGER_QUERY_KEY` queries. Files: `src/data/reservationStore.ts`
- [x] 2.4 Add `usePendingHostRequests()` hook using query key `[...RESERVATIONS_KEY, 'pending-host']` filtering for host's chargers with pending status. Files: `src/hooks/useReservationsQuery.ts`
- [x] 2.5 Add `addReservationMessage(participantIds, chargerTitle, messageType)` helper that wraps `findOrCreateConversation` + `addMessage` + `sendPushToRecipient`. Accepts `'request' | 'approved' | 'rejected'` to select message text. Files: `src/data/messageStore.ts`

## Phase 3: Request Flow (Driver Side)

- [x] 3.1 Create `ReservationConfirmDialog.tsx`: Modal with "¿Quieres reservar este cargador?" text, Confirm/Cancel buttons. Props: `visible`, `chargerId`, `chargerTitle`, `onClose`, `onSuccess`. Uses RN Animated (NOT Reanimated 4). Calls `reservationStore.request()`. Files: `src/components/sheets/ReservationConfirmDialog.tsx`
- [x] 3.2 Modify `ChargerDetailSheet.tsx`: Remove `TimeSlotPicker` import/usage. Show "Reservar" button on ALL charger statuses (available, busy, reserved). On press → open `ReservationConfirmDialog`. Files: `src/components/sheets/ChargerDetailSheet.tsx`
- [x] 3.3 Update `ReservationCard.tsx`: Handle nullable `startTime`/`endTime` — display "Horario a coordinar" when null. Add `pending` status visual tone (amber/yellow). Files: `src/components/reservations/ReservationCard.tsx`

## Phase 4: Approval Flow (Host Side)

- [x] 4.1 Create `PendingRequests.tsx`: FlatList of pending requests showing driver avatar, charger title, request date. Approve/Reject buttons per item. Optimistic UI update on action. Uses `usePendingHostRequests()` hook. Files: `src/components/profile/PendingRequests.tsx`
- [x] 4.2 Modify `profile.tsx`: Render `PendingRequests` section between "Mis cargadores" and "Editar perfil". Only visible for hosts (users with chargers). Files: `app/(tabs)/profile.tsx`
- [x] 4.3 Modify `bookings.tsx`: Pass pending status context to `ReservationCard` for proper display. Files: `app/(tabs)/bookings.tsx`

## Phase 5: Messaging & Notifications

- [x] 5.1 Wire request creation message: after `request_reservation_rpc` succeeds, call `addReservationMessage(participantIds, chargerTitle, 'request')` + `sendPushToRecipient(ownerId, ...)`. Files: `src/data/reservationStore.ts`
- [x] 5.2 Wire approval message: after `approve_reservation_rpc` succeeds, call `addReservationMessage([hostId, driverId], chargerTitle, 'approved')` + push to driver. Files: `src/data/reservationStore.ts`
- [x] 5.3 Wire rejection message: after `reject_reservation_rpc` succeeds, call `addReservationMessage([hostId, driverId], chargerTitle, 'rejected')` + push to driver. Files: `src/data/reservationStore.ts`

## Phase 6: Cleanup

- [x] 6.1 Delete `TimeSlotPicker.tsx`. Files: `src/components/reservations/TimeSlotPicker.tsx`
- [x] 6.2 Remove `TimeSlotPicker` export from `src/components/reservations/index.ts`. Files: `src/components/reservations/index.ts`
- [x] 6.3 Remove `getChargerReservations()` from reservationService if unused. Files: `src/lib/reservationService.ts`

## Phase 7: Verification

- [ ] 7.1 Manual test: Request flow — tap Reservar on available/busy/reserved charger → confirm dialog → pending reservation created → message sent → push received by owner. Files: n/a
- [ ] 7.2 Manual test: Approval flow — host sees pending in profile → approve → confirmed + reserved → driver gets message + push. Files: n/a
- [ ] 7.3 Manual test: Rejection flow — host rejects → cancelled → driver gets message + push. Files: n/a
- [ ] 7.4 Manual test: Overlap — approve two overlapping pending requests for same charger → second fails with error. Files: n/a
- [ ] 7.5 Manual test: Edge cases — own charger request denied, duplicate pending deduped, non-owner approve denied, push failure doesn't block reservation. Files: n/a
