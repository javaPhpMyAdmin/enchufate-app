# Countdown Timer Specification

## Purpose

Replace the static `availableInMinutes` countdown in the charger detail bottom sheet with a live ticking timer. Hosts choose a duration when toggling a charger to "busy"; the bottom sheet displays a real-time MM:SS countdown. The system auto-marks chargers as "available" when the timer expires.

## Data Model Changes

The `chargers` table SHALL gain two columns:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `busy_since` | `timestamptz` | YES | UTC timestamp when host set status to busy. NULL when available. |
| `estimated_duration_minutes` | `integer` | YES | Chosen duration in minutes. NULL when available. |

The `update_charger_rpc` function SHALL accept two new optional parameters: `p_busy_since` and `p_estimated_duration_minutes`. When `p_status` is `'busy'`, both parameters SHALL be required. When `p_status` is `'available'`, both SHALL be set to NULL.

The `Charger` TypeScript interface SHALL gain:
- `busySince?: string` (ISO 8601)
- `estimatedDurationMinutes?: number`

The `rowToCharger` mapper SHALL include these fields.

## Requirements

### Requirement: useCountdownTimer Hook

The system SHALL provide a `useCountdownTimer(estimatedEnd: Date | null)` hook that returns `{ minutes: number, seconds: number, isExpired: boolean, display: string }`.

#### Scenario: Timer ticks down every second

- GIVEN `estimatedEnd` is 3 minutes in the future
- WHEN 1 second passes
- THEN `display` shows `"02:59"` and `isExpired` is false

#### Scenario: Timer reaches zero

- GIVEN `estimatedEnd` is 1 second in the future
- WHEN 1 second passes
- THEN `isExpired` is true, `minutes` is 0, `seconds` is 0, and `display` is `"00:00"`

#### Scenario: Null estimatedEnd

- GIVEN `estimatedEnd` is null
- WHEN the hook renders
- THEN `isExpired` is true and `display` is `"00:00"`

#### Scenario: Timer cleanup on unmount

- GIVEN the timer is running
- WHEN the component unmounts
- THEN the `setInterval` SHALL be cleared (no memory leak)

### Requirement: Bottom Sheet Live Countdown

The charger detail bottom sheet SHALL replace the static `formatCountdown(availableInMinutes)` with a live `useCountdownTimer` display.

#### Scenario: Busy charger shows live countdown

- GIVEN a charger with `status === 'busy'`, `busySince` set, and `estimatedDurationMinutes` = 45
- WHEN the bottom sheet opens
- THEN the countdown box shows "Ocupado" label, the connector type, and a live MM:SS timer counting down from 45:00

#### Scenario: Expired timer shows available

- GIVEN a charger whose estimated end time has passed
- WHEN the bottom sheet is displayed
- THEN the countdown box shows "Disponible" and `isExpired` is true

#### Scenario: Connector type display

- GIVEN any charger in the detail sheet
- WHEN rendered
- THEN the connector type label (e.g., "Type 2", "CCS") SHALL be visible in the specs row

### Requirement: Duration Picker on Status Toggle

The profile "Mis cargadores" screen SHALL present a duration picker when the host toggles a charger to "busy".

#### Scenario: Host toggles to busy

- GIVEN a host with an "available" charger on the profile screen
- WHEN the host taps the status toggle to set it to "busy"
- THEN a duration picker appears with options: 30 min, 1h, 1.5h, 2h, 3h

#### Scenario: Host confirms duration

- GIVEN the duration picker is visible with "1h" selected
- WHEN the host confirms
- THEN `updateChargerRpc` is called with `p_status: 'busy'`, `p_busy_since: now()`, `p_estimated_duration_minutes: 60`

#### Scenario: Host toggles back to available

- GIVEN a charger is currently "busy" with an active countdown
- WHEN the host toggles status to "available"
- THEN `updateChargerRpc` is called with `p_status: 'available'`, `p_busy_since: null`, `p_estimated_duration_minutes: null`

### Requirement: Auto-Expiration

The system SHALL treat a charger as "available" when the estimated end time has passed, without requiring a DB write.

#### Scenario: Client-side expiration

- GIVEN a charger with `busySince` + `estimatedDurationMinutes` that expired 5 minutes ago
- WHEN a client fetches chargers
- THEN the charger SHALL render as "Disponible" (available) in the UI

#### Scenario: Drift correction on focus

- GIVEN the app was backgrounded for 2 minutes
- WHEN the app returns to foreground
- THEN TanStack Query `refetchOnWindowFocus` triggers a refetch, reconciling any drift between local timer and server time

## Edge Cases

| Case | Behavior |
|------|----------|
| Host closes app while timer runs | Timer stops locally. On next open, refetch corrects. No DB write needed. |
| Timer expires while sheet is closed | Next fetch treats charger as expired. UI shows "Disponible". |
| Multiple rapid status toggles | Each toggle writes `busy_since` = now. Previous countdown is discarded. |
| `busy_since` in DB but duration is NULL | Treated as "available" (defensive — shouldn't happen after migration). |
| Clock skew between DB and client | `refetchOnWindowFocus` corrects. Worst case: ±1s visual drift, self-correcting. |
