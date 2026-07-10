import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { Charger } from '@/data/types';

const ICON_SIZE = 64;
// DIAGNOSTIC: temporarily use icon.png to confirm the marker works with
// any image. If this renders, the issue is specifically cargador.png
// (probably its 2000x2000 size).
const CHARGER_ICON = require('../../../assets/icon.png');

export interface ChargerMarkerProps {
  charger: Charger;
  isSelected?: boolean;
}

/**
 * Custom map pin. Plain `View` + `Image`, no animations.
 *
 * Diagnostic version: the previous `Animated.Image` (reanimated) version
 * did not render inside `react-native-maps` <Marker>. This stripped-down
 * version uses a plain `Image` to confirm the asset itself loads and
 * renders. If the chargers appear with this version, the issue is the
 * reanimated `Animated.Image` integration, not the asset.
 *
 * TODO: re-introduce the scale-on-select animation using a technique
 * that works inside <Marker> (e.g. `useState`-driven re-render with
 * `tracksViewChanges={true}`, or a separate overlay for the selected
 * state).
 */
export function ChargerMarker({
  charger,
}: ChargerMarkerProps): React.JSX.Element {
  const statusLabel =
    charger.status === 'available'
      ? 'disponible'
      : charger.status === 'reserved'
      ? 'reservado'
      : 'ocupado';

  return (
    <View style={styles.pin}>
      <Image
        source={CHARGER_ICON}
        style={styles.icon}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Cargador ${statusLabel}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    // DIAGNOSTIC: temporary red background to confirm the marker renders.
    // Remove once the image is confirmed working.
    backgroundColor: 'red',
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
