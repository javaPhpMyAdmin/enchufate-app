/**
 * Mensajes tab — list of conversations for the authenticated user.
 *
 * Two modes driven by the auth status:
 *   - unauthenticated: welcoming copy + "Iniciá sesión" CTA.
 *   - authenticated: search header + list of `ConversationListItem`s,
 *     sorted by recency. Empty state with "Buscar cargadores" CTA when
 *     the user has no conversations yet.
 *
 * Tapping a row navigates to `/messages/<conversationId>`. The auth
 * session is read via `useAuth()` so a logout + new login picks up the
 * new id automatically and the seed migration in the store runs.
 */
import { useRouter } from 'expo-router';
import { MessageCircle, Search, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Screen } from '@/components/ui';
import { ConversationListItem, ConversationsListSkeleton, ConversationRowSkeleton } from '@/components/messages';
import { useAuth } from '@/features/auth';
import { sortByRecency } from '@/features/messages';
import {
  useConversationsForUser,
} from '@/data/messageStore';
import type { Conversation, User } from '@/data/types';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useTheme } from '@/theme';

export default function MessagesScreen(): React.JSX.Element {
  const { status, session } = useAuth();
  const me = session?.user ?? null;
  const theme = useTheme();
  const router = useRouter();

  // Loading skeleton — no hooks below this point depend on me, so it's safe.
  if (status === 'loading') {
    return <Screen scroll={false} edges={['top']} />;
  }
  if (!me) {
    return (
      <Screen scroll={false} edges={['top']}>
        <View style={styles.unauth}>
          <EmptyState
            icon={
              <MessageCircle color={theme.colors.textMuted} size={36} />
            }
            title="Iniciá sesión"
            message="Necesitás iniciar sesión para ver tus conversaciones."
            actionLabel="Iniciá sesión"
            onAction={() => router.push('/(public)/login')}
          />
        </View>
      </Screen>
    );
  }

  // Authenticated branch — all hooks live inside this child component
  // so they are always called in the same order (rules of hooks).
  return <MessagesAuthenticated userId={me.id} />;
}

// ---------------------------------------------------------------------------
// Authenticated branch — hooks are safe here because this component is
// always rendered in the same path (never conditionally mounted).
// ---------------------------------------------------------------------------

function MessagesAuthenticated({
  userId,
}: {
  userId: string;
}): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { conversations, isLoading } = useConversationsForUser(userId);
  const [query, setQuery] = useState<string>('');

  const handleOpenConversation = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const handleClearSearch = () => {
    setQuery('');
  };

  const handleFindChargers = () => {
    router.push('/(tabs)/map');
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <View style={styles.header}>
            <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
              Mensajes
            </Text>
          </View>
          <ConversationsListSkeleton />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[theme.typography.h1, { color: theme.colors.text }]}>
            Mensajes
          </Text>
          <View
            style={[
              styles.searchInputWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Search color={theme.colors.textMuted} size={18} />
            <TextInput
              value={query}
              onChangeText={handleSearch}
              placeholder="Buscar conversaciones"
              placeholderTextColor={theme.colors.textLight}
              style={[
                styles.searchInput,
                theme.typography.body,
                { color: theme.colors.text },
              ]}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable
                onPress={handleClearSearch}
                accessibilityLabel="Limpiar búsqueda"
                hitSlop={8}
              >
                <X color={theme.colors.textMuted} size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ConversationsBody
          conversations={conversations}
          currentUserId={userId}
          query={query}
          onOpen={handleOpenConversation}
          onFindChargers={handleFindChargers}
        />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Body — kept as a separate component so the main `MessagesScreen`
// reads top-to-bottom and the unauthenticated branch short-circuits
// cleanly.
// ---------------------------------------------------------------------------

interface ConversationsBodyProps {
  conversations: Conversation[];
  currentUserId: string;
  query: string;
  onOpen: (id: string) => void;
  onFindChargers: () => void;
}

function ConversationsBody({
  conversations,
  currentUserId,
  query,
  onOpen,
  onFindChargers,
}: ConversationsBodyProps): React.JSX.Element {
  const theme = useTheme();
  const filtered = useMemo<Conversation[]>(() => {
    const sorted = sortByRecency(conversations);
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((c) => {
      const preview = c.lastMessagePreview.toLowerCase();
      return preview.includes(q);
    });
  }, [conversations, query]);

  if (filtered.length === 0) {
    return (
      <View style={styles.empty}>
        {query.trim().length > 0 ? (
          <EmptyState
            icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
            title="Sin resultados"
            message="No encontramos conversaciones que coincidan con tu búsqueda."
          />
        ) : (
          <EmptyState
            icon={<MessageCircle color={theme.colors.textMuted} size={36} />}
            title="Todavía no tenés conversaciones"
            message="Tocá el botón Contactar en un cargador para empezar."
            actionLabel="Buscar cargadores"
            onAction={onFindChargers}
          />
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <Row
          conversation={item}
          currentUserId={currentUserId}
          onOpen={onOpen}
        />
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

interface RowProps {
  conversation: Conversation;
  currentUserId: string;
  onOpen: (id: string) => void;
}

function Row({
  conversation,
  currentUserId,
  onOpen,
}: RowProps): React.JSX.Element {
  const otherId = conversation.participantIds.find(
    (id) => id !== currentUserId,
  );
  const { data: profile, isLoading } = useProfileQuery(otherId ?? undefined);

  if (isLoading) {
    return <ConversationRowSkeleton />;
  }

  const other: User | null = profile ?? null;
  if (!other) {
    return <View />;
  }
  return (
    <ConversationListItem
      conversation={conversation}
      otherParticipant={other}
      currentUserId={currentUserId}
      onPress={onOpen}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  unauth: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
