/**
 * ProfileMenuItem — one row in the "Preferencias" card on the profile tab.
 *
 * Renders a left icon, a label, and a right chevron. The `danger` variant
 * colors both icon and label with the theme's danger token (used for the
 * "Cerrar sesión" row when it lives in the same list).
 *
 * Tapping the row invokes `onPress` — visually the row highlights on
 * press. No internal state.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/theme';

export type ProfileMenuItemVariant = 'default' | 'danger';

export interface ProfileMenuItemProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  variant?: ProfileMenuItemVariant;
  /** Optional right-side text (e.g. version number). */
  trailing?: string;
  /** Accessibility label override (defaults to `label`). */
  accessibilityLabel?: string;
}

export function ProfileMenuItem({
  icon: Icon,
  label,
  onPress,
  variant = 'default',
  trailing,
  accessibilityLabel,
}: ProfileMenuItemProps): React.JSX.Element {
  const theme = useTheme();
  const isDanger = variant === 'danger';
  const tint = isDanger ? theme.colors.danger : theme.colors.text;
  const iconTint = isDanger ? theme.colors.danger : theme.colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      android_ripple={{ color: theme.colors.surfaceAlt }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.iconWrap}>
        <Icon color={iconTint} size={22} />
      </View>
      <Text
        style={[
          theme.typography.body,
          styles.label,
          { color: tint },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing ? (
        <Text
          style={[
            theme.typography.small,
            { color: theme.colors.textMuted, marginRight: 6 },
          ]}
        >
          {trailing}
        </Text>
      ) : null}
      <ChevronRight color={theme.colors.textLight} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
