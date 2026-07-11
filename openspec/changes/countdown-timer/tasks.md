# Tasks: Live Countdown Timer

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 300–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full countdown timer feature | PR 1 | Single PR; all tasks below. Borderline 400-line budget — request exception if reviewer prefers split. |

## Phase 1: Database Migration & Type Plumbing

- [x] 1.1 Create `supabase/migrations/20260714000000_add_countdown_fields.sql` — add `busy_since timestamptz` and `estimated_duration_minutes int` to `chargers`; update `update_charger_rpc` signature (new params `p_busy_since`, `p_estimated_duration_minutes`); update `fetch_chargers_rpc` SELECT to return both columns.
- [x] 1.2 Add `busySince?: string` and `estimatedDurationMinutes?: number` to `Charger` interface in `src/data/types.ts`.
- [x] 1.3 Update `ChargerRow` type, `rowToCharger` mapper, and `updateCharger` RPC params in `src/lib/chargerService.ts` to handle the two new fields.

**Acceptance criteria**: `pnpm tsc --noEmit` passes; migration applies cleanly to a local Supabase instance.

## Phase 2: Core Hook

- [x] 2.1 Create `src/hooks/useCountdownTimer.ts` — accepts `(busySince: string | null | undefined, estimatedDurationMinutes: number | null | undefined)`, returns `{ minutes, seconds, isExpired, display }`. Uses `setInterval(1000)`, cleans up on unmount, pauses on AppState background.

**Acceptance criteria**: Hook returns `"02:59"` for 3-min countdown after 1s; returns `isExpired: true` for null/past inputs; no interval leak on unmount.

## Phase 3: Store & RPC Integration

- [x] 3.1 Add `toggleBusy(chargerId: string, durationMinutes: number)` and `setAvailable(chargerId: string)` to `src/data/chargerStore.ts`. Each calls `chargerService.updateCharger` with correct params and invalidates TanStack Query cache for `'chargers'`.

**Acceptance criteria**: Calling `toggleBusy` sets `busySince` to now and `estimatedDurationMinutes` to input; `setAvailable` nulls both; cache invalidation triggers re-render.

## Phase 4: UI — Bottom Sheet & Profile

- [x] 4.1 Create `src/components/DurationPickerSheet.tsx` — bottom sheet with chip options (30m, 1h, 1.5h, 2h, 3h); returns selected minutes on confirm. Uses `@gorhom/bottom-sheet`.
- [x] 4.2 Modify `src/components/charger/OwnerChargerCard.tsx` — add "Marcar ocupado" / "Marcar disponible" actions to overflow menu. "Marcar ocupado" opens `DurationPickerSheet`, then calls `chargerStore.toggleBusy`. "Marcar disponible" calls `chargerStore.setAvailable` directly.
- [x] 4.3 Modify `src/components/sheets/ChargerDetailSheet.tsx` — replace static `formatCountdown(availableInMinutes)` with `useCountdownTimer(busySince, estimatedDurationMinutes)`. Show "Ocupado" + connector type + live MM:SS when busy; "Disponible" when expired. Use `RN Animated` for tick pulse (NOT Reanimated).

**Acceptance criteria**: Toggling to busy opens duration picker → confirms → countdown appears live in detail sheet. Toggling to available clears countdown. Connector type visible in specs row.

## Phase 5: Verification

- [x] 5.1 Run `pnpm tsc --noEmit` — zero errors.
- [x] 5.2 Verify timer cleanup: mount component with countdown, unmount, confirm no orphaned intervals (manual or test).
- [x] 5.3 Verify edge cases: null fields → "Disponible"; expired timer → "Disponible"; rapid toggles → latest wins.

**Acceptance criteria**: All TypeScript compiles; no memory leaks; edge cases from spec behave correctly.
