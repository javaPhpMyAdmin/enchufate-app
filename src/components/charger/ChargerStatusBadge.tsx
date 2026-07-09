/**
 * ChargerStatusBadge — a single source of truth for "how does a status look".
 *
 * The charger detail sheet and `ChargerCard` already use the generic
 * `Badge` primitive, but the owner dashboard needs a slightly more
 * prominent treatment (the badge sits at the top-right of a card, and it
 * must stay readable against the card's photo). This thin wrapper keeps
 * the color palette in one place.
 */
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { ChargerStatus } from '@/data/types';

export interface ChargerStatusBadgeProps {
  status: ChargerStatus;
  style?: StyleProp<ViewStyle>;
}

const LABEL: Record<ChargerStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  busy: 'Ocupado',
};

const PALETTE: Record<
  ChargerStatus,
  { bg: string; fg: string; border: string }
> = {
  available: { bg: '#D1FAE5', fg: '#047857', border: '#10B981' },
  reserved: { bg: '#FEF3C7', fg: '#92400E', border: '#F59E0B' },
  busy: { bg: '#E2E8F0', fg: '#475569', border: '#94A3B8' },
};

export function ChargerStatusBadge({
  status,
  style,
}: ChargerStatusBadgeProps): React.JSX.Element {
  const theme = useTheme();
  const colors = PALETTE[status];
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: theme.radii.full,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Estado ${LABEL[status]}`}
    >
      <Text style={[styles.label, { color: colors.fg }]} numberOfLines={1}>
        {LABEL[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
