/**
 * ProfileHeader — large avatar + full name + member-since.
 *
 * Reused by:
 *   - the own profile tab
 *   - the public owner profile screen (`/profile/[userId]`)
 *
 * Layout is centered. The "verified host" badge is rendered externally
 * (the parent owns the visual chrome around this block).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import type { User } from '@/data/types';
import { formatJoinedAt, fullName } from '@/features/profile/helpers';
import { useTheme } from '@/theme';

export interface ProfileHeaderProps {
  user: User;
}

export function ProfileHeader({ user }: ProfileHeaderProps): React.JSX.Element {
  const theme = useTheme();
  const name = fullName(user);
  const joined = formatJoinedAt(user.joinedAt);

  return (
    <View style={styles.root}>
      <Avatar source={user.avatarUrl} name={name} size="xl" />
      <Text
        style={[
          theme.typography.h2,
          styles.name,
          { color: theme.colors.text },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text
        style={[
          theme.typography.small,
          styles.joined,
          { color: theme.colors.textMuted },
        ]}
      >
        Miembro desde {joined}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  name: {
    marginTop: 12,
  },
  joined: {
    marginTop: 4,
  },
});
