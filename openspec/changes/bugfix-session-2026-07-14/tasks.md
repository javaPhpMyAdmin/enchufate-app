# Tasks: Bugfix Session — Unread Badge, Bottom Sheet, Chat Crashes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120 across 6 files |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (all fixes shipped together) |
| Delivery strategy | N/A (already merged) |

## Status: COMPLETED

All tasks shipped across 6 commits (`c8e4045` → `1cec3db`).

## Task Breakdown

### Phase 1: Unread Badge Persistence

- [x] 1.1 Replace `sql_rowcount` with `GET DIAGNOSTICS affected = row_count` in `mark_conversation_as_read` RPC (`supabase/migrations/20260713010000_fix_critical_db_performance.sql`)
- [x] 1.2 Update `markAsRead` in `messageStore.ts` to return `boolean` (success/failure)
- [x] 1.3 Add optimistic cache clear for sender's `unreadCountByUser` on success
- [x] 1.4 Add retry on failure path (re-invalidate queries)

**Acceptance criteria**: After reading a conversation, the badge count drops to 0 immediately and persists across app restarts.

### Phase 2: Bottom Sheet from Profile (Stale Closure)

- [x] 2.1 Remove `handleOpenDetail` call from `selectChargerId` effect in `map.tsx`
- [x] 2.2 Set `selectedId` + `selectedTick` directly; let separate effect open sheet

**Acceptance criteria**: Tapping a charger in profile → map navigates → sheet opens with correct charger data.

### Phase 3: Chat Crash on Type

- [x] 3.1 On `markAsRead` failure: do NOT clear ref, do NOT invalidate queries (prevents infinite loop)
- [x] 3.2 Wrap `addMessage` calls with `.catch()` in `chat.tsx` and `[id].tsx`

**Acceptance criteria**: Typing in chat does not crash. RPC failure logs warning but doesn't loop or crash.

### Phase 4: Bottom Sheet Snap Points

- [x] 4.1 Change `SNAP_POINTS` from `['60%', '78%', '92%']` to `['38%', '70%', '92%']`
- [x] 4.2 Pass `snapIndex=0` for profile-originated opens, `snapIndex=1` for map taps

**Acceptance criteria**: Own charger opens at 38% (small), map browsing opens at 70% (medium).

### Phase 5: Sheet Re-Opens from Profile

- [x] 5.1 Replace `useEffect` with `useFocusEffect` for `selectChargerId` handling
- [x] 5.2 Import `useFocusEffect` from `@react-navigation/native`

**Acceptance criteria**: Tapping the same charger from profile multiple times re-opens the sheet each time.

### Phase 6: Photo Gallery Scroll

- [x] 6.1 Change outer wrapper from `BottomSheetView` to `BottomSheetScrollView`
- [x] 6.2 Import `ScrollView` from `react-native-gesture-handler` instead of `react-native`
- [x] 6.3 Add `nestedScrollEnabled` to horizontal ScrollView

**Acceptance criteria**: Horizontal photo gallery scrolls smoothly inside the bottom sheet. Vertical content also scrolls.
