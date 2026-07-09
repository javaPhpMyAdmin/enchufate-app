/**
 * `<ConversationListItem />` — one row in the Mensajes tab.
 *
 * Layout (left to right):
 *   - Avatar of the other participant (with online dot)
 *   - Name + last message preview (truncated)
 *   - Relative timestamp (top-right)
 *   - Unread badge (right of the timestamp) — primary color, count,
 *     caps at "9+"
 *
 * The whole row is pressable and reads like a standard chat list.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import type { Conversation, User } from '@/data/types';
import {
  formatRelativeTime,
  formatUnreadBadge,
} from '@/features/messages';
import { fullName } from '@/features/profile';
import { useTheme } from '@/theme';

export interface ConversationListItemProps {
  conversation: Conversation;
  otherParticipant: Pick<User, 'id' | 'name' | 'surname' | 'avatarUrl' | 'isOnline'>;
  currentUserId: string;
  onPress: (conversationId: string) => void;
}

export function ConversationListItem({
  conversation,
  otherParticipant,
  currentUserId,
  onPress,
}: ConversationListItemProps): React.JSX.Element {
  const theme = useTheme();
  const name = fullName(otherParticipant);
  const unread = conversation.unreadCountByUser[currentUserId] ?? 0;
  const hasUnread = unread > 0;

  return (
    <Pressable
      onPress={() => onPress(conversation.id)}
      accessibilityRole="button"
      accessibilityLabel={`Conversación con ${name}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceAlt
            : theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Avatar
        source={otherParticipant.avatarUrl}
        name={name}
        size="md"
        showOnlineDot
        isOnline={otherParticipant.isOnline}
      />
      <View style={styles.body}>
        <View style={styles.headerLine}>
          <Text
            numberOfLines={1}
            style={[
              hasUnread ? theme.typography.bodyBold : theme.typography.body,
              { color: theme.colors.text, flex: 1 },
            ]}
          >
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              theme.typography.micro,
              {
                color: hasUnread
                  ? theme.colors.primary
                  : theme.colors.textLight,
                marginLeft: 8,
              },
            ]}
          >
            {formatRelativeTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.previewLine}>
          <Text
            numberOfLines={1}
            style={[
              theme.typography.small,
              {
                color: hasUnread
                  ? theme.colors.text
                  : theme.colors.textMuted,
                flex: 1,
                fontWeight: hasUnread ? '600' : '400',
              },
            ]}
          >
            {conversation.lastMessagePreview || 'Sin mensajes aún'}
          </Text>
          {hasUnread ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text
                style={[
                  theme.typography.micro,
                  { color: theme.colors.textOnPrimary },
                ]}
              >
                {formatUnreadBadge(unread)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
