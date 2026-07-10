import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  /**
   * Override the label text color from the variant's default. Useful when
   * the variant's `background` is also being overridden (e.g. a "primary"
   * button with a white background needs dark text, not `textOnPrimary`).
   */
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  textColor,
  style,
  ...rest
}: ButtonProps): React.JSX.Element {
  const theme = useTheme();

  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];

  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: theme.colors.surfaceAlt }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyles.background(theme),
          borderColor: variantStyles.borderColor(theme),
          borderWidth: variantStyles.borderWidth,
          paddingVertical: sizeStyles.paddingV,
          paddingHorizontal: sizeStyles.paddingH,
          borderRadius: sizeStyles.radius,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.spinnerColor(theme)}
        />
      ) : (
        <View style={styles.row}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={[
              styles.label,
              sizeStyles.text,
              { color: textColor ?? variantStyles.textColor(theme) },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    background: (t: ReturnType<typeof useTheme>) => string;
    borderColor: (t: ReturnType<typeof useTheme>) => string;
    borderWidth: number;
    textColor: (t: ReturnType<typeof useTheme>) => string;
    spinnerColor: (t: ReturnType<typeof useTheme>) => string;
  }
> = {
  primary: {
    background: (t) => t.colors.primary,
    borderColor: () => 'transparent',
    borderWidth: 0,
    textColor: (t) => t.colors.textOnPrimary,
    spinnerColor: (t) => t.colors.textOnPrimary,
  },
  secondary: {
    background: (t) => t.colors.surface,
    borderColor: (t) => t.colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    textColor: (t) => t.colors.text,
    spinnerColor: (t) => t.colors.text,
  },
  ghost: {
    background: () => 'transparent',
    borderColor: () => 'transparent',
    borderWidth: 0,
    textColor: (t) => t.colors.primary,
    spinnerColor: (t) => t.colors.primary,
  },
};

const SIZE_STYLES: Record<
  ButtonSize,
  { paddingV: number; paddingH: number; radius: number; text: object }
> = {
  sm: {
    paddingV: 6,
    paddingH: 12,
    radius: 6,
    text: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  },
  md: {
    paddingV: 10,
    paddingH: 16,
    radius: 10,
    text: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  },
  lg: {
    paddingV: 14,
    paddingH: 20,
    radius: 14,
    text: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  },
};

