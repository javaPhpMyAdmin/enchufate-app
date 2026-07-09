import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import type { Charger } from '@/data/types';

const MARKER_SIZE = 44;

export interface ChargerMarkerProps {
  charger: Charger;
  isSelected?: boolean;
}

/**
 * Custom map pin. Renders a status-colored rounded square with an EV bolt
 * centered. Animates scale-up when selected.
 *
 * This is a presentational component — it must be placed inside a
 * `react-native-maps` `<Marker>`, which is responsible for hit testing.
 */
export function ChargerMarker({
  charger,
  isSelected = false,
}: ChargerMarkerProps): React.JSX.Element {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const color = statusColor(theme, charger.status);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.18 : 1, {
      damping: 12,
      stiffness: 180,
    });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pin,
        {
          backgroundColor: color,
          borderColor: theme.colors.background,
          shadowColor: theme.colors.shadow,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
        ]}
      >
        <Zap color="#FFFFFF" size={22} fill="#FFFFFF" strokeWidth={1.5} />
      </View>
    </Animated.View>
  );
}

function statusColor(
  theme: ReturnType<typeof useTheme>,
  status: Charger['status'],
): string {
  switch (status) {
    case 'available':
      return theme.colors.chargerAvailable;
    case 'reserved':
      return theme.colors.chargerReserved;
    case 'busy':
      return theme.colors.chargerBusy;
  }
}

const styles = StyleSheet.create({
  pin: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inner: {
    width: MARKER_SIZE - 14,
    height: MARKER_SIZE - 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
