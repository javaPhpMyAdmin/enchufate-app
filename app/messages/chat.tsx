/**
 * Chat screen — handles both NEW and EXISTING conversations.
 *
 * Route: `/messages/chat?ownerId=xxx` (new) or `/messages/chat?conversationId=xxx` (existing)
 *
 * New conversation flow:
 *   1. User taps "Contactar" on a charger → navigates here with `ownerId`
 *   2. Chat screen shows empty state (no messages yet)
 *   3. User types and sends → `createConversationWithFirstMessage` creates
 *      the conversation + first message atomically
 *   4. Screen switches to "existing conversation" mode
 *
 * Existing conversation flow:
 *   1. User taps a conversation in the messages list → navigates here with `conversationId`
 *   2. Chat screen loads conversation and messages normally
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
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import {
  ChatHeader,
  ChatInput,
  ChatKeyboardView,
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
import type { Conversation, Message, User } from '@/data/types';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useTheme } from '@/theme';
import { MessageCircle } from 'lucide-react-native';

export default function ChatScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id?: string | string[];
    ownerId?: string | string[];
    conversationId?: string | string[];
  }>();

  // Normalize params — could be string or string[]
  const rawId = params.id;
  const rawOwnerId = params.ownerId;
  const rawConvId = params.conversationId;
  const conversationId = Array.isArray(rawId)
    ? rawId[0]
    : Array.isArray(rawConvId)
      ? rawConvId[0]
      : rawId ?? rawConvId ?? undefined;
  const ownerId = Array.isArray(rawOwnerId)
    ? rawOwnerId[0]
    : rawOwnerId ?? undefined;

  const { session } = useAuth();
  const me = session?.user;

  // --- Conversation state ---
  const [localConversation, setLocalConversation] = useState<Conversation | null>(null);
  const [isNewConversation, setIsNewConversation] = useState<boolean>(
    !conversationId && !!ownerId,
  );

  // Fetch existing conversation via TanStack Query (only when we have an ID).
  const { conversation: fetchedConversation, isLoading } = useConversationById(
    isNewConversation ? null : conversationId,
  );
  // For new conversations, prefer local state (set after first message).
  // For existing conversations, use the fetched data.
  const conversation = localConversation ?? fetchedConversation;

  const { messages } = useMessagesByConversation(conversation?.id ?? null);

  // --- Other participant ---
  // For new conversations, we know the owner ID directly.
  // For existing ones, derive it from the conversation participants.
  const otherUserId = useMemo<string | undefined>(() => {
    if (isNewConversation && ownerId) return ownerId;
    if (!conversation || !me) return undefined;
    const otherId = getOtherParticipant(conversation, me);
    return otherId && otherId !== me.id ? otherId : undefined;
  }, [conversation, me, isNewConversation, ownerId]);

  const { data: profileData, isLoading: isProfileLoading } =
    useProfileQuery(otherUserId);

  const other: User | null = useMemo<User | null>(() => {
    if (profileData) return profileData;
    // Self-conversation: surface the current user as a stub so the
    // header still renders.
    if (conversation && me) {
      const otherId = getOtherParticipant(conversation, me);
      if (otherId === me.id) return me;
    }
    return null;
  }, [profileData, conversation, me]);

  // --- Composer ---
  const [draft, setDraft] = useState<string>('');

  // --- Send handler ---
  const handleSend = useCallback((): void => {
    if (!me) return;
    const body = draft.trim();
    if (body.length === 0) return;

    if (isNewConversation && ownerId) {
      // NEW conversation: create conversation + first message atomically.
      void (async () => {
        try {
          const { conversation: conv } =
            await messageStore.createConversationWithFirstMessage(
              [me.id, ownerId],
              me.id,
              body,
            );
          // Switch to existing conversation mode.
          setLocalConversation(conv);
          setIsNewConversation(false);
          // Invalidate conversations list so Messages tab shows the new conversation.
          void queryClient.invalidateQueries({ queryKey: ['conversations', me.id] });
        } catch (err) {
          console.warn('[chat] createConversationWithFirstMessage failed', err);
        }
      })();
    } else if (conversation) {
      // EXISTING conversation: just append the message.
      void messageStore.addMessage({
        conversationId: conversation.id,
        authorId: me.id,
        body,
      }).catch((err) => {
        console.warn('[chat] addMessage failed', err);
      });
      // Invalidate conversations list to update lastMessagePreview.
      void queryClient.invalidateQueries({ queryKey: ['conversations', me.id] });
    }

    setDraft('');
    setAutoScroll(true);
  }, [me, draft, isNewConversation, ownerId, conversation, queryClient]);

  // --- Mark as read ---
  const markedAsReadRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !me) return;
    if (markedAsReadRef.current.has(conversation.id)) return;
    markedAsReadRef.current.add(conversation.id);
    void messageStore.markAsRead(conversation.id, me.id).then((ok) => {
      if (!ok) {
        // RPC failed — do NOT clear the ref or invalidate queries.
        // Clearing the ref would re-trigger this effect (conversation
        // reference changes on invalidation → infinite re-render loop).
        return;
      }
      // Success — invalidate so the conversations list and unread badge refresh.
      void queryClient.invalidateQueries({ queryKey: ['conversations', me.id] });
      void queryClient.invalidateQueries({ queryKey: ['unread', me.id] });
    });
  }, [conversation, me, messages.length]);

  // --- Auto-scroll ---
  const listRef = useRef<FlatList<Message>>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  useEffect(() => {
    if (!autoScroll) return;
    const handle = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 16);
    return () => clearTimeout(handle);
  }, [messages.length, autoScroll]);

  const handleScroll = useCallback(
    (e: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setAutoScroll(distanceFromBottom < 32);
    },
    [],
  );

  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/messages');
    }
  }, [router]);

  // --- Render ---
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

  // Loading / guard states.
  if (!me) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
          title="Iniciá sesión"
          message="Necesitás iniciar sesión para enviar mensajes."
        />
      </SafeAreaView>
    );
  }

  if (!isNewConversation && !conversation) {
    // Show skeleton while fetching an existing conversation.
    if (isLoading) {
      return (
        <SafeAreaView
          style={[styles.flex, { backgroundColor: theme.colors.background }]}
          edges={['top']}
        >
          <ChatSkeleton />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
          title="Conversación no encontrada"
          message="No pudimos abrir esta conversación."
        />
      </SafeAreaView>
    );
  }

  // Show skeleton while profile is loading (instead of generic "Conductor").
  if (isProfileLoading && !other) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <ChatSkeleton />
      </SafeAreaView>
    );
  }

  if (!other) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <EmptyState
          icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
          title="Usuario no encontrado"
          message="No pudimos identificar al otro participante."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ChatHeader otherParticipant={other} onBack={handleBack} />
      <ChatKeyboardView
        style={styles.flex}
      >
        {isNewConversation ? (
          // Empty state for new conversations.
          <View style={styles.empty}>
            <EmptyState
              icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
              title="Empezá la conversación"
              message={`Escribile a ${other?.name ?? 'este anfitrión'} para coordinar tu carga.`}
            />
          </View>
        ) : (
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
        )}
        <ChatInput
          value={draft}
          onChangeText={setDraft}
          onSend={handleSend}
        />
      </ChatKeyboardView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
});
