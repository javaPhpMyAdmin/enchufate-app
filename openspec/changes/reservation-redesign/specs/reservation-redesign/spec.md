# Reservation Redesign Specification

## Purpose

Replace auto-approve time-slot booking with request + owner approval. Drivers request; hosts approve/reject; scheduling via chat.

## Requirements

### Requirement: Reservation Request Creation

The system SHALL allow drivers to request any charger (available/busy/reserved) via the "Reservar" button. On confirm, creates a reservation with status `pending`, nullable `start_time`/`end_time`. No overlap check at request time.

#### Scenario: Happy path — request created

- GIVEN a driver views a charger detail sheet (any status)
- WHEN driver taps "Reservar" and confirms
- THEN reservation created with status `pending`, `start_time=null`, `end_time=null`
- AND message sent to owner in existing or new conversation
- AND owner receives push notification; charger status UNCHANGED

#### Scenario: No conversation exists

- GIVEN no conversation between driver and owner
- WHEN driver creates a request, THEN new conversation created and message sent

#### Scenario: Conversation already exists

- GIVEN an existing conversation, WHEN driver creates a request, THEN message sent in existing conversation

#### Scenario: Push fails

- GIVEN push service unavailable, WHEN request is created → reservation + message succeed; charger UNCHANGED

### Requirement: Host Approval Flow

The system SHALL allow hosts to view and approve/reject pending requests. Only the charger owner may act. Approval performs `SELECT FOR UPDATE` overlap check.

#### Scenario: Host approves

- GIVEN host views a pending request, WHEN approve tapped
- THEN status → `confirmed`; overlap check on confirmed reservations for charger
- AND if no overlap, charger → `reserved`; driver gets push + chat

#### Scenario: Overlap on approve

- GIVEN two overlapping pending requests for same charger, WHEN host approves first then second
- THEN second rejected with error; driver notified via chat

#### Scenario: Host rejects

- GIVEN host views a pending request, WHEN reject tapped
- THEN status → `cancelled`; driver gets push + chat; charger UNCHANGED

#### Scenario: Non-owner attempts action

- GIVEN user does not own charger, WHEN they approve/reject → operation denied

#### Scenario: Multiple pending requests

- GIVEN multiple pending requests for same charger, WHEN host approves one
- THEN that reservation → `confirmed`, charger → `reserved`; others remain pending

### Requirement: Automatic Messages

The system SHALL send messages on request, approval, rejection. Both parties can chat after approval.

#### Scenario: Request message

- GIVEN driver creates request → message: "Hola, me gustaria reservar tu cargador [title]"

#### Scenario: Approval message

- GIVEN host approves → message: "Listo! Tu reserva fue confirmada. Chateamos para coordinar."

#### Scenario: Rejection message

- GIVEN host rejects → message: "Lo siento, no puedo aceptar la reserva en este momento."

#### Scenario: Continued chat

- GIVEN confirmed reservation, WHEN either party messages → both continue in same conversation

### Requirement: Status Transitions

The system SHALL enforce: `pending`→`confirmed`, `pending`→`cancelled`, `confirmed`→`cancelled`. Charger status SHALL NOT change on `pending`.

#### Scenario: pending → confirmed

- GIVEN pending reservation, WHEN approved → `confirmed`; `start_time`/`end_time` remain null

#### Scenario: pending → cancelled

- GIVEN pending reservation, WHEN rejected or driver cancels → `cancelled`; charger UNCHANGED

#### Scenario: confirmed → cancelled

- GIVEN confirmed reservation, WHEN driver cancels → `cancelled`; if no other confirmed reservations for charger → `available`

### Requirement: Push Notifications

The system SHALL send push for request/approval/rejection. Chat is primary; push is supplementary and non-blocking.

#### Scenario: Push on request → owner gets "Alguien quiere reservar tu cargador [title]"
#### Scenario: Push on approval → driver gets "Tu reserva fue confirmada"
#### Scenario: Push on rejection → driver gets "Tu reserva no fue aceptada"
#### Scenario: Push failure → event completes; message delivered via chat
