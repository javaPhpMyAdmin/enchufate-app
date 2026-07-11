/**
 * Message store — Supabase-backed.
 *
 * Fase 2 replaces the previous AsyncStorage + seed mock with real
 * Supabase queries. The public API of the hooks
 * (`useConversationsForUser`, `useMessagesByConversation`,
 * `useUnreadCountForUser`) and the imperative helpers
 * (`messageStore.findOrCreateConversation`, `addMessage`, `markAsRead`,
 * `byId`, `messagesByConversation`) stays the same so the rest of the
 * app keeps working without changes.
 *
 * Schema (see `supabase/migrations/20260712000000_add_conversations_and_messages.sql`):
 *   - `conversations` (id, participant_ids, last_message_*, unread_count_by_user)
 *   - `messages`      (id, conversation_id, author_id, body, read_by, created_at)
 *
 * RLS: every policy checks `participant_ids @> array[auth.uid()::text]`
 * (the current user is a participant). The app's writes are also bounded
 * by the same check, so we cannot accidentally write into someone
 * else's conversation.
 *
 * Real-time updates (push from server) are NOT wired here — the hooks
 * refetch on mount and on `userId` / `conversationId` change. Tapping
 * the messages tab again, navigating away and back, or pulling to
 * refresh in the chat screen (TODO Phase 9) is enough for the v1 test
 * loop. Phase 9 can add a `supabase.channel('messages')` subscription
 * without changing the public API.
 */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/data/types';

// ---------------------------------------------------------------------------
// Row → domain mapping
// ---------------------------------------------------------------------------
//
// The DB uses snake_case columns; the app's domain types are camelCase.
// The mapping is local to this file so consumers don't have to know about
// the wire format.

interface ConversationRow {
  id: string;
  participant_ids: string[];
  last_message_preview: string;
  last_message_at: string;
  unread_count_by_user: Record<string, number> | null;
  created_at: string;
  updated_at?: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  author_id: string;
  body: string;
  read_by: string[] | null;
  created_at: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    participantIds: row.participant_ids,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: row.last_message_at,
    unreadCountByUser: row.unread_count_by_user ?? {},
    createdAt: row.created_at,
  };
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    authorId: row.author_id,
    body: row.body,
    readBy: row.read_by ?? [],
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Imperative API (used by the map screen's "Contactar" CTA and the
// chat screen's `byId` header lookup). All async.
// ---------------------------------------------------------------------------

export interface NewMessageInput {
  conversationId: string;
  authorId: string;
  body: string;
  /** ISO 8601 timestamp; defaults to "now". */
  createdAt?: string;
}

/**
 * Create a new conversation and its first message in one call.
 * Used by the "Contactar" flow: the conversation only exists after
 * the user actually sends a message, not when they tap the button.
 *
 * Returns the newly created conversation (with the first message
 * already persisted).
 */
async function createConversationWithFirstMessage(
  participantIds: string[],
  authorId: string,
  body: string,
): Promise<{ conversation: Conversation; message: Message }> {
  if (participantIds.length < 2) {
    throw new Error('A conversation needs at least 2 participants');
  }
  if (!body.trim()) {
    throw new Error('createConversationWithFirstMessage: empty body');
  }

  const sorted = [...participantIds].sort();
  const now = new Date().toISOString();
  const preview =
    body.length > 80 ? `${body.slice(0, 77)}…` : body;

  // 1. Create the conversation.
  const { data: convRow, error: convError } = await supabase
    .from('conversations')
    .insert({
      participant_ids: sorted,
      last_message_preview: preview,
      last_message_at: now,
      unread_count_by_user: Object.fromEntries(
        sorted.map((id) => [id, id === authorId ? 0 : 1]),
      ),
    })
    .select()
    .single();
  if (convError || !convRow) {
    throw new Error(
      `createConversationWithFirstMessage: conv insert failed: ${convError?.message ?? 'no data'}`,
    );
  }
  const conversation = rowToConversation(convRow as ConversationRow);

  // 2. Insert the first message.
  const { data: msgRow, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      author_id: authorId,
      body,
      read_by: [authorId],
      created_at: now,
    })
    .select()
    .single();
  if (msgError || !msgRow) {
    throw new Error(
      `createConversationWithFirstMessage: msg insert failed: ${msgError?.message ?? 'no data'}`,
    );
  }
  const message = rowToMessage(msgRow as MessageRow);

  return { conversation, message };
}

