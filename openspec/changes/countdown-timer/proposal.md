# Proposal: Live Countdown Timer

## Intent

The charger detail bottom sheet shows a static `availableInMinutes` value that never ticks down. Users see stale "Libre en 45 min" while the actual time passes silently. The host also has no way to signal *how long* they'll be busy when toggling status.

## Scope

### In Scope
- DB migration: add `busy_since timestamptz` and `estimated_duration_minutes integer` to `chargers`
- Update `update_charger_rpc` to accept both new fields on status change
- Duration picker (30min, 1h, 1.5h, 2h, 3h) in publish/status toggle flow
- `useCountdownTimer(estimatedEnd: Date | null)` hook — ticks every second, returns `{ minutes, seconds, isExpired }`
- Bottom sheet: replace static countdown with live tick-down timer; show connector type
- Profile "Mis cargadores" screen: add duration picker when host toggles to busy

### Out of Scope
- Supabase Realtime subscriptions (deferred)
- Push notifications on timer expiry
- Automatic status revert from busy → available (host decides)
- Any scheduling, booking, or reservation system

## Capabilities

### New Capabilities
- `countdown-timer`: Live countdown in charger detail bottom sheet and host status toggle with duration picker

### Modified Capabilities
None — no existing specs exist in `openspec/specs/`.

## Approach

**Hybrid**: DB stores ground truth (`busy_since` + `estimated_duration_minutes`). Client computes `estimatedEnd = busy_since + duration` and runs a local `setInterval` timer. TanStack Query refetch (staleTime 30s) reconciles drift when app regains focus. No Realtime dependency.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Migration adding 2 columns + RPC update |
| `src/hooks/useCountdownTimer.ts` | New | Timer hook with minute/second/expired state |
| `src/components/ChargerDetailSheet.tsx` | Modified | Replace static countdown with live timer |
| `src/hooks/useChargersQuery.ts` | Modified | Ensure refetch on focus for reconciliation |
| `src/lib/chargerService.ts` | Modified | Pass new fields in update RPC calls |
| `app/(tabs)/profile.tsx` | Modified | Duration picker on status toggle |
| `src/types/` | Modified | Update Charger type with new fields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Timer drift on long sessions | Low | TanStack Query refetch on focus corrects any drift |
| Timezone mismatch between DB and client | Low | Both use UTC; display converts to local |
| Host forgets to mark available after expiry | Med | Visual "Expired" state visible; no auto-change in v1 |

## Rollback Plan

Remove the two DB columns and revert the RPC signature. Remove `useCountdownTimer` hook and restore static `formatCountdown` in the bottom sheet. All client-side only — no data migration to undo.

## Dependencies

- TanStack Query (already in project, staleTime 30s for chargers)
- Supabase RPC `update_charger_rpc` must be updated server-side before client changes

## Success Criteria

- [ ] Bottom sheet shows "Libre en MM:SS" that ticks down every second
- [ ] When timer expires, badge changes to "Disponible"
- [ ] Host sees duration picker when toggling to busy
- [ ] Timer corrects after app background/foreground cycle (refetch)
- [ ] No TypeScript errors; existing charger flows unaffected
