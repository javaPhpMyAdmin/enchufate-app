# Design: Bugfix Session — Unread Badge, Bottom Sheet, Chat Crashes

## Technical Approach

Six surgical fixes across database RPCs, client-side state management, and bottom sheet gesture handling. No architectural changes — each fix targets a specific root cause with minimal blast radius.

## Fix 1: Unread Badge Persistence

### Root Cause
The `mark_conversation_as_read` RPC in `supabase/migrations/20260713010000_fix_critical_db_performance.sql` used `sql_rowcount` which doesn't exist in PostgreSQL. The RPC threw `column "sql_rowcount" does not exist`, so the read was never persisted.

### Fix
Replace `sql_rowcount` with `GET DIAGNOSTICS affected = row_count` (standard PostgreSQL).

### Client-Side
- `markAsRead` in `messageStore.ts` now returns `boolean` (success/failure)
- Optimistic cache clear: immediately sets `unreadCountByUser[currentUserId] = 0`
- On failure: clears ref + invalidates queries (but does NOT clear ref to avoid infinite loop — see Fix 3)
- `ConversationListItem.tsx` badge reads `conversation.unreadCountByUser[currentUserId] ?? 0`

### Files
- `supabase/migrations/20260713010000_fix_critical_db_performance.sql` (RPC fix)
- `src/data/messageStore.ts` (markAsRead return type, optimistic cache)
- `src/components/messages/ConversationListItem.tsx` (badge reads per-user count)

## Fix 2: Bottom Sheet from Profile (Stale Closure)

### Root Cause
`handleOpenDetail` in `map.tsx` closed over `allChargers` which was empty on first render. When the `useEffect` at line 57 tried to use it, the charger wasn't found.

### Fix
The `useEffect` no longer calls `handleOpenDetail`. Instead it sets `selectedId` and bumps `selectedTick`. A separate `useEffect` (line ~172) watches `selectedCharger`/`selectedOwner`/`selectedTick` and calls `detailSheetRef.current?.show()` when data is available.

### Files
- `app/(tabs)/map.tsx` (separated state-set from sheet-open)

## Fix 3: Chat Crash on Type (markAsRead Infinite Loop + Unhandled Rejection)

### Root Cause (Infinite Loop)
On RPC failure, `markAsRead` cleared the ref and invalidated queries. This changed the `conversation` object reference → the `useEffect` in `chat.tsx` re-fired → called `markAsRead` again → infinite loop.

### Root Cause (Unhandled Rejection)
`messageStore.addMessage(...)` returned a Promise. The caller used `void messageStore.addMessage(...)` without `.catch()`, causing an unhandled promise rejection crash.

### Fix
- `markAsRead`: on failure, do NOT clear ref, do NOT invalidate queries. Only clear/invalidate on success.
- `addMessage`: wrap with `.catch()` in both `chat.tsx` and `[id].tsx`.

### Files
- `src/data/messageStore.ts` (markAsRead failure path)
- `app/messages/chat.tsx` (addMessage .catch())
- `app/messages/[id].tsx` (addMessage .catch())

## Fix 4: Bottom Sheet Snap Points for Own Charger

### Root Cause
The bottom sheet opened at 60% height regardless of context. From profile, this obscured the map marker animation that the user navigated to see.

### Fix
- `SNAP_POINTS` changed from `['60%', '78%', '92%']` to `['38%', '70%', '92%']`
- Profile-originated opens (`selectChargerId` present) use `snapIndex=0` (38%)
- Map taps use `snapIndex=1` (70%)

### Files
- `src/components/sheets/ChargerDetailSheet.tsx` (snap points)
- `app/(tabs)/map.tsx` (snapIndex selection)

## Fix 5: Sheet Re-Opens from Profile (Same Charger)

### Root Cause
`useEffect(() => {...}, [selectChargerId])` only fires when `selectChargerId` changes. Tapping the same charger from profile produces the same param value → effect doesn't re-fire → sheet stays closed.

### Fix
Replace `useEffect` with `useFocusEffect` from `@react-navigation/native`. Fires every time the map tab gains focus, regardless of whether `selectChargerId` changed.

### Files
- `app/(tabs)/map.tsx` (useFocusEffect)

## Fix 6: Photo Gallery Scroll

### Root Cause
`BottomSheetView` (gorhom) is a non-scrollable container. A regular RN `ScrollView` inside it has gesture conflicts with gorhom's gesture system — the parent captures touch events before the child can scroll.

### Fix
- Outer wrapper: `BottomSheetView` → `BottomSheetScrollView` (vertical scroll of entire content)
- Horizontal gallery: `ScrollView` from `react-native` → `ScrollView` from `react-native-gesture-handler` (participates in same gesture system as gorhom)
- Added `nestedScrollEnabled` on horizontal ScrollView

### Files
- `src/components/sheets/ChargerDetailSheet.tsx` (BottomSheetScrollView + RNGH ScrollView)
