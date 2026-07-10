# Enchufate

Peer-to-peer EV charger marketplace. Discover chargers nearby, book a slot, and pay for what you use.

This repository contains the **mobile app** (React Native + Expo 54).

## Status

- **Phase 0 Lite** — Foundations + design system
- **Phase 2** — Map & Charger Discovery (mock data, no backend yet)

No backend, no auth, no real payments in this change. Everything is mock data so we can iterate on UX before wiring Supabase.

## Stack

- Expo 54 + Expo Router (typed routes, file-based)
- React Native 0.76 + React 19
- TypeScript (strict)
- TanStack Query
- react-native-maps (Google on Android, Apple on iOS)
- @gorhom/bottom-sheet
- react-native-reanimated 3
- lucide-react-native icons

## Quickstart

```bash
pnpm install
pnpm start
```

Then press `i` for iOS, `a` for Android, or `w` for web.

### Google Maps on Android

`react-native-maps` uses Google Maps on Android. You need a Google Maps API key with the **Maps SDK for Android** enabled. Put it in `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

On iOS no extra key is required for the Apple Maps default provider.

### Permissions

The app requests foreground location permission on the Map tab. No background tracking.

## Project layout

```
app/                       # Expo Router file-based routes
  _layout.tsx              # Root: QueryClient + ThemeProvider
  (tabs)/                  # Tab bar
src/
  components/
    ui/                    # Primitives (Button, Card, Avatar, ...)
    map/                   # ChargerMap, ChargerMarker, MapControls
    sheets/                # ChargerDetailSheet, FiltersSheet
    charger/               # ChargerCard
  data/
    types.ts
    mocks/                 # chargers, users, seed
  domain/                  # Pure helpers (filters, sort)
  lib/                     # format, distance
  theme/                   # design tokens + ThemeProvider
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm start` | Start the Expo dev server |
| `pnpm android` | Start and open Android |
| `pnpm ios` | Start and open iOS |
| `pnpm web` | Start the web bundle |
| `pnpm lint` | Run ESLint (expo config) |
| `pnpm typecheck` | Run `tsc --noEmit` |

## What's next

Phase 1 (Supabase), Phase 3 (auth + profile), Phase 4 (messaging), Phase 5 (bookings), Phase 6 (payments). See `app_idea.md` for the full plan.
