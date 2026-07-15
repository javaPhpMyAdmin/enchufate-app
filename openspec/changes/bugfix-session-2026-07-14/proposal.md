# Proposal: Bugfix Session — Unread Badge, Bottom Sheet, Chat Crashes

## Intent

Six interconnected bugs surfaced during testing: (1) unread badge count never cleared after reading conversations, (2) bottom sheet wouldn't open from profile navigation, (3) chat screen crashed on text input, (4) bottom sheet too large from profile obscuring map markers, (5) bottom sheet only opened once from profile, (6) photo gallery inside bottom sheet had no horizontal scroll.

## Scope

### In Scope
- **Unread badge persistence**: `mark_conversation_as_read` RPC failed with `sql_rowcount` column error; client-side badge never cleared on success
- **Bottom sheet from profile**: Stale closure in `handleOpenDetail` closed over empty `allChargers` on first render
- **Chat crash on type**: `markAsRead` infinite loop on RPC failure + unhandled promise rejection in `addMessage`
- **Bottom sheet snap points**: Reduced from 60/78/92% to 38/70/92%; profile-originated opens use 38%
- **Sheet re-open from profile**: `useEffect` only fired on `selectChargerId` change; same charger re-tap didn't re-trigger
- **Photo gallery scroll**: `BottomSheetView` didn't propagate scroll; horizontal `ScrollView` from `react-native` conflicted with gorhom gesture system

### Out of Scope
- New features, new screens, new API endpoints
- Styling overhaul of the bottom sheet
- Real-time unread count via Supabase Realtime

## Commits

| Hash | Description |
|------|-------------|
| `c8e4045` | fix: unread badge persists after reading conversation |
| `f03ad99` | fix: replace sql_rowcount with GET DIAGNOSTICS in mark_conversation_as_read |
| `504cad4` | fix: bottom sheet not opening from profile + chat crash on type |
| `41c297d` | fix: smaller bottom sheet when opening from profile |
| `2b226a0` | fix: sheet re-opens from profile + photo gallery scroll |
| `1cec3db` | fix: horizontal photo scroll inside BottomSheetScrollView |

## Capabilities

### New Capabilities
None — all fixes to existing capabilities.

### Modified Capabilities
- `messaging`: unread badge now persists correctly after reading
- `charger-detail-sheet`: snap points adjusted, re-opens from profile, photo scroll works
- `chat`: no longer crashes on text input when markAsRead RPC fails
