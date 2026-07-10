/**
 * In-memory CRUD store for conversations and messages.
 *
 * Mirrors the pattern used by `chargerStore`:
 *   - module-level singleton state
 *   - `useSyncExternalStore` for React subscriptions
 *   - AsyncStorage persistence under `enchufate.messages`
 *   - Zod-validated hydration so a corrupted payload can't crash callers
 *   - pub/sub via a small `Set<() => void>` for non-React consumers
 *
 * Phase 5 ships a **mock** implementation. v1 features:
 *   - 1:1 conversations (group chats out of scope)
 *   - text-only messages
 *   - per-user unread counters
 *   - mark-as-read on conversation open
 *   - seed placeholder migration so the real auth user sees demo
 *     conversations on first launch (see `mocks/conversations.ts`)
 *
 * Phase 6+ will replace the in-memory backend with Supabase Realtime
 * without changing the public API.
 */
import { useEffect, useSyncExternalStore } from 'react';

import { storage } from '@/lib/storage';
import type { Conversation, Message } from '@/data/types';

import {
  mockConversations,
  mockMessages,
  SEED_CURRENT_USER_PLACEHOLDER,
} from './mocks/conversations';
import { messageStoreSchema } from './messageStore.schema';

const STORAGE_KEY = 'enchufate.messages';

// ---------------------------------------------------------------------------
// Module-level state (singleton). Mutations always replace the relevant
// slice and notify subscribers so React re-renders fire correctly.
// ---------------------------------------------------------------------------

let conversations: Conversation[] = [];
let messages: Message[] = [];
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Tracks which `current_user` placeholder has already been migrated to
 * a real auth id. Keyed by the real user id. Prevents re-migration on
 * every `conversationsForUser` call AND keeps multi-user sessions on
 * the same device from clobbering each other (in practice we have one
 * session at a time, but defensive against future test fixtures).
 */
const migratedUsers = new Set<string>();

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

// Cached tuple exposed by `getSnapshot`. `useSyncExternalStore` compares
// snapshots with `Object.is`; returning a fresh array on every call makes
// React think the data changes on every render and re-renders forever.
// We rebuild the tuple only when a setter actually mutates state, so the
// reference stays stable between mutations.
let snapshot: readonly [Conversation[], Message[]] = [[], []];

function setConversations(next: Conversation[]): void {
  conversations = next;
  snapshot = [conversations, messages];
  notify();
}

function setMessages(next: Message[]): void {
  messages = next;
  snapshot = [conversations, messages];
  notify();
}

/**
 * Stable snapshot for `useSyncExternalStore`. We expose a single
 * tuple (conversations, messages) so consumers can subscribe to both
 * with a single hook.
 */
