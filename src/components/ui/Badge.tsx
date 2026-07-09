import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export type BadgeStatus = 'available' | 'reserved' | 'busy' | 'neutral';
export type BadgeTone = 'solid' | 'soft' | 'outline';

export interface BadgeProps {
  status?: BadgeStatus;
  tone?: BadgeTone;
  label: string;
  style?: StyleProp<ViewStyle>;
}

const STATUS_FG: Record<BadgeStatus, string> = {
  available: '#047857',
  reserved: '#92400E',
  busy: '#475569',
  neutral: '#0F172A',
};

const STATUS_BG: Record<BadgeStatus, string> = {
  available: '#D1FAE5',
  reserved: '#FEF3C7',
  busy: '#E2E8F0',
  neutral: '#F1F5F9',
};

const STATUS_BORDER: Record<BadgeStatus, string> = {
  available: '#10B981',
  reserved: '#F59E0B',
  busy: '#94A3B8',
  neutral: '#CBD5E1',
};

export function Badge({
  status = 'neutral',
  tone = 'soft',
  label,
  style,
}: BadgeProps): React.JSX.Element {
  let backgroundColor: string;
  let borderColor: string;
  let color: string;

  switch (tone) {
    case 'solid':
      backgroundColor = STATUS_BORDER[status];
      color = '#FFFFFF';
      borderColor = 'transparent';
      break;
    case 'outline':
      backgroundColor = 'transparent';
      color = STATUS_FG[status];
      borderColor = STATUS_BORDER[status];
      break;
    case 'soft':
    default:
      backgroundColor = STATUS_BG[status];
      color = STATUS_FG[status];
      borderColor = 'transparent';
      break;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth: tone === 'outline' ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
});
