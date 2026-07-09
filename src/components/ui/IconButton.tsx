import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

export type IconButtonShape = 'circle' | 'square';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  icon: React.ReactNode;
  shape?: IconButtonShape;
  size?: IconButtonSize;
  variant?: 'solid' | 'soft' | 'ghost';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

const SIZE_MAP: Record<IconButtonSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

const ICON_SIZE_MAP: Record<IconButtonSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function IconButton({
  icon,
  shape = 'circle',
  size = 'md',
  variant = 'soft',
  style,
  accessibilityLabel,
  disabled,
  ...rest
}: IconButtonProps): React.JSX.Element {
  const theme = useTheme();
  const dim = SIZE_MAP[size];
  const radius = shape === 'circle' ? dim / 2 : theme.radii.md;

  let backgroundColor: string;
  let borderColor: string;
  switch (variant) {
    case 'solid':
      backgroundColor = theme.colors.primary;
      borderColor = 'transparent';
      break;
    case 'ghost':
      backgroundColor = 'transparent';
      borderColor = 'transparent';
      break;
    case 'soft':
    default:
      backgroundColor = theme.colors.surface;
      borderColor = theme.colors.border;
      break;
  }

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: theme.colors.surfaceAlt, borderless: true }}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          backgroundColor,
          borderColor,
          borderWidth: variant === 'soft' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// `ICON_SIZE_MAP` is exported so consumers can size icons to match the button.
export const iconButtonIconSize = ICON_SIZE_MAP;