/**
 * Find an existing conversation that includes exactly the given
 * participants, or create a new one. The participant set is compared
 * sorted so order doesn't matter.
 *
 * Strategy: RLS already restricts the SELECT to the current user's
 * conversations, so we use `.contains('participant_ids', [firstUser])`
 * to narrow the candidates to a manageable set, then filter
 * client-side for the exact match.
 */
async function findOrCreateConversation(
  participantIds: string[],
): Promise<Conversation> {
  if (participantIds.length < 2) {
    throw new Error('A conversation needs at least 2 participants');
  }
  const target = [...participantIds].sort();

  // 1. Look for an existing conversation with the exact same participants.
  //    RLS limits the SELECT to conversations the caller participates in,
  //    so we can't accidentally see someone else's chat.
  const { data: candidates, error: queryError } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [target[0]!]);
  if (queryError) {
    throw new Error(`findOrCreateConversation: ${queryError.message}`);
  }

  const match = (candidates ?? []).find((c) => {
    const sorted = [...c.participant_ids].sort();
    if (sorted.length !== target.length) return false;
    return sorted.every((id, i) => id === target[i]);
  });
  if (match) return rowToConversation(match);

  // 2. Create a new conversation. The `unread_count_by_user` starts at
  //    0 for every participant; addMessage will bump it for the
  //    recipient when the first message lands.
  const { data, error: insertError } = await supabase
    .from('conversations')
    .insert({
      participant_ids: target,
      last_message_preview: '',
      last_message_at: new Date().toISOString(),
      unread_count_by_user: Object.fromEntries(
        target.map((id) => [id, 0]),
      ),
    })
    .select()
    .single();
  if (insertError || !data) {
    throw new Error(
      `findOrCreateConversation insert: ${insertError?.message ?? 'no data'}`,
    );
  }
  return rowToConversation(data as ConversationRow);
}

/**
 * Append a new message. Bumps the parent conversation's
 * `last_message_preview` and `last_message_at`, and increments the
 * recipient's unread counter (never the sender's).
 */
async function addMessage(input: NewMessageInput): Promise<Message> {
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (!input.body.trim()) {
    throw new Error('addMessage: empty body');
  }

  // 1. Insert the message row.
  const { data, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      author_id: input.authorId,
      body: input.body,
      read_by: [input.authorId],
      created_at: createdAt,
    })
    .select()
    .single();
  if (insertError || !data) {
    throw new Error(`addMessage: ${insertError?.message ?? 'no data'}`);
  }
  const message = rowToMessage(data as MessageRow);

  // 2. Read the current unread map so we can increment the recipients'
  //    counter (everyone except the sender) and bump the preview + at.
  const { data: convRow, error: convError } = await supabase
    .from('conversations')
    .select('participant_ids, unread_count_by_user')
    .eq('id', input.conversationId)
    .single();
  if (convError || !convRow) {
    // The message was inserted; just skip the conversation update. The
    // next message insert will catch up.
    return message;
  }
  const conv = convRow as Pick<
    ConversationRow,
    'participant_ids' | 'unread_count_by_user'
  >;
  const nextUnread: Record<string, number> = {
    ...(conv.unread_count_by_user ?? {}),
  };
  for (const rid of conv.participant_ids) {
    if (rid === input.authorId) continue;
    nextUnread[rid] = (nextUnread[rid] ?? 0) + 1;
  }
  const preview =
    input.body.length > 80
      ? `${input.body.slice(0, 77)}…`
      : input.body;

  await supabase
    .from('conversations')
    .update({
      last_message_preview: preview,
      last_message_at: createdAt,
      unread_count_by_user: nextUnread,
    })
    .eq('id', input.conversationId);

  // 3. Fire push notification to recipients (non-blocking).
  const recipients = conv.participant_ids.filter(
    (id) => id !== input.authorId,
  );
  if (recipients.length > 0) {
    // Fetch the sender's display name for the notification title.
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', input.authorId)
      .single();
    const authorName =
      (authorProfile?.display_name as string | undefined) ?? 'Alguien';

    for (const recipientId of recipients) {
      void sendPushToRecipient(
        recipientId,
        authorName,
        input.body,
        input.conversationId,
      );
    }
  }

  return message;
}

