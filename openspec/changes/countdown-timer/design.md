# Design: Live Countdown Timer

## Technical Approach

Hybrid client-side timer backed by DB ground truth. The DB stores `busy_since` and `estimated_duration_minutes`; the client computes `estimatedEnd = busy_since + duration` and runs a `setInterval`-based hook. TanStack Query's `refetchOnWindowFocus` (already enabled) reconciles any drift when the app regains focus. No Realtime dependency.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Timer engine | `setInterval` vs Reanimated worklet vs AppState listener | `setInterval` + AppState | Expo Go constraint rules out Reanimated. `setInterval` is simplest; AppState pauses/resumes it to avoid wasted cycles in background. |
| Expiration authority | DB trigger auto-revert vs client-side `estimatedEnd` check | Client-side only | Spec says no auto-status-revert in v1. DB keeps `busy_since` + duration as-is; UI treats expired timers as "available" without a write. |
| Duration picker UX | Modal alert vs inline chips vs bottom sheet | Inline chip row in `OwnerChargerCard` overflow menu | Minimal UI surface. Host taps "Marcar ocupado" → chips appear in a small bottom sheet (reuse `@gorhom/bottom-sheet`). Confirm → RPC call. |
| Data flow for status toggle | Direct `chargerService.updateCharger` vs `chargerStore.toggleStatus` | New `chargerStore.toggleBusy(durationMinutes)` | Encapsulates the `busy_since` + `estimated_duration_minutes` logic. Invalidates cache after RPC. Follows existing imperative pattern. |
| Timer cleanup | Manual `clearInterval` vs AbortController | `useEffect` cleanup with `clearInterval` + AppState `removeEventListener` | Standard React pattern. No AbortController needed for intervals. |

## Data Flow

```
Host toggles "Marcar ocupado" in OwnerChargerCard
  → DurationPicker bottom sheet opens (30m, 1h, 1.5h, 2h, 3h)
  → Host confirms → chargerStore.toggleBusy(chargerId, durationMin)
  → chargerService.updateCharger(id, { status:'busy', busySince: now, estimatedDurationMinutes: durationMin })
  → Supabase update_charger_rpc(p_busy_since, p_estimated_duration_minutes)
  → Query cache invalidated → all consumers re-render

Map / Profile → charger data flows via TanStack Query
  → ChargerDetailSheet receives Charger with busySince + estimatedDurationMinutes
  → useCountdownTimer(busySince, estimatedDurationMinutes) → { minutes, seconds, isExpired, display }
  → UI shows live MM:SS tick-down or "Disponible" when expired
```

## Hook API

```typescript
// src/hooks/useCountdownTimer.ts
interface CountdownResult {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  display: string; // "MM:SS" or "00:00"
}

function useCountdownTimer(
  busySince: string | null | undefined,
  estimatedDurationMinutes: number | null | undefined,
): CountdownResult
```

**Behavior:**
- Computes `estimatedEnd` from `busySince + estimatedDurationMinutes` (both in UTC).
- Runs `setInterval` at 1000ms. On tick: calculate remaining ms, derive minutes/seconds.
- If `estimatedEnd` is in the past or inputs are null → returns `{ 0, 0, true, "00:00" }`.
- `useEffect` cleanup clears interval. AppState listener pauses interval when backgrounded, resumes on foreground.
- Does NOT write to DB on expiry — pure display hook.

## Migration SQL

```sql
-- supabase/migrations/20260714000000_add_countdown_fields.sql

ALTER TABLE public.chargers
  ADD COLUMN IF NOT EXISTS busy_since timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;

-- Update fetch_chargers_rpc to include new columns in SELECT
-- Update update_charger_rpc signature to accept:
--   p_busy_since timestamptz DEFAULT NULL,
--   p_estimated_duration_minutes integer DEFAULT NULL
-- When p_status = 'busy': both params required (RPC validates).
-- When p_status = 'available': both set to NULL.

-- fetch_chargers_rpc returns the two new columns.
-- The row-to-app mapper reads them as busySince / estimatedDurationMinutes.
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260714000000_add_countdown_fields.sql` | Create | Add `busy_since`, `estimated_duration_minutes` columns + RPC updates |
| `src/data/types.ts` | Modify | Add `busySince?: string` and `estimatedDurationMinutes?: number` to `Charger` interface |
| `src/lib/chargerService.ts` | Modify | Add fields to `ChargerRow`, `rowToCharger`, and `updateCharger` RPC params |
| `src/hooks/useCountdownTimer.ts` | Create | Timer hook: interval management, AppState pause/resume, cleanup |
| `src/components/sheets/ChargerDetailSheet.tsx` | Modify | Replace static `formatCountdown(availableInMinutes)` with `useCountdownTimer` live display; add connector type in specs row |
| `src/components/charger/OwnerChargerCard.tsx` | Modify | Add "Marcar ocupado" / "Marcar disponible" toggle action in overflow menu; show duration picker bottom sheet on busy toggle |
| `src/components/DurationPickerSheet.tsx` | Create | Bottom sheet with duration chip options (30m, 1h, 1.5h, 2h, 3h) using `@gorhom/bottom-sheet` |
| `src/data/chargerStore.ts` | Modify | Add `toggleBusy(id, durationMinutes)` and `setAvailable(id)` methods |

## Component Hierarchy

```
ProfileScreen
  └─ OwnerChargerCard
       ├─ ChargerStatusBadge
       └─ ActionSheet (overflow)
            ├─ "Editar" → existing
            ├─ "Eliminar" → existing
            ├─ "Marcar ocupado" → opens DurationPickerSheet (NEW)
            └─ "Marcar disponible" → calls chargerStore.setAvailable (NEW)

ChargerDetailSheet
  └─ DetailContent
       ├─ Header (avatar, name, status pill)
       ├─ Specs row (power + price + connector type)
       ├─ CountdownBox (uses useCountdownTimer — NEW live tick)
       └─ Actions row
```

## Edge Cases

| Case | Handling |
|------|----------|
| `busy_since` set but `estimated_duration_minutes` is NULL | Treated as expired (defensive). UI shows "Disponible". |
| Multiple rapid toggles | Each toggle writes new `busy_since = now()`. Previous countdown discarded. |
| App backgrounded > staleTime (30s) | On foreground: `refetchOnWindowFocus` triggers fresh fetch. Timer resets to correct remaining time. |
| Host closes app while timer runs | Timer stops locally. On next open, refetch corrects. No DB write needed. |
| Clock skew DB ↔ client | ±1s visual drift, self-corrects on next refetch. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useCountdownTimer` return values at various time deltas | Mock `Date.now()`, verify minutes/seconds/isExpired/display |
| Unit | `rowToCharger` maps `busy_since` / `estimated_duration_minutes` | Pure function test with mock row |
| Integration | Duration picker → `toggleBusy` → cache invalidation | Render `OwnerChargerCard`, tap toggle, verify RPC params |
| Integration | ChargerDetailSheet shows live countdown | Provide charger with `busySince` 2min ago, verify MM:SS ticks |
| E2E | Full host flow: toggle busy → see countdown on map → toggle available | Manual or Detox |

## Open Questions

- None — all design decisions are resolved by the spec and existing codebase patterns.
