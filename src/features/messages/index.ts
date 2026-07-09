/**
 * Messages feature — public surface.
 *
 * Screens and components should import from this barrel so the
 * internal folder layout can evolve without breaking call sites.
 */
export {
  formatChatTimestamp,
  formatRelativeTime,
  formatUnreadBadge,
  getOtherParticipant,
  getReadReceipt,
  shouldShowTimestamp,
  sortByRecency,
} from './helpers';
export { messageDraftSchema, type MessageDraftInput } from './schemas';
export { useSimulatedTyping, type SimulatedTyping } from './useSimulatedTyping';