/**
 * Send a push notification to a recipient via the send-push Edge Function.
 * Called fire-and-forget after addMessage succeeds — errors are logged but
 * never thrown (push failure must not break the messaging flow).
 */
async function sendPushToRecipient(
  recipientId: string,
  authorName: string,
  body: string,
  conversationId: string,
): Promise<void> {
  try {
    // Fetch the recipient's push token.
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .not('push_token', 'is', null)
      .single();

    if (!profile?.push_token) return;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    const preview =
      body.length > 60 ? `${body.slice(0, 57)}...` : body;

    await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        push_token: profile.push_token,
        title: `Nuevo mensaje de ${authorName}`,
        body: preview,
        data: { type: 'new-message', conversationId },
      }),
    });
  } catch (err) {
    console.warn('[messageStore] push notification failed (non-blocking)', err);
  }
}

/**
 * Mark every message in the conversation as read by `userId`, and reset
 * the conversation's per-user unread counter to 0. Idempotent.
 */
async function markAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  // 1. Reset the conversation's unread counter for this user.
  const { data: convRow, error: convError } = await supabase
    .from('conversations')
    .select('unread_count_by_user')
    .eq('id', conversationId)
    .single();
  if (convError || !convRow) return;
  const conv = convRow as Pick<ConversationRow, 'unread_count_by_user'>;
  const current = conv.unread_count_by_user ?? {};
  if ((current[userId] ?? 0) !== 0) {
    await supabase
      .from('conversations')
      .update({
        unread_count_by_user: { ...current, [userId]: 0 },
      })
      .eq('id', conversationId);
  }

  // 2. Mark every message in the conversation as read by this user.
  //    We fetch all messages and PATCH the ones that don't include us.
  //    (No bulk-write in the supabase-js client API for array updates.)
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, read_by')
    .eq('conversation_id', conversationId);
  if (msgError || !messages) return;
  const updates = (messages as Pick<MessageRow, 'id' | 'read_by'>[])
    .filter((m) => !(m.read_by ?? []).includes(userId))
    .map((m) =>
      supabase
        .from('messages')
        .update({ read_by: [...(m.read_by ?? []), userId] })
        .eq('id', m.id),
    );
  await Promise.all(updates);
}

/** Look up a conversation by id. Returns null if not found or RLS denied. */
async function byId(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToConversation(data as ConversationRow);
}

/** One-shot read of all messages in a conversation, sorted oldest first. */
async function messagesByConversation(
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as MessageRow[]).map(rowToMessage);
}

export const messageStore = {
  findOrCreateConversation,
  createConversationWithFirstMessage,
  addMessage,
  markAsRead,
  byId,
  messagesByConversation,
};

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------
//
// All hooks are per-component (no module-level state). Each component
// fetches its own data on mount and on `userId` / `conversationId` change.
// Realtime subscriptions are a Phase 9 stretch — the user can pull to
// refresh or navigate away and back to fetch new data.

/** Conversations the user participates in, sorted newest first. */
export function useConversationsForUser(
  userId: string | null | undefined,
): { conversations: Conversation[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId!])
        .order('last_message_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as ConversationRow[]).map(rowToConversation);
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
  return { conversations: data ?? [], isLoading };
}

/** Messages in a single conversation, sorted oldest first. */
export function useMessagesByConversation(
  conversationId: string | null | undefined,
): { messages: Message[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as MessageRow[]).map(rowToMessage);
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60,
  });
  return { messages: data ?? [], isLoading };
}

/** Total unread messages for a user across all their conversations. */
export function useUnreadCountForUser(
  userId: string | null | undefined,
): { count: number; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['unread', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('unread_count_by_user')
        .contains('participant_ids', [userId!]);
      if (error) throw new Error(error.message);
      let total = 0;
      for (const c of (data ?? []) as Pick<
        ConversationRow,
        'unread_count_by_user'
      >[]) {
        total += c.unread_count_by_user?.[userId!] ?? 0;
      }
      return total;
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
  return { count: data ?? 0, isLoading };
}

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

/** Fetch a single conversation by ID. Returns null while loading or if not found. */
export function useConversationById(
  conversationId: string | null | undefined,
): { conversation: Conversation | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => messageStore.byId(conversationId!),
    enabled: !!conversationId,
    staleTime: 1000 * 60,
  });
  return { conversation: data ?? null, isLoading };
}