function getSnapshot(): readonly [Conversation[], Message[]] {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function persist(): Promise<void> {
  await storage.setJSON(STORAGE_KEY, { conversations, messages });
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

async function hydrateFromStorage(): Promise<{
  conversations: Conversation[];
  messages: Message[];
}> {
  const raw = await storage.getJSON<unknown>(STORAGE_KEY);
  if (raw == null) {
    // First run (or storage cleared): use the curated mock seed.
    return { conversations: mockConversations, messages: mockMessages };
  }

  const result = messageStoreSchema.safeParse(raw);
  if (!result.success) {
    console.warn(
      '[messageStore] persisted payload invalid, using seed',
      result.error.message,
    );
    return { conversations: mockConversations, messages: mockMessages };
  }

  const parsed = result.data;
  // If the user wiped their messages from storage but the key exists,
  // we end up with an empty (but valid) payload. Keep that — the user
  // gets the empty-state UI which is the right behavior. Only fall
  // back to the seed if hydration returned an entirely missing list.
  return {
    conversations: parsed.conversations ?? [],
    messages: parsed.messages ?? [],
  };
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const next = await hydrateFromStorage();
    setConversations(next.conversations);
    setMessages(next.messages);
    isLoaded = true;
  })();
  await loadPromise;
  loadPromise = null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a stable id for a new conversation or message. Prefixed so
 * the namespace is easy to grep for in logs and persisted JSON.
 */
function generateId(prefix: 'conv' | 'msg'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * Sort the participant ids so the same conversation can be looked up
 * regardless of the order in which the caller passed them in.
 */
function sortParticipants(ids: string[]): string[] {
  return [...ids].sort();
}

function sameParticipants(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * One-shot in-memory migration of the seed placeholder to the real
 * auth user id. Touches both the conversation list (participantIds +
 * unreadCountByUser keys) and the message list (authorId + readBy).
 *
 * Idempotent: a given auth user only triggers the migration once.
 * After that, the real conversations are already in place and we
 * leave the data alone.
 *
 * We only mark the user as migrated AFTER a successful migration. If
 * the data hasn't loaded yet (or there are no placeholders to swap),
 * the user stays un-migrated so the next call (post-hydration) can
 * retry.
 */
function migrateSeedForUser(userId: string): void {
  if (!userId) return;
  if (migratedUsers.has(userId)) return;
  // Nothing to migrate if no conversation references the placeholder
  // (e.g. data hasn't loaded yet, or the user already triggered the
  // migration through `findOrCreateConversation`).
  const hasPlaceholder = conversations.some((c) =>
    c.participantIds.includes(SEED_CURRENT_USER_PLACEHOLDER),
  );
  if (!hasPlaceholder) return;

  const replaceId = (value: string): string =>
    value === SEED_CURRENT_USER_PLACEHOLDER ? userId : value;

  const nextConversations: Conversation[] = conversations.map((c) => {
    if (!c.participantIds.includes(SEED_CURRENT_USER_PLACEHOLDER)) return c;
    return {
      ...c,
      participantIds: c.participantIds.map(replaceId),
      unreadCountByUser: Object.fromEntries(
        Object.entries(c.unreadCountByUser).map(([k, v]) => [replaceId(k), v]),
      ),
    };
  });

  const nextMessages: Message[] = messages.map((m) => {
    if (
      m.authorId !== SEED_CURRENT_USER_PLACEHOLDER &&
      !m.readBy.includes(SEED_CURRENT_USER_PLACEHOLDER)
    ) {
      return m;
    }
    return {
      ...m,
      authorId: replaceId(m.authorId),
      readBy: m.readBy.map(replaceId),
    };
  });

  setConversations(nextConversations);
  setMessages(nextMessages);
  migratedUsers.add(userId);
  // Persistence is fire-and-forget — the in-memory state is already
  // updated, so React consumers see the migration immediately.
  void persist();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NewMessageInput {
  conversationId: string;
  authorId: string;
  body: string;
  /** ISO 8601 timestamp; defaults to "now". */
  createdAt?: string;
}

export const messageStore = {
  /**
   * Force-hydrate from AsyncStorage. Safe to call multiple times; the
   * second call is a no-op once `isLoaded` is true. Most code paths
   * don't need to call this — the hooks trigger hydration implicitly.
   */
  async load(): Promise<void> {
    await ensureLoaded();
  },

  /**
   * Find an existing conversation that includes exactly the given
   * participants, or create a new one. The participant set is
   * compared sorted, so order doesn't matter. The new conversation
   * is persisted to AsyncStorage.
   */
  async findOrCreateConversation(participantIds: string[]): Promise<Conversation> {
    await ensureLoaded();
    const target = sortParticipants(participantIds);
    const existing = conversations.find((c) =>
      sameParticipants(sortParticipants(c.participantIds), target),
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const next: Conversation = {
      id: generateId('conv'),
      participantIds: target,
      lastMessagePreview: '',
      lastMessageAt: now,
      unreadCountByUser: Object.fromEntries(target.map((id) => [id, 0])),
      createdAt: now,
    };
    setConversations([...conversations, next]);
    await persist();
    return next;
  },

  /**
   * Append a new message. Updates the parent conversation's
   * `lastMessagePreview` and `lastMessageAt`, and increments the
   * recipient's unread count (never the sender's).
   */
  async addMessage(input: NewMessageInput): Promise<Message> {
    await ensureLoaded();
    const createdAt = input.createdAt ?? new Date().toISOString();
    const next: Message = {
      id: generateId('msg'),
      conversationId: input.conversationId,
      authorId: input.authorId,
      body: input.body,
      createdAt,
      readBy: [input.authorId],
    };
    setMessages([...messages, next]);

    // Bump the conversation's denormalized fields and the recipient's
    // unread count (everyone except the sender).
    const convIdx = conversations.findIndex(
      (c) => c.id === input.conversationId,
    );
    if (convIdx !== -1) {
      const conv = conversations[convIdx]!;
      const recipientIds = conv.participantIds.filter(
        (id) => id !== input.authorId,
      );
      const nextUnread: Record<string, number> = { ...conv.unreadCountByUser };
      for (const rid of recipientIds) {
        nextUnread[rid] = (nextUnread[rid] ?? 0) + 1;
      }
      const preview = input.body.length > 80
        ? `${input.body.slice(0, 77)}…`
        : input.body;
      const updated: Conversation = {
        ...conv,
        lastMessagePreview: preview,
        lastMessageAt: createdAt,
        unreadCountByUser: nextUnread,
      };
      const nextConvs = [...conversations];
      nextConvs[convIdx] = updated;
      setConversations(nextConvs);
    }
    await persist();
    return next;
  },

  /**
   * Mark every message in a conversation as read for `userId`.
   * Also resets the conversation's per-user unread counter to 0.
   * Safe to call repeatedly; this is intentionally idempotent.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await ensureLoaded();
    let changed = false;

    const nextMessages = messages.map((m) => {
      if (m.conversationId !== conversationId) return m;
      if (m.readBy.includes(userId)) return m;
      changed = true;
      return { ...m, readBy: [...m.readBy, userId] };
    });

    const convIdx = conversations.findIndex((c) => c.id === conversationId);
    let nextConversations = conversations;
    if (convIdx !== -1) {
      const conv = conversations[convIdx]!;
      const current = conv.unreadCountByUser[userId] ?? 0;
      if (current !== 0) {
        changed = true;
        const updated: Conversation = {
          ...conv,
          unreadCountByUser: {
            ...conv.unreadCountByUser,
            [userId]: 0,
          },
        };
        nextConversations = [...conversations];
        nextConversations[convIdx] = updated;
      }
    }

    if (changed) {
      setMessages(nextMessages);
      if (nextConversations !== conversations) {
        setConversations(nextConversations);
      }
      await persist();
    }
  },

  /** All conversations. */
  allConversations(): readonly Conversation[] {
    return conversations;
  },

  /** All messages. */
  allMessages(): readonly Message[] {
    return messages;
  },

  /** Look up a conversation by id. */
  byId(id: string): Conversation | null {
    return conversations.find((c) => c.id === id) ?? null;
  },

  /** Messages for a conversation, sorted by `createdAt` asc. */
  messagesByConversation(conversationId: string): Message[] {
    return messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /**
   * Conversations where the user is a participant, sorted by
   * `lastMessageAt` desc. Triggers the seed migration the first
   * time it's called for a given user id.
   */
  conversationsForUser(userId: string): Conversation[] {
    if (!userId) return [];
    migrateSeedForUser(userId);
    return conversations
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  /** Total unread messages for a user across all their conversations. */
  unreadCountForUser(userId: string): number {
    if (!userId) return 0;
    migrateSeedForUser(userId);
    let total = 0;
    for (const c of conversations) {
      if (!c.participantIds.includes(userId)) continue;
      total += c.unreadCountByUser[userId] ?? 0;
    }
    return total;
  },

  /**
   * Reset the store back to the seed (used by tests / debug tooling).
   * Not wired to any UI in v1.
   */
  async resetToSeed(): Promise<void> {
    setConversations(mockConversations);
    setMessages(mockMessages);
    migratedUsers.clear();
    isLoaded = true;
    await persist();
  },
};

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/**
 * Subscribe to the conversations for a specific user. Triggers
 * hydration on first mount and runs the seed migration on first call
 * for a given user id.
 */
export function useConversationsForUser(userId: string | null | undefined): Conversation[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!userId) return [];
  if (!isLoaded && !loadPromise) {
    void ensureLoaded();
  }
  // Re-trigger the migration on every render where the data has
  // potentially changed. Depending on the snapshot length keeps the
  // effect cheap (it only re-fires when the data shape changes, not
  // on every parent re-render). The migration itself is idempotent
  // (short-circuits via `migratedUsers`).
  const dataVersion = snapshot[0].length;
  useEffect(() => {
    if (userId) {
      migrateSeedForUser(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dataVersion]);
  return snapshot[0]
    .filter((c) => c.participantIds.includes(userId))
    .slice()
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

/** Subscribe to the messages in a specific conversation. */
export function useMessagesByConversation(
  conversationId: string | null | undefined,
): Message[] {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!conversationId) return [];
  if (!isLoaded && !loadPromise) {
    void ensureLoaded();
  }
  // Derive the view from the snapshot so the subscription re-fires on
  // every mutation. Sorting by createdAt is stable because ISO 8601
  // strings sort lexicographically the same as chronologically.
  return snapshot[1]
    .filter((m) => m.conversationId === conversationId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Total unread count for a user across all conversations. */
export function useUnreadCountForUser(
  userId: string | null | undefined,
): number {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!userId) return 0;
  if (!isLoaded && !loadPromise) {
    void ensureLoaded();
  }
  let total = 0;
  for (const c of snapshot[0]) {
    if (!c.participantIds.includes(userId)) continue;
    total += c.unreadCountByUser[userId] ?? 0;
  }
  return total;
}
