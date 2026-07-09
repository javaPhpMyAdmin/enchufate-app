/**
 * Pure helpers for the messages feature.
 *
 * No React or React Native imports — safe to consume from the store,
 * components, and tests.
 */
import type { Conversation, Message, User } from '@/data/types';

/**
 * Find the other participant in a 1:1 conversation. Returns `null` if
 * `me` is not a participant or if the conversation has zero/two
 * participants that don't match `me`.
 */
export function getOtherParticipant(
  conversation: Pick<Conversation, 'participantIds'>,
  me: Pick<User, 'id'>,
): string | null {
  const other = conversation.participantIds.find((id) => id !== me.id);
  return other ?? null;
}

/**
 * Pretty relative time: "hace 2 min", "hace 3 h", "ayer", "15 mar".
 *
 * Used in the conversation list rows. We fall back to the raw ISO
 * string on parse failure so the UI never crashes.
 */
export function formatRelativeTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return 'recién';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffH < 24) return `hace ${diffH} h`;
    if (diffD === 1) return 'ayer';
    if (diffD < 7) {
      return date.toLocaleDateString('es-AR', { weekday: 'short' });
    }
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

/**
 * "HH:mm" — chat bubble timestamp. 24-hour, locale-independent so
 * the UI looks consistent across devices.
 */
export function formatChatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

/**
 * Smart bubble-grouping helper. We render the timestamp under the
 * first message of a "cluster" and skip it for the rest. A cluster
 * is a run of consecutive messages by the same author within 5
 * minutes of each other. The caller passes the full ordered list
 * and the index of the bubble it wants to render.
 */
export function shouldShowTimestamp(
  messages: ReadonlyArray<Message>,
  index: number,
): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];
  if (!current || !previous) return false;
  // Different author: always show the timestamp to delimit the groups.
  if (current.authorId !== previous.authorId) return true;
  const gap = new Date(current.createdAt).getTime()
    - new Date(previous.createdAt).getTime();
  return gap > 5 * 60 * 1000;
}

/**
 * Sort conversations by `lastMessageAt` desc. Stable for the
 * current store shape (string ISO timestamps sort lexicographically
 * the same as chronologically).
 */
export function sortByRecency(
  conversations: ReadonlyArray<Conversation>,
): Conversation[] {
  return [...conversations].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
}

/**
 * "9+" badge label. Counts above 9 collapse to keep the bubble
 * compact; matches WhatsApp / Messenger conventions.
 */
export function formatUnreadBadge(count: number): string {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return String(count);
}

/**
 * Read receipt status for an outgoing message. We treat a message as
 * "read" when every other participant has been added to `readBy`.
 * Otherwise it's "sent" (delivered, but not read by the recipient).
 *
 * Returns `null` for incoming messages — the UI only renders receipts
 * on outgoing bubbles.
 */
export function getReadReceipt(
  message: Message,
  conversation: Pick<Conversation, 'participantIds'>,
  currentUserId: string,
): 'sent' | 'read' | null {
  if (message.authorId !== currentUserId) return null;
  // The sender is always in readBy. We need the OTHER participant(s)
  // to also be in readBy for the receipt to be "read".
  const others = conversation.participantIds.filter(
    (id) => id !== message.authorId,
  );
  if (others.length === 0) return null;
  const allRead = others.every((id) => message.readBy.includes(id));
  return allRead ? 'read' : 'sent';
}
