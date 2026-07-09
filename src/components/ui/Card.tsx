import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

export type CardVariant = 'elevated' | 'flat' | 'outlined';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  variant = 'elevated',
  padded = true,
  style,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  const theme = useTheme();

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.lg,
    padding: padded ? theme.spacing.md : 0,
    ...(variant === 'elevated' ? theme.shadows.sm : {}),
    ...(variant === 'outlined'
      ? {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        }
      : {}),
  };

  return (
    <View {...rest} style={[containerStyle, style]}>
      {children}
    </View>
  );
}

export const CardHeader = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => (
  <View style={[styles.header, style]}>{children}</View>
);

export const CardBody = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => <View style={style}>{children}</View>;

export const CardFooter = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element => (
  <View style={[styles.footer, style]}>{children}</View>
);

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  footer: {
    marginTop: 12,
  },
});
