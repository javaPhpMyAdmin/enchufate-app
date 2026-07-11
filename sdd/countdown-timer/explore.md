# Exploration: Live Countdown Timer for Charger Detail Bottom Sheet

## Current State

### How the countdown display works today

The `ChargerDetailSheet.tsx` (lines 292-317) shows a countdown box when `charger.status !== 'available'` AND `charger.availableInMinutes` is truthy. It displays:

- Status label: "Reservado" or "Ocupado"
- Time: `Libre en {formatCountdown(availableInMinutes)}` — e.g. "Libre en 01:05:00"

The `formatCountdown()` in `format.ts` accepts `totalMinutes`, rounds up, and formats as `HH:MM:SS` or `MM:SS`. The seconds are always `:00` because mock data is minute-level.

**The display is completely static.** It renders once at fetch time and never updates. A charger showing "Libre en 01:05:00" will display that same value until the next full refetch.

### Charger data flow

1. **DB → RPC → Service → Store → Query → UI**
   - `fetchAllChargers()` calls `supabase.rpc('fetch_chargers_rpc')` — this RPC is NOT defined in migration files (created in Supabase dashboard or a missing migration)
   - `rowToCharger()` maps snake_case DB rows to camelCase `Charger` type
   - **Critical gap**: `rowToCharger()` does NOT map `available_in_minutes` — it's not in `ChargerRow` interface and no DB column exists for it
   - TanStack Query (`useChargersQuery`) fetches with 30s staleTime
   - `chargerStore` provides imperative access via `queryClient.getQueryData()`

### What `availableInMinutes` actually is

- **Type definition exists** in `types.ts` as `availableInMinutes?: number` with comment "Minutes until the charger is free. Only set for reserved/busy chargers."
- **Schema validation exists** in `chargerStore.schema.ts`
- **Only populated in mock data** — mock chargers have hardcoded values (35, 90, 60, 45, 15, 75, 25 minutes)
- **NOT in the database schema** — no `available_in_minutes` column in `chargers` table
- **NOT returned by Supabase** — the `ChargerRow` type in `chargerService.ts` doesn't include it

### How status changes work

- Host toggles charger status via `updateCharger()` → Supabase RPC `update_charger_rpc`
- DB only supports `available` and `busy` (not `reserved` — that's app-only/mock)
- DB trigger `handle_charger_status_change` logs sessions: inserts a `charger_sessions` row when status → `busy`, closes it when status → `available`
- **No end time or duration is stored** — only `started_at` on the session
- After update, `queryClient.invalidateQueries()` triggers a background refetch (30s staleTime)

### Supabase realtime

- **Not configured anywhere.** The Supabase client (`supabase.ts`) creates a vanilla client with auth settings only.
- No `supabase.channel()` or `.on('postgres_changes')` subscriptions exist in the codebase.
- A comment in `messageStore.ts` says "Phase 9 can add a subscription" — realtime is a known future need.

## Affected Areas

- `src/components/sheets/ChargerDetailSheet.tsx` — the countdown box UI (lines 292-317)
- `src/lib/format.ts` — `formatCountdown()` function (line 48)
- `src/data/types.ts` — `Charger.availableInMinutes` field
- `src/lib/chargerService.ts` — `rowToCharger()` mapping, `ChargerRow` interface
- `src/hooks/useChargersQuery.ts` — query configuration
- `supabase/migrations/` — need a new migration for DB-side time tracking
- New: likely a countdown hook (e.g. `useCountdownTimer.ts`)

## Approaches

### 1. Local Timer (client-side tick-down)

Store `availableAt: ISO timestamp` (instead of `availableInMinutes`) on the Charger, then use a `useEffect` + `setInterval(1000)` in the detail sheet to compute remaining time client-side.

- **Pros**: Zero new infrastructure. Simple React hook. Works offline. Smooth second-by-second UI.
- **Cons**: Requires `availableAt` or `started_at` timestamp from the server. Client clocks can drift. If the host ends a session early, the timer shows stale data until next refetch.
- **Effort**: Low

### 2. Supabase Realtime subscription

Subscribe to `postgres_changes` on the `chargers` table. When a status change happens, the subscription fires immediately, updating the store and re-rendering the countdown with the new data.

- **Pros**: Near-instant update when host toggles. No polling waste. Works across all devices viewing the charger.
- **Cons**: Requires enabling Realtime on the `chargers` table in Supabase dashboard + a new migration for RLS. Adds WebSocket connection overhead. Overkill if the 30s refetch is acceptable.
- **Effort**: Medium

### 3. Hybrid (recommended)

- **DB**: Add `started_at` timestamp to `chargers` table (or use `charger_sessions.started_at` which already exists). Compute `available_at` on the client as `started_at + estimated_duration`.
- **Client**: A `useCountdownTimer(targetDate)` hook ticks every second, rendering live MM:SS/HH:MM:SS.
- **Sync**: Keep the 30s TanStack Query refetch as the "truth reconciliation" mechanism. When the refetch brings back new data, the timer resets.
- **Optional future upgrade**: Add Supabase Realtime to close the 30s gap.

- **Pros**: Smooth UI immediately. Uses existing infrastructure. Realtime can be added later without changing the timer hook.
- **Cons**: 30s max staleness for host-side changes. Need to decide where the "end time" comes from (DB column vs. computed from session).
- **Effort**: Medium

## Recommendation

**Hybrid approach (Option 3)** — here's the implementation plan:

### Step 1: Add `started_at` to chargers (or derive from sessions)

Two sub-options:
- **A) Add `busy_since timestamptz` column to `chargers`** — simpler, self-contained. The trigger already knows when status flips to busy. The client computes `busy_since + estimated_minutes` for the countdown.
- **B) Use `charger_sessions.started_at`** — no new column, but requires joining/fetching sessions for the countdown. More normalized but more complex.

