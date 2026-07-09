import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

export function Spinner({
  size = 'md',
  color,
}: SpinnerProps): React.JSX.Element {
  const theme = useTheme();
  // ActivityIndicator only accepts 'small' | 'large' natively, so we scale
  // the 'md' variant with a transform to land at 24 px.
  const nativeSize: 'small' | 'large' = size === 'lg' ? 'large' : 'small';
  const scale = size === 'sm' ? 0.7 : size === 'md' ? 1 : 1.2;
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={nativeSize}
        color={color ?? theme.colors.primary}
        style={{ transform: [{ scale }] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
