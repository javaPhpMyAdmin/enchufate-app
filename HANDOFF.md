# HANDOFF · enchufate-app

> Single source of truth to resume this project on another machine.
> The Engram memory on the original workstation has a richer log; this
> file deliberately duplicates only what's needed to keep going without
> that memory. Update it at the end of every working session.

---

## Stack at a glance

- **Mobile:** Expo SDK 54, React Native 0.81, TypeScript, expo-router 6, Reanimated 4, react-native-maps.
- **Package manager:** `pnpm@9.15.4` (pinned in `packageManager` field — use `corepack enable` if you don't have it).
- **Backend:** Supabase project `bzxqgifxutphbptcwpjr` (see **Supabase** section below).
- **Brand:** white + electric orange (`#FF6600`); Zap glyph green (`#10B981`); wordmark in orange with `fontWeight: 800`.
- **Geo scope:** Uruguay only. All chargers and default map region are centered on Montevideo.

## How to bootstrap on a fresh machine

```bash
# 1. Clone the repo
git clone <repo-url> enchufate-app
cd enchufate-app

# 2. Install pnpm if you don't have it
corepack enable
corepack prepare pnpm@9.15.4 --activate

# 3. Install deps
pnpm install

# 4. Recreate the .env (the file itself is gitignored).
#    Copy .env.example to .env and fill in:
#      EXPO_PUBLIC_SUPABASE_URL=<from Supabase dashboard, Settings > API>
#      EXPO_PUBLIC_SUPABASE_ANON_KEY=<same place, anon public>
cp .env.example .env
# ...edit .env with your values...

# 5. Start the dev server
pnpm start
```

Then in Expo Go on the phone: shake / cmd-D → Reload, or force-quit + reopen.

---

## What's done in this session

### Tooling & infrastructure

- **Migrated from npm to pnpm 9.15.4.** `packageManager` field pinned; `.npmrc` has `node-linker=hoisted` for Expo+RN compat. `pnpm-lock.yaml` committed, `package-lock.json` deleted.
- **Aligned Expo SDK 54 deps** with `npx expo install --fix` (was a pre-existing version mismatch: `expo-router` was 5.x, `react-native` was 0.76 — both wrong for SDK 54).
- **Reanimated 4 worklets split.** Reanimated 4 moved the babel plugin to `react-native-worklets/plugin`. `babel.config.js` updated, `react-native-worklets` added as direct dep.
- **messageStore infinite loop fix.** `useSyncExternalStore` requires a stable reference from `getSnapshot`. The old code returned a fresh `[conversations, messages]` array on every call → React kept re-rendering forever. Fixed with a module-level `snapshot` tuple that's only rebuilt inside the `setConversations` / `setMessages` setters.

### Brand & design

- **Palette** (in `src/theme/colors.ts`):
  - `primary: #FF6600` (electric orange), `primaryDark: #E55500`, `primaryLight: #FFD1B0`
  - `chargerAvailable: #10B981` (green — stays green so it doesn't compete with the brand orange)
  - `success/warning/danger/info` semantic colors unchanged
- **Enchufate wordmark:** orange, `fontWeight: 800`, `letterSpacing: 0.5`.
- **Zap glyph:** green (`theme.colors.success`), used in the home header.
- **Brand mark (`assets/icon.png`)** placed by the user. Used in:
  - Home tab header (replaces the old avatar — user didn't want the avatar)
  - `AuthHeader` component (covers login + register)
  - Welcome/splash screen (replaces the old Zap brand mark)
- **Hero card on home** uses `assets/home_card.png` (placed by the user) as a full-bleed image inside a 16-radius card. The previous Zap watermark + orange overlay are gone — it's just the photo.

### Home tab (`app/(tabs)/index.tsx`)

- Replaced the owner-dashboard ("Mis cargadores") with a marketing/discovery landing.
- Layout: Enchufate header → hero card (photo) → "Buscar un cargador" (white) → "Publicar mi cargador" (orange).
- Cards are responsive: `flex: 1.5` for the hero, `flex: 0.7` for each action card, with `minHeight` on the hero to prevent collapse on small devices.

### Profile tab (`app/(tabs)/profile.tsx`)

- The owner dashboard ("Mis cargadores" + charger list + edit/delete menu + publish-new button) was moved here from the home tab.
- The status toggle (available/busy) for the host lives here — each charger card in the list will get a Switch.

### Map (`app/(tabs)/map.tsx` + `src/components/map/ChargerMap.tsx`)

- **Default region moved to Montevideo** (`-34.9036, -56.158`, 0.08° delta).
- **Auto-zoom on location** — a new `useEffect` calls `mapRef.current?.animateTo(userLocation, 0)` (zoom 15) the moment `userLocation` is set, so the user sees a neighborhood view instead of the country-level initial region.
- **Charger marker (`ChargerMarkerImage.tsx`)** is a 56x56 circle with a 🔌 emoji (`PlugZap` would not render — see gotchas below). Unselected = white bg + orange border + orange icon. Selected = solid orange bg + white icon.

### Bottom sheet (`src/components/sheets/ChargerDetailSheet.tsx`)

- Restructured to match the brand reference: avatar + owner name (h2) + rating + status pill on top; POTENCIA | PRECIO in two columns; two full-width buttons: Contactar (white) and Cómo llegar (orange).
- **Initial snap point at 35%** (not 18%) so the user sees the full header + specs immediately on tap.
- Wired to the marker press via a new `useEffect` in `map.tsx` that calls `detailSheetRef.current?.show(charger, owner)` whenever `selectedCharger` + `selectedOwner` are set.

### Welcome → Splash (`app/(public)/welcome.tsx`)

- Removed the two CTAs ("Buscar cargador" / "Publicar mi cargador") and made it a pure splash.
- Animations: brand mark scales 1 → 1.7 (peak, 800ms ease-out) → 1.4 (rest, 500ms ease-in-out, larger than the original 1x); "Cargando" with cycling dots (0→1→2→3 every 450ms); progress bar 0→100% over 3.5s; fade-out + `router.replace('/(tabs)')` at 3.5s.
- Bug fix: `Button` had `textOnPrimary` (white) as its text color, but the welcome overrode the background to white — invisible text. Added a `textColor` prop to `Button` and passed `textColor={theme.colors.text}` to the "Buscar cargador" button.

### Mock data

- **20 chargers relocated from Buenos Aires to Uruguay** (`src/data/mocks/chargers.ts`): 10 in Montevideo (Pocitos, Centro, Malvín/Carrasco), 3 in Punta del Este, 3 in Colonia del Sacramento, 2 in Ciudad de la Costa, 1 in Piriápolis, 1 in Salto.
- **Charging model:** immediate sessions, not scheduled. Status is a manual host toggle between `available` and `busy` (the `reserved` state is gone). Host manages it from "Mis cargadores" in Profile.

---

## Supabase

### Project

- **URL:** `https://bzxqgifxutphbptcwpjr.supabase.co` (from Settings > API)
- **anon public key:** in `.env` (gitignored). Get it from Settings > API > Project API keys > `anon` `public`. **NEVER ship the `service_role` key — that bypasses RLS and belongs only on a server.**

### What's already run in Supabase

- The Fase 1 migration in `supabase/migrations/20260710000000_fase_1_mvp.sql` is ready to run in the Supabase SQL Editor (or via `supabase db push`).
- After running, enable **PostGIS** (Database > Extensions) and create a **Storage bucket** `charger-photos` (public read).
- For live status updates on the map, enable **Realtime replication** on the `chargers` table (Database > Replication).

### What's still pending (the TODO list for tomorrow)

In order of recommended execution — each step is small enough to verify on the device before moving on:

- [ ] **Wire auth.** Replace the mock `AuthProvider` (`src/features/auth/AuthProvider.tsx`) with `supabase.auth`. The `handle_new_user` DB trigger already creates the `profiles` row on signup, so the app just needs to:
  - `supabase.auth.signUp({ email, password, options: { data: { display_name, avatar_url } } })`
  - `supabase.auth.signInWithPassword({ email, password })`
  - `supabase.auth.signOut()`
  - Listen to `supabase.auth.onAuthStateChange((event, session) => ...)` to keep the React context in sync.
  - Deprecate `authStorage.ts` (no more AsyncStorage session — Supabase handles it).
- [ ] **Wire charger store.** Replace `src/data/chargerStore.ts` with queries against `supabase.from('chargers')`:
  - `select('*')` for the catalog.
  - Use the SQL helper `public.chargers_near(lat, lng, radius_meters)` for the map view.
  - `insert()` for publishing, `update()` for edits and the host's status toggle, `delete()` for remove.
  - The `useSyncExternalStore` shape stays (snapshots + listeners), but the source is Supabase, not the in-memory array.
- [ ] **Realtime for status changes.** Subscribe to `supabase.channel('chargers').on('postgres_changes', { event: 'UPDATE', table: 'chargers', filter: 'status=neq.available' }, ...)` (or similar) so the map updates live when a host toggles.
- [ ] **(Optional, Fase 2) Wire messages.** Same pattern: replace `messageStore` with `supabase.from('messages')` + `supabase.from('conversations')`. Add `supabase.channel('messages')` subscription for realtime chat.
- [ ] **(Optional, Fase 2) Storage for charger photos.** Set up the `charger-photos` bucket + a small upload helper in `src/lib/storage.ts` that returns the public URL for the `chargers.photos[]` array.
- [ ] **Onboarding:** remove the "Onboarding" screen from the welcome flow once auth is real, OR wire it to run only on first signup. Currently the welcome/splash always runs.

---

## Key design decisions (so we don't re-debate them)

- **Charging is immediate, not scheduled.** No `bookings` table. The host flips `status` and that's the entire "booking" flow. The trigger `handle_charger_status_change` auto-writes to `charger_sessions`.
- **Status is binary** (`available` ↔ `busy`). The `reserved` state is gone. If the host wants to take a charger offline, they mark it `busy`.
- **`charger_sessions` exists from day 1** with the trigger. No backfill problem.
- **No driver field in `charger_sessions`** for v1. If we ever need driver history, add `driver_id uuid REFERENCES profiles(id)` — the table already has the structure.
- **3 tables for Fase 1:** `profiles`, `chargers`, `charger_sessions`. Conversations / reviews / favorites / payments come later.
- **No `availableInMinutes` / `available_from` fields.** Status is binary; the host toggles when they finish.
- **Bolt-on the buttons, not a separate screen.** Status toggle goes in the "Mis cargadores" list in Profile (Switch on each card). Reuses existing context.
- **Emoji as marker icon.** `react-native-maps` <Marker> has known rendering issues with both `<Image>` and lucide SVG icons. The most reliable option is a plain `View` + `<Text>` with an emoji. We tried `🔌` — it works.

---

## Known gotchas (don't waste time on these again)

- **`pnpm start --clear` does NOT wipe AsyncStorage.** The charger data in the store is persisted under `enchufate.chargers`. To reset the mock data, uninstall and reinstall Expo Go (the cloud project is the source of truth once we wire it).
- **`<Image>` and lucide SVGs do not render inside `react-native-maps` <Marker>.** Use a plain `View` + `<Text emoji>` instead. Set `tracksViewChanges={true}` (not `false`) on the Marker so it re-renders when the async content finishes loading.
- **AsyncStorage `useSyncExternalStore` requires a stable reference from `getSnapshot`.** Don't return a fresh array literal on every call — keep a module-level tuple and only rebuild it inside setters.
- **`useSharedValue(1)` initializes scale to 1** — if an `<Animated.View>` wrapper inside a `<Marker>` has no explicit dimensions, it can collapse to 0 and disappear. Add explicit `width`/`height` to the wrapper, or put the transform on a bare `<Animated.Image>`.
- **`Button`'s `textOnPrimary` (white) is fixed per variant.** If you override the background (e.g. `style={{ backgroundColor: '#FFFFFF' }}`), the text becomes invisible. Use the new `textColor` prop to override.
- **Reanimated 4** moved the babel plugin to `react-native-worklets/plugin`. `babel.config.js` must use the new name. The package must be a direct dep (not just transitive).
- **Cosmeticos:** `@expo/metro-runtime` shows a peer-dep warning against itself in pnpm — ignore, it's a known Expo issue.

---

## Files of interest

| File | What it does |
|---|---|
| `app/(tabs)/index.tsx` | Home tab (marketing landing) |
| `app/(tabs)/map.tsx` | Map tab + auto-zoom wiring for the bottom sheet |
| `app/(tabs)/profile.tsx` | Profile tab + "Mis cargadores" section |
| `app/(public)/welcome.tsx` | Splash screen |
| `src/components/map/ChargerMap.tsx` | MapView with the default region + marker rendering |
| `src/components/map/ChargerMarkerImage.tsx` | The custom marker (View + 🔌 emoji) |
| `src/components/sheets/ChargerDetailSheet.tsx` | The bottom sheet |
| `src/components/ui/Button.tsx` | Has the new `textColor` prop |
| `src/data/mocks/chargers.ts` | 20 mock chargers in Uruguay (will be replaced by Supabase) |
| `src/data/chargerStore.ts` | In-memory charger store (will be replaced by Supabase) |
| `src/data/messageStore.ts` | In-memory message store (will be replaced by Supabase) |
| `src/features/auth/AuthProvider.tsx` | Mock auth (will be replaced by Supabase auth) |
| `src/theme/colors.ts` | Brand colors — orange primary, green for charger status |
| `supabase/migrations/20260710000000_fase_1_mvp.sql` | The Fase 1 schema (ready to run) |
| `src/lib/supabase.ts` | The Supabase client singleton (ready to use) |
| `.env` / `.env.example` | Local Supabase creds (gitignored) / template (committed) |
