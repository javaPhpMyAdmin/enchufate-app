import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Charger } from '@/data/types';

export interface ChargerMarkerProps {
  charger: Charger;
  isSelected?: boolean;
}

/** Absolute minimum — plain white square. */
export function ChargerMarkerImage({
  charger: _charger,
  isSelected = false,
}: ChargerMarkerProps): React.JSX.Element {
  return <View style={styles.square} />;
}

const styles = StyleSheet.create({
  square: {
    width: 150,
    height: 150,
    borderWidth: 5,
    borderColor: '#FF6600',
    backgroundColor: '#FFFFFF',
  },
});
