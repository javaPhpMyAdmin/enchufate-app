# Proposal: Push Notifications

## Intent

Enchufate has zero push notification support. Users cannot be notified when they receive a new message, get a review, or when a charger becomes available after a countdown. This creates missed connections and poor engagement — users must keep the app open to know anything happened.

## Scope

### In Scope

- **Token Registration**: Install `expo-notifications`, request permissions, save `push_token` to `profiles` table, re-register on every sign-in (handles token rotation)
- **Server-side Push (Messages)**: Supabase Edge Function triggered by DB webhook on `messages` INSERT → sends push to recipient via Expo Push API
- **Server-side Push (Reviews)**: Supabase Edge Function triggered by DB webhook on `reviews` INSERT → sends push to target user
- **Charger Available**: Local notification when `useCountdownTimer` expires — "charger is available"
- **Dev Build Migration**: Switch from Expo Go to `npx expo run:ios` / `npx expo run:android` (required for push to work)

### Out of Scope

- Interactive notifications (reply, mark read) — v2
- Badge count management — v2
- Notification preferences/settings — v2
- Deep-linking to specific screens on tap — v2
- Expo EAS Build setup (using local dev builds only)

## Capabilities

### New Capabilities

- `push-notifications`: Token registration, Expo Push API integration, permission handling, notification listeners, local notifications

### Modified Capabilities

None — no existing spec-level capabilities affected.

## Approach

**Hybrid client/server architecture:**

| Trigger | Mechanism | Why |
|---------|-----------|-----|
| New message | DB webhook → Edge Function → Expo Push API | Must work when sender's app is closed |
| New review | DB webhook → Edge Function → Expo Push API | Must work when author's app is closed |
| Countdown expires | Client-side `useCountdownTimer` → local notification | Already computed client-side, no server needed |

**Key files:**

- `src/lib/notifications.ts` — NEW: token registration, listener setup
- `supabase/functions/send-message-push/` — NEW: Edge Function for message pushes
- `supabase/functions/send-review-push/` — NEW: Edge Function for review pushes
- `src/features/auth/AuthProvider.tsx` — Modified: register token after sign-in
- `src/hooks/useCountdownTimer.ts` — Modified: trigger local notification on expiry
- `app.json` — Modified: add `expo-notifications` plugin, project ID
- `supabase/migrations/` — New migration for `push_token` column on `profiles`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/notifications.ts` | New | Token registration and listener module |
| `supabase/functions/` | New | Edge Functions directory (doesn't exist yet) |
| `supabase/migrations/` | New | `push_token` column on `profiles` |
| `src/features/auth/AuthProvider.tsx` | Modified | Add token registration after sign-in |
| `src/hooks/useCountdownTimer.ts` | Modified | Local notification on expiry |
| `app.json` | Modified | Plugin + project ID for Expo Push |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dev build workflow changes dev experience | High | Document new dev loop, test early |
| `supabase/functions/` doesn't exist yet | High | Initialize Supabase CLI, link project |
| Push tokens rotate on reinstall/update | Medium | Re-register on every sign-in |
| Edge Function cold starts (~200ms) | Low | Acceptable latency for push |
| Expo Push API rate limits | Low | 100/sec is sufficient for v1 |

## Rollback Plan

1. Revert `app.json` plugin changes
2. Remove `push_token` column via rollback migration
3. Delete `supabase/functions/` directory
4. Revert `AuthProvider.tsx` and `useCountdownTimer.ts` changes
5. Remove `src/lib/notifications.ts`
6. Return to Expo Go workflow

## Dependencies

- `expo-notifications` package (included with Expo 54)
- Expo project ID (`extra.eas.projectId` in `app.json`)
- Supabase CLI initialized and linked to project

## Success Criteria

- [ ] Push notification permission prompt appears on first sign-in
- [ ] `push_token` is saved to `profiles` after permission granted
- [ ] Token re-registers on every subsequent sign-in
- [ ] Sending a message triggers push notification to recipient (even if sender's app is closed)
- [ ] Writing a review triggers push notification to target user
- [ ] Countdown expiry shows local notification "charger is available"
- [ ] App builds and runs via `npx expo run:ios` / `npx expo run:android`
- [ ] Push notifications work on both iOS and Android dev builds
