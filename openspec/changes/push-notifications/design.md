# Design: Push Notifications

## Technical Approach

Hybrid push system: **server-side push** (Supabase Edge Functions → Expo Push API) for messages and reviews, plus **client-side local notifications** for countdown expiry. Two Edge Functions (`send-message-push`, `send-review-push`) are triggered by Supabase Database Webhooks on INSERT. The client registers an Expo push token on every sign-in and stores it in `profiles.push_token`. Countdown expiry uses `expo-notifications` scheduleLocalNotificationAsync since the timer is already computed client-side.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Webhook trigger mechanism | Database Webhooks (Dashboard) vs pg_net triggers | Webhooks: simpler config, no SQL required, managed by Supabase. pg_net: more control, SQL-native, but requires extension + manual HTTP setup | **Database Webhooks** — zero SQL, dashboard-configured, sufficient for v1 |
| Edge Function count | Two separate functions vs one multiplexed | Separate: cleaner SSRF, independent deploy, easier debugging. Multiplexed: fewer functions to manage | **Two separate** — one per event type, matches spec API contracts |
| Token storage location | `profiles.push_token` (new column) vs separate `push_tokens` table | Single column: simple, one device per user (v1 constraint), upsert on sign-in. Separate table: multi-device, but over-engineered for v1 | **`profiles.push_token`** — nullable text, unique constraint |
| Countdown notification | `scheduleNotificationAsync` at timer start vs polling in effect | Scheduled: OS handles delivery, works when app backgrounded. Polling: needs AppState awareness, unreliable in background | **Schedule at timer start, cancel on unmount** — OS-native reliability |
| Dev Build tooling | `npx expo run:ios/android` vs EAS Build | Local run: no cloud dependency, instant iteration, debug builds only. EAS: production builds, but out of scope per proposal | **Local `npx expo run:`** — per proposal scope |

## Data Flow

### Message Push

```
Client A sends message
  │
  ▼
supabase.from('messages').insert(...)
  │
  ▼  (Database Webhook — INSERT on messages)
Edge Function: send-message-push
  │
  ├─ 1. Read recipient_id from payload
  ├─ 2. SELECT push_token FROM profiles WHERE id = recipient_id
  ├─ 3. Skip if push_token IS NULL or author_id = recipient_id
  └─ 4. POST https://exp.host/--/api/v2/push/send
         { to: token, title: sender_name, body: body_preview }
```

### Review Push

```
Client A writes review
  │
  ▼
supabase.from('reviews').insert(...)
  │
  ▼  (Database Webhook — INSERT on reviews)
Edge Function: send-review-push
  │
  ├─ 1. Read reviewed_user_id from payload
  ├─ 2. SELECT push_token FROM profiles WHERE id = reviewed_user_id
  ├─ 3. Skip if push_token IS NULL
  └─ 4. POST https://exp.host/--/api/v2/push/send
         { to: token, title: "New review", body: "X rated you 5 stars" }
```

### Countdown Local Notification

```
useCountdownTimer receives busySince + duration
  │
  ▼
On mount: scheduleNotificationAsync({
  content: { title: "Enchufate", body: "Charger is available" },
  trigger: { type: 'date', date: estimatedEnd }
})
  │
  ▼
On unmount: cancelScheduledNotificationAsync(identifier)
  │
  ▼
OS delivers notification at estimatedEnd (even if app killed)
```

### Token Lifecycle

```
User signs in
  │
  ▼
AuthProvider.applySession() runs after onAuthStateChange
  │
  ▼
registerPushToken() — fire-and-forget (non-blocking)
  │
  ├─ 1. requestPermissionsAsync() — first time: system prompt. Subsequent: auto-grant
  ├─ 2. getExpoPushTokenAsync({ projectId }) — returns push token
  ├─ 3. supabase.from('profiles').update({ push_token: token }).eq('id', userId)
  └─ 4. On denial: update({ push_token: null }) — no error thrown
```

## Migration SQL