**Recommend: Option A** — add `busy_since` to `chargers`. The trigger already fires on status change; just set `busy_since = now()` when going to busy, null when going to available.

### Step 2: Update `fetch_chargers_rpc` to return `busy_since`

Add `busy_since` to the RPC return type and the `ChargerRow` mapping.

### Step 3: Create `useCountdownTimer(targetDate)` hook

```ts
function useCountdownTimer(targetDate: Date | null): { minutes: number; seconds: number; expired: boolean }
```

Ticks every second via `setInterval`. Returns live countdown values.

### Step 4: Update `ChargerDetailSheet`

Replace `formatCountdown(charger.availableInMinutes)` with live values from the hook. Show "Ocupado" with ticking countdown, and when it hits zero, show "Disponible" immediately (don't wait for refetch).

### Step 5 (optional, later): Supabase Realtime

Subscribe to `chargers` table changes to get instant status updates. This closes the 30s gap for other users viewing the same charger.

## Risks & Gotchas

1. **`fetch_chargers_rpc` is not in migration files** — it's likely created in the Supabase dashboard. The new `busy_since` column and RPC update need to be coordinated with whatever exists there. Ask the user to verify the RPC definition.

2. **No `reserved` status in DB** — the DB only has `available | busy`. The app type has `reserved` but it's only in mocks. The countdown box currently handles `reserved`, but it will never trigger from real data. This is dead code in practice.

3. **Estimated duration is unknown** — the host manually sets busy, but there's no "estimated end time" concept. The client needs either: (a) a new field the host sets when toggling to busy, or (b) a default estimate (e.g. 60 min). The mock data has varied values (15–90 min), suggesting different sessions have different durations.

4. **Timer resets on refetch** — if the user has the sheet open and a background refetch happens, the timer will jump. This is actually correct behavior (reconciles with server truth) but may feel jarring. Mitigate by animating the transition.

5. **Battery impact** — a 1-second interval in a bottom sheet is fine (user is actively looking), but must be cleaned up when the sheet closes. Use `useEffect` cleanup.

## Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should inform the user about:
- `availableInMinutes` only exists in mocks, not the database — the feature requires a DB change
- The recommended approach: add `busy_since` column + local countdown timer hook
- The 30-second staleness gap and the optional Realtime upgrade path
- The need to verify what `fetch_chargers_rpc` actually returns (not in codebase)
