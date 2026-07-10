import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';
import type { Charger } from '@/data/types';

const MARKER_SIZE = 56;
const ICON_SIZE = 26;
const BORDER_WIDTH = 3;

export interface ChargerMarkerProps {
  charger: Charger;
  isSelected?: boolean;
}

/**
 * Custom map pin. White circle with an orange charger icon (🔌) by
 * default; flips to a solid orange circle with a white icon when
 * `isSelected` is true — matches the brand reference for selected vs
 * unselected markers.
 *
 * Plain `View` + `Text` (with an emoji glyph) instead of an icon library
 * or `Image` because react-native-maps has well-known rendering issues
 * with both `<Image>` children and SVG children (lucide, etc.) inside
 * `<Marker>`. Emoji-as-text is the most reliable cross-platform option.
 */
export function ChargerMarkerImage({
  charger: _charger,
  isSelected = false,
}: ChargerMarkerProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.pin,
        isSelected ? styles.pinSelected : styles.pinUnselected,
      ]}
    >
      <Text
        style={[
          styles.icon,
          { color: isSelected ? '#FFFFFF' : theme.colors.primary },
        ]}
      >
        🔌
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF6600', // brand orange
  },
  pinSelected: {
    backgroundColor: '#FF6600', // brand orange
    borderColor: '#FF6600',
  },
  icon: {
    fontSize: ICON_SIZE,
  },
});
