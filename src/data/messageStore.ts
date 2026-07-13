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
import { queryClient } from '@/lib/queryClient';
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
 * Uses the server-side `find_or_create_conversation` RPC which handles
 * deduplication atomically via a unique index on `participant_sorted`.
 */
async function findOrCreateConversation(
  participantIds: string[],
): Promise<Conversation> {
  if (participantIds.length < 2) {
    throw new Error('A conversation needs at least 2 participants');
  }

  const { data, error } = await supabase.rpc('find_or_create_conversation', {
    p_participant_ids: participantIds,
  });
  if (error) {
    throw new Error(`findOrCreateConversation: ${error.message}`);
  }
  return rowToConversation(data as ConversationRow);
}

/**
 * Append a new message. Bumps the parent conversation's
 * `last_message_preview` and `last_message_at`, and increments the
 * recipient's unread counter (never the sender's).
 *
 * Uses the `send_message` RPC which consolidates INSERT + conversation
 * UPDATE into a single server-side transaction (was 3 round-trips).
 * Push notifications remain client-side (Edge Function call).
 */
async function addMessage(input: NewMessageInput): Promise<Message> {
  if (!input.body.trim()) {
    throw new Error('addMessage: empty body');
  }

  // Single round-trip: insert message + update conversation atomically.
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: input.conversationId,
    p_sender_id: input.authorId,
    p_content: input.body,
    p_type: 'text',
  });
  if (error) {
    throw new Error(`addMessage: ${error.message}`);
  }

  const rpcResult = data as {
    id: string;
    conversation_id: string;
    author_id: string;
    body: string;
    read_by: string[];
    created_at: string;
    participant_ids: string[];
  };

  const message = rowToMessage({
    id: rpcResult.id,
    conversation_id: rpcResult.conversation_id,
    author_id: rpcResult.author_id,
    body: rpcResult.body,
    read_by: rpcResult.read_by,
    created_at: rpcResult.created_at,
  });

  // Optimistically append the message to the TanStack Query cache so
  // the chat screen renders it immediately without a refetch.
  queryClient.setQueryData<Message[]>(
    ['messages', input.conversationId],
    (prev) => [...(prev ?? []), message],
  );

  // Invalidate the conversations list so the preview + timestamp update.
  queryClient.invalidateQueries({ queryKey: ['conversations'] });

  // Fire push notification to recipients (non-blocking).
  const recipients = rpcResult.participant_ids.filter(
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
 *
 * Uses the server-side `mark_conversation_as_read` RPC which performs the
 * bulk UPDATE in a single query instead of N individual updates.
 */
async function markAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_as_read', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });
  if (error) {
    console.warn('[messageStore] markAsRead RPC failed', error);
  }
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
      const { data, error } = await supabase.rpc('get_total_unread_count', {
        p_user_id: userId!,
      });
      if (error) throw new Error(error.message);
      return (data as number) ?? 0;
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
