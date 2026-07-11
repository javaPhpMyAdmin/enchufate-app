# Push Notifications Specification

## Purpose

Hybrid push notification system combining server-side push (Edge Functions via Expo Push API) for message and review events with client-side local notifications for countdown expiry.

---

## Requirements

### Requirement: Token Registration

The system SHALL register an Expo push token on sign-in and persist it to the user's `profiles` row.

#### Scenario: First sign-in grants permission and stores token

- GIVEN user has never granted notification permission
- WHEN user signs in successfully
- THEN permission prompt is displayed
- AND on grant, Expo push token is obtained via `Notifications.getExpoPushTokenAsync()`
- AND token is saved to `profiles.push_token`

#### Scenario: Subsequent sign-in re-registers token

- GIVEN user has previously registered a token
- WHEN user signs in again
- THEN a fresh token is obtained and upserted to `profiles.push_token`
- AND the previous token value is overwritten

#### Scenario: User denies notification permission

- GIVEN user is signing in
- WHEN permission prompt is denied
- THEN `push_token` is set to NULL in `profiles`
- AND no error is thrown
- AND the app functions normally without notifications

#### Scenario: Token obtained before sign-in completes

- GIVEN Expo token resolution is async
- WHEN token fetch fails or times out (3s)
- THEN token registration is retried on next sign-in
- AND sign-in is not blocked

### Requirement: Server-Side Push — Messages

The system SHALL deliver a push notification to the message recipient when a new row is inserted in `messages`.

#### Scenario: Recipient receives push on new message

- GIVEN user A sends a message to user B
- WHEN the `messages` INSERT webhook fires
- THEN an Edge Function is invoked with the message payload
- AND a push notification is sent to user B's Expo push token
- AND the notification body contains a preview of the message

#### Scenario: Recipient has no push token

- GIVEN user B has `push_token = NULL`
- WHEN a message is sent to user B
- THEN the Edge Function completes without error
- AND no push is sent

#### Scenario: Recipient is the sender

- GIVEN user A sends a message to themselves (self-message)
- WHEN the webhook fires
- THEN no push notification is sent to user A

### Requirement: Server-Side Push — Reviews

The system SHALL deliver a push notification to the reviewed user when a new row is inserted in `reviews`.

#### Scenario: Reviewed user receives push

- GIVEN user A writes a review for user B
- WHEN the `reviews` INSERT webhook fires
- THEN an Edge Function is invoked with the review payload
- AND a push notification is sent to user B's Expo push token
- AND the notification body includes the reviewer name and rating

#### Scenario: Reviewed user has no push token

- GIVEN user B has `push_token = NULL`
- WHEN a review targets user B
- THEN the Edge Function completes without error
- AND no push is sent

### Requirement: Countdown Expiry Notification

The system SHALL display a local notification when the countdown timer expires, indicating the charger is available.

#### Scenario: Local notification on timer expiry

- GIVEN user is tracking a countdown timer for a charger
- WHEN the timer reaches zero
- THEN a local notification is displayed
- AND the notification body reads "charger is available"
- AND the notification fires even if the app is backgrounded

#### Scenario: Timer expiry with app in foreground

- GIVEN the app is in the foreground
- WHEN the countdown timer reaches zero
- THEN the local notification is still triggered
- AND it is displayed as a banner/alert per platform defaults

### Requirement: Dev Build Migration

The system SHALL function on Expo development builds (`npx expo run:ios` / `npx expo run:android`), not Expo Go.

#### Scenario: App builds successfully as dev build

- GIVEN `expo-notifications` plugin is configured in `app.json`
- WHEN developer runs `npx expo run:ios` or `npx expo run:android`
- THEN the app compiles and launches on device/simulator
- AND push notification registration works

### Requirement: Data Model

The system SHALL store push tokens in the existing `profiles` table.

#### Schema change

- `profiles` table SHALL have a nullable `text` column `push_token`
- `push_token` SHALL be unique (one device per user at a time)
- `push_token` SHALL be NULLABLE (user may deny permission)

### Requirement: Edge Function API Contract

Each Edge Function SHALL accept a POST with a JSON body and respond with a status.

#### send-message-push

```json
// Request
POST /send-message-push
{
  "recipient_id": "uuid",
  "sender_name": "string",
  "body_preview": "string (first 100 chars)"
}

// Response 200
{ "ok": true }

// Response 400
{ "error": "missing required fields" }
```

#### send-review-push

```json
// Request
POST /send-review-push
{
  "reviewed_user_id": "uuid",
  "reviewer_name": "string",
  "rating": "number (1-5)"
}

// Response 200
{ "ok": true }
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Token rotated on reinstall | Re-register on every sign-in overwrites old token |
| Permission denied | `push_token = NULL`, app works without notifications |
| App killed, message arrives | Webhook fires server-side — push still delivered |
| Network offline | Expo Push API queues and retries; message not lost |
| Duplicate webhook fire | Edge Function is idempotent (Expo deduplicates by token) |
| Multiple devices | Last sign-in wins (single `push_token` per user) |
| Edge Function cold start | ~200ms acceptable latency for push delivery |

---

## Platform Differences

| Behavior | iOS | Android |
|----------|-----|---------|
| Permission prompt | One-time system prompt | One-time system prompt |
| Notification in foreground | Banner (default) | Toast/banner (default) |
| Notification when killed | System tray | System tray |
| Expo project ID required | Yes (`extra.eas.projectId`) | Yes |
| Dev build required | Yes (cannot use Expo Go) | Yes |
