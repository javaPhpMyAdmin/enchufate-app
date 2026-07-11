/**
 * Chat screen — `/messages/[id]`.
 *
 * Layout (top to bottom):
 *   1. `<ChatHeader />` — back button + avatar + name of the other
 *      participant + online dot
 *   2. `<FlatList />` of `<MessageBubble />`s (auto-scroll to bottom
 *      on new messages)
 *   3. `<ChatInput />` — text field + send button
 *
 * Mark-as-read: every time the message list changes (new message,
 * initial load), we call `messageStore.markAsRead(conversationId, me.id)`
 * so the recipient's unread counter is reset. We guard against an
 * infinite loop with a `markedAsReadRef` that records which
 * conversation ids have already been marked in this session.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import {
  ChatHeader,
  ChatInput,
  ChatSkeleton,
  MessageBubble,
} from '@/components/messages';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  getOtherParticipant,
  getReadReceipt,
  shouldShowTimestamp,
} from '@/features/messages';
import { messageStore, useConversationById, useMessagesByConversation } from '@/data/messageStore';
import { mockUsers } from '@/data/mocks/users';
import type { Message, User } from '@/data/types';
import { getUserById } from '@/domain/user';
import { useTheme } from '@/theme';
import { MessageCircle } from 'lucide-react-native';

export default function ChatScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = params.id;
  const conversationId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { session } = useAuth();
  const me = session?.user;

  // Fetch the conversation via TanStack Query.
  const { conversation, isLoading } = useConversationById(conversationId);

  const { messages } = useMessagesByConversation(conversation?.id ?? null);

  // Identify the other participant. We look in the mock users first
  // (most of the time the other is a known host); if not found we
  // synthesize a generic stub from the session info, which can
  // happen when the current user messages themselves in tests.
  const other: User | null = useMemo<User | null>(() => {
    if (!conversation || !me) return null;
    const otherId = getOtherParticipant(conversation, me);
    if (!otherId) return null;
    if (otherId === me.id) {
      // Self-conversation: surface the current user as a stub so the
      // header still renders.
      return me;
    }
    return getUserById(mockUsers, otherId) ?? genericUser(otherId);
  }, [conversation, me]);

  // Composer state — the chat input is fully controlled.
  const [draft, setDraft] = useState<string>('');

  // Auto-mark-as-read whenever the message list changes. The ref
  // prevents the effect from re-firing for the same conversation in
  // the same session (otherwise the mark-as-read mutation notifies
  // subscribers → messages change → effect fires again → loop).
  const markedAsReadRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !me) return;
    if (markedAsReadRef.current.has(conversation.id)) return;
    markedAsReadRef.current.add(conversation.id);
    void messageStore.markAsRead(conversation.id, me.id);
  }, [conversation, me, messages.length]);

  // Auto-scroll to bottom on new messages. We use a ref + content
  // size change so this works with a long list (scrollToEnd can
  // flicker when the list is taller than the viewport).
  const listRef = useRef<FlatList<Message>>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  useEffect(() => {
    if (!autoScroll) return;
    // Defer to the next frame so the new row has been laid out.
    const handle = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 16);
    return () => clearTimeout(handle);
  }, [messages.length, autoScroll]);

  // Send the draft: validate, append, clear, then trigger the
  // simulated "other user is typing" indicator 1.5s later.
  const handleSend = useCallback((): void => {
    if (!conversation || !me) return;
    const body = draft.trim();
    if (body.length === 0) return;
    void messageStore.addMessage({
      conversationId: conversation.id,
      authorId: me.id,
      body,
    });
    // Invalidate conversations list to update lastMessagePreview.
    void queryClient.invalidateQueries({ queryKey: ['conversations', me.id] });
    setDraft('');
    // Re-enable auto-scroll in case the user scrolled up earlier
    // and is now back to the bottom sending a new message.
    setAutoScroll(true);
  }, [conversation, me, draft, queryClient]);

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/messages');
    }
  }, [router]);

  // If the user scrolls up (e.g. to re-read an older message),
  // disable auto-scroll until they scroll back down. This keeps
  // long lists from being yanked to the bottom unexpectedly.
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      // 32px threshold so the user can land right at the bottom
      // without us re-enabling on tiny noise.
      setAutoScroll(distanceFromBottom < 32);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>) => {
      const isOutgoing = item.authorId === me?.id;
      const showMeta = shouldShowTimestamp(messages, index);
      const receipt = isOutgoing && conversation
        ? getReadReceipt(item, conversation, me.id)
        : null;
      return (
        <MessageBubble
          message={item}
          isOutgoing={isOutgoing}
          showMeta={showMeta}
          readReceipt={receipt ?? undefined}
        />
      );
    },
    [me?.id, conversation, messages],
  );

  // Hard guards: missing conversation or auth → minimal placeholder.
  // These MUST come AFTER all hooks to avoid "hooks order" violations.
  if (isLoading && !conversation) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <ChatSkeleton />
      </SafeAreaView>
    );
  }
  if (!conversationId) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon={
            <MessageCircle
              color={theme.colors.textMuted}
              size={36}
            />
          }
          title="Conversación no encontrada"
          message="La conversación que buscás no existe."
        />
      </SafeAreaView>
    );
  }
  if (!conversation || !me || !other) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon={
            <MessageCircle
              color={theme.colors.textMuted}
              size={36}
            />
          }
          title="Conversación no encontrada"
          message="No pudimos abrir esta conversación."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <ChatHeader otherParticipant={other} onBack={handleBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        />
        <ChatInput
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Generic stub for unknown user ids.
const genericUserCache: Record<string, User> = {};
function genericUser(id: string): User {
  if (genericUserCache[id]) return genericUserCache[id]!;
  const u: User = {
    id,
    name: 'Conductor',
    surname: '',
    email: '',
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      id,
    )}&background=00C896&color=fff&size=200&bold=true&format=png`,
    rating: 0,
    reviewCount: 0,
    isOnline: false,
    isHost: false,
    joinedAt: new Date().toISOString(),
  };
  genericUserCache[id] = u;
  return u;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
});
