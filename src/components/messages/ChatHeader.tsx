/**
 * `<ChatHeader />` — back button + avatar + name of the other
 * participant + online dot.
 *
 * The header is rendered as a fixed row above the message list. We
 * keep the back button inline (rather than relying on the route
 * header) so the user has a clear exit even on devices that hide
 * the system back gesture.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

import { Avatar } from '@/components/ui';
import type { User } from '@/data/types';
import { useTheme } from '@/theme';

export interface ChatHeaderProps {
  /** The "other" user in the conversation. */
  otherParticipant: Pick<User, 'id' | 'name' | 'surname' | 'avatarUrl' | 'isOnline'>;
  onBack: () => void;
}

export function ChatHeader({
  otherParticipant,
  onBack,
}: ChatHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const fullName =
    `${otherParticipant.name} ${otherParticipant.surname}`.trim() ||
    'Conversación';
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        style={({ pressed }) => [
          styles.backBtn,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <ArrowLeft color={theme.colors.text} size={20} />
      </Pressable>
      <Avatar
        source={otherParticipant.avatarUrl}
        name={fullName}
        size="md"
        showOnlineDot
        isOnline={otherParticipant.isOnline}
      />
      <View style={styles.nameBlock}>
        <Text
          numberOfLines={1}
          style={[
            theme.typography.bodyBold,
            { color: theme.colors.text },
          ]}
        >
          {fullName}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            theme.typography.caption,
            { color: theme.colors.textMuted, marginTop: 2 },
          ]}
        >
          {otherParticipant.isOnline ? 'En línea' : 'Desconectado'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
  },
});