```sql
-- Add push_token to profiles (nullable, unique — one device per user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token text;

-- Unique constraint: last sign-in wins, old token becomes stale
CREATE UNIQUE INDEX IF NOT EXISTS profiles_push_token_unique
  ON public.profiles (push_token)
  WHERE push_token IS NOT NULL;
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/notifications.ts` | Create | `registerPushToken(userId)` — permission + token + DB upsert. `setupNotificationListeners()` — foreground handler. `scheduleCountdownNotification(id, date)` / `cancelCountdownNotification(id)`. |
| `supabase/functions/send-message-push/index.ts` | Create | Edge Function: receives webhook payload, looks up recipient push_token, calls Expo Push API. Returns `{ ok: true }`. |
| `supabase/functions/send-review-push/index.ts` | Create | Edge Function: receives webhook payload, looks up target user push_token, calls Expo Push API. Returns `{ ok: true }`. |
| `supabase/functions/_shared/expo-push.ts` | Create | Shared helper: `sendExpoPush(token, title, body)` — single Expo Push API call with error handling. |
| `supabase/functions/_shared/supabase-admin.ts` | Create | Shared helper: creates Supabase client with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars for server-side DB reads. |
| `src/features/auth/AuthProvider.tsx` | Modify | Call `registerPushToken(user.id)` after `applySession` succeeds (fire-and-forget, non-blocking). |
| `src/hooks/useCountdownTimer.ts` | Modify | On mount when `estimatedEnd` is computed, schedule local notification. On unmount, cancel it. |
| `app.json` | Modify | Add `expo-notifications` plugin + `extra.eas.projectId`. |
| `supabase/migrations/20260714000000_add_push_token_to_profiles.sql` | Create | Migration for `push_token` column + unique index. |
| `.env.example` | Modify | Add `EXPO_PUBLIC_EAS_PROJECT_ID` placeholder. |

## Edge Function Code Structure

### `send-message-push/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/expo-push.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { recipient_id, sender_name, body_preview } = await req.json();

  if (!recipient_id || !sender_name) {
    return new Response(
      JSON.stringify({ error: "missing required fields" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", recipient_id)
    .single();

  if (!data?.push_token) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await sendExpoPush(data.push_token, sender_name, body_preview);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### `send-review-push/index.ts`

Same structure — looks up `push_token` for `reviewed_user_id`, formats body as `"{reviewer_name} rated you {rating} ★"`.

### `_shared/expo-push.ts`

```typescript
export async function sendExpoPush(token: string, title: string, body: string) {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default" }),
  });
}
```

## Dev Build Setup Steps

1. Run `npx expo install expo-notifications` (adds to dependencies)
2. Add `expo-notifications` to `app.json` plugins array:
   ```json
   ["expo-notifications", { "icon": "./assets/icon.png", "color": "#FF6600" }]
   ```
3. Add `extra.eas.projectId` to `app.json` — generate via `npx eas init` or manually set
4. Run `npx expo prebuild --clean` to regenerate native projects
5. Build: `npx expo run:ios` / `npx expo run:android`
6. Remove Expo Go from workflow — use dev client only

**iOS-specific**: Add `NSUserNotificationsUsageDescription` in `ios/Enchufate/Info.plist` (handled by plugin). Push entitlements are auto-configured by the plugin.

**Android-specific**: Notification channel is auto-created by `expo-notifications`. No manual `AndroidManifest.xml` changes needed.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `registerPushToken` logic — permission flow, DB upsert | Mock `expo-notifications` and `supabase.from()` |
| Unit | `sendExpoPush` helper — payload shape | Mock fetch |
| Integration | Edge Function end-to-end — webhook → DB read → Expo Push API | Deploy to Supabase, trigger via SQL INSERT, verify push received |
| Integration | Token lifecycle — sign-in stores token, re-sign-in overwrites | Dev build + manual sign-in flow |
| E2E | Message push — send message from device A, verify notification on device B | Two dev builds, manual test |
| E2E | Countdown notification — set charger busy, wait for expiry | Dev build, manual observation |

## Open Questions

- [ ] Expo project ID — needs `npx eas init` or manual creation at expo.dev
- [ ] Supabase CLI — needs `supabase init` + `supabase link` before deploying Edge Functions
- [ ] Android notification channel name — default "Enchufate" or localized?
