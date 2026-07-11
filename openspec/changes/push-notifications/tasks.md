# Tasks: Push Notifications

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 300–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Database & Dev Build Foundation

- [ ] 1.1 Create migration `supabase/migrations/20260714000000_add_push_token_to_profiles.sql` — add nullable `push_token` text column + partial unique index. (~15 lines)
- [ ] 1.2 Install `expo-notifications` via `npx expo install expo-notifications`. Add plugin + `extra.eas.projectId` to `app.json`. Add `EXPO_PUBLIC_EAS_PROJECT_ID` to `.env.example`. (~10 lines modified)
- [ ] 1.3 Run `npx expo prebuild --clean` and verify `npx expo run:ios` compiles. Manual check: app launches on simulator.

## Phase 2: Server-Side Edge Functions

- [ ] 2.1 Create `supabase/functions/_shared/supabase-admin.ts` — Supabase client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. (~20 lines)
- [ ] 2.2 Create `supabase/functions/_shared/expo-push.ts` — `sendExpoPush(token, title, body)` helper with fetch to Expo Push API. (~15 lines)
- [ ] 2.3 Create `supabase/functions/send-message-push/index.ts` — POST handler: validate `recipient_id` + `sender_name`, look up `push_token`, skip if null or self-send, call `sendExpoPush`. (~50 lines)
- [ ] 2.4 Create `supabase/functions/send-review-push/index.ts` — POST handler: validate `reviewed_user_id` + `reviewer_name` + `rating`, look up `push_token`, skip if null, format body with stars, call `sendExpoPush`. (~40 lines)
- [ ] 2.5 Configure Database Webhooks via Supabase Dashboard: INSERT on `messages` → `send-message-push`, INSERT on `reviews` → `send-review-push`. (Dashboard config, no code)

## Phase 3: Client Token Lifecycle & Local Notifications

- [ ] 3.1 Create `src/lib/notifications.ts` — export `registerPushToken(userId)`: request permissions, get Expo token, upsert to `profiles.push_token`, set NULL on denial. Export `setupNotificationListeners()`, `scheduleCountdownNotification(id, date)`, `cancelCountdownNotification(id)`. (~80 lines)
- [ ] 3.2 Modify `src/features/auth/AuthProvider.tsx` — call `registerPushToken(user.id)` fire-and-forget after `applySession` succeeds. Import from `src/lib/notifications.ts`. (~15 lines changed)
- [ ] 3.3 Modify `src/hooks/useCountdownTimer.ts` — on mount when `estimatedEnd` is computed, call `scheduleCountdownNotification`. On unmount, call `cancelCountdownNotification`. (~20 lines changed)

## Phase 4: Integration & Manual Verification

- [ ] 4.1 Verify `pnpm tsc --noEmit` passes with no new errors.
- [ ] 4.2 Manual E2E: sign in on dev build → confirm permission prompt → verify `profiles.push_token` is populated in Supabase.
- [ ] 4.3 Manual E2E: send message from device A → verify push notification appears on device B (app backgrounded).
- [ ] 4.4 Manual E2E: write review for user B → verify push notification with star rating appears.
- [ ] 4.5 Manual E2E: start countdown timer → background app → verify local notification fires at expiry.

## Relevant Files

| File | Action |
|------|--------|
| `supabase/migrations/20260714000000_add_push_token_to_profiles.sql` | Create |
| `supabase/functions/_shared/supabase-admin.ts` | Create |
| `supabase/functions/_shared/expo-push.ts` | Create |
| `supabase/functions/send-message-push/index.ts` | Create |
| `supabase/functions/send-review-push/index.ts` | Create |
| `src/lib/notifications.ts` | Create |
| `src/features/auth/AuthProvider.tsx` | Modify |
| `src/hooks/useCountdownTimer.ts` | Modify |
| `app.json` | Modify |
| `.env.example` | Modify |
