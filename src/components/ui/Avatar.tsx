import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineDot?: boolean;
  isOnline?: boolean;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 11,
  md: 14,
  lg: 20,
  xl: 28,
};

export function Avatar({
  source,
  name = '',
  size = 'md',
  showOnlineDot = false,
  isOnline = false,
}: AvatarProps): React.JSX.Element {
  const theme = useTheme();
  const px = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];

  const initials = getInitials(name);
  const showImage = !!source;

  return (
    <View
      style={[
        styles.container,
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          backgroundColor: theme.colors.surfaceAlt,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: source }}
          style={{
            width: px,
            height: px,
            borderRadius: px / 2,
          }}
        />
      ) : (
        <Text
          style={[
            theme.typography.bodyBold,
            { color: theme.colors.text, fontSize },
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      )}

      {showOnlineDot ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isOnline
                ? theme.colors.success
                : theme.colors.textLight,
              width: Math.max(8, px * 0.25),
              height: Math.max(8, px * 0.25),
              borderRadius: Math.max(4, px * 0.125),
              right: 0,
              bottom: 0,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
