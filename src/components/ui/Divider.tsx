import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Divider({
  orientation = 'horizontal',
  label,
  style,
}: DividerProps): React.JSX.Element {
  const theme = useTheme();
  const lineColor = theme.colors.border;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          { width: StyleSheet.hairlineWidth, backgroundColor: lineColor },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.rowContainer, style]}>
        <View style={[styles.line, { backgroundColor: lineColor }]} />
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.textMuted, marginHorizontal: 8 },
          ]}
        >
          {label}
        </Text>
        <View style={[styles.line, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.line,
        { backgroundColor: lineColor, height: StyleSheet.hairlineWidth },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
