# Reservations Specification

## Purpose

Time-slot booking system. Drivers reserve charger slots; hosts see reservations on their chargers. Double-booking prevented via `SELECT FOR UPDATE` RPC serialization. Auto-approves in v1 (no host approval).

## Data Model

`reservations` table: `id` (uuid PK), `driver_id` (uuid FK→profiles), `charger_id` (uuid FK→chargers), `start_time` (timestamptz), `end_time` (timestamptz), `status` (text: `confirmed` | `cancelled` | `completed`), `created_at` (timestamptz). `charger.status` CHECK constraint adds `'reserved'`. FK on `charger_id` uses `ON DELETE CASCADE`.

## Requirements

| # | Requirement | Strength |
|---|------------|----------|
| R1 | Create reservation via `create_reservation_rpc` (SECURITY DEFINER) with `SELECT FOR UPDATE` overlap serialization | SHALL |
| R2 | Cancel reservation via `cancel_reservation_rpc` — driver-only, restores charger to `available` if no other active reservations | SHALL |
| R3 | Fetch driver reservations via `get_driver_reservations_rpc` — own rows, joined with charger metadata, ordered by `start_time` desc | SHALL |
| R4 | Fetch host reservations via `get_host_reservations_rpc` — rows on host's chargers, joined with driver profile, ordered by `start_time` desc | SHALL |
| R5 | Charger status: `available → reserved` on create; `reserved → available` on cancel/complete (same transaction, checks other active reservations) | SHALL |
| R6 | Bookings tab: segmented control "Mis reservas" / "Reservas en mis cargadores" (host only); separate TanStack Query keys | SHALL |
| R7 | ReservationItem: status badge, datetime, charger title/address, contextual actions (cancel if confirmed + not past) | SHALL |
| R8 | Time-slot picker: validates slot within charger schedule and no overlap before confirming | SHALL |
| R9 | RLS: drivers SELECT own rows; hosts SELECT on own chargers; all writes via SECURITY DEFINER RPCs only | SHALL |

## Scenarios

### R1 — Create Reservation

- GIVEN an available charger, WHEN driver calls `create_reservation_rpc`, THEN reservation created as `confirmed`, charger → `reserved`
- GIVEN confirmed reservation 10:00–12:00, WHEN driver creates 11:00–13:00, THEN error: time slot conflict
- GIVEN charger owned by requesting user, WHEN they call create, THEN error: cannot reserve own charger
- GIVEN start_time < now(), WHEN driver submits, THEN error: cannot reserve in the past
- GIVEN end_time ≤ start_time, WHEN driver submits, THEN error: invalid time range

### R2 — Cancel Reservation

- GIVEN driver's confirmed reservation, WHEN they call `cancel_reservation_rpc`, THEN status → `cancelled`, charger → `available`
- GIVEN another user's reservation, WHEN different user calls cancel, THEN error: permission denied

### R3 — Fetch Driver Reservations

- GIVEN driver with 3 reservations, WHEN they call `get_driver_reservations_rpc`, THEN 3 rows with charger metadata, ordered `start_time` desc
- GIVEN driver with zero reservations, WHEN they call RPC, THEN empty array

### R4 — Fetch Host Reservations

- GIVEN host with 2 chargers with active reservations, WHEN they call `get_host_reservations_rpc`, THEN all rows with driver profile, ordered `start_time` desc
- GIVEN user with no chargers, WHEN they call RPC, THEN empty array

### R5 — Charger Status Sync

- GIVEN charger `available`, WHEN reservation created, THEN → `reserved` in same transaction
- GIVEN charger `reserved` with 1 active reservation, WHEN that reservation cancelled, THEN → `available`
- GIVEN charger `reserved` with 2 active reservations, WHEN 1 cancelled, THEN stays `reserved`

### R6 — Dual-View Bookings Tab

- GIVEN non-host driver, WHEN they open Bookings tab, THEN only "Mis reservas" shown
- GIVEN host user, WHEN they open Bookings tab, THEN both tabs shown, each with correct filtered data

### R7 — Reservation Item Component

- GIVEN confirmed reservation not yet past, WHEN rendered, THEN "Cancelar" action visible
- GIVEN completed/past reservation, WHEN rendered, THEN no cancel action

### R8 — Time-Slot Picker

- GIVEN charger 08:00–20:00, WHEN driver picks 2h slot at 14:00, THEN accepted
- GIVEN charger 08:00–20:00, WHEN driver picks slot at 21:00, THEN error: charger closed

### R9 — RLS Policies

- GIVEN drivers A and B, WHEN A queries directly, THEN only A's rows returned
- WHEN host attempts direct INSERT/UPDATE/DELETE on reservations, THEN RLS denies (writes only via RPC)

## Edge Cases

| Case | Behavior |
|------|----------|
| Concurrent creation on same slot | `SELECT FOR UPDATE` serializes; second request blocks then detects overlap |
| Host changes schedule after reservation | Reservation valid; schedule enforced at creation only |
| Charger deleted with active reservations | FK cascade deletes reservations |
| Network failure mid-RPC | Error returned; no partial state (transactional) |
