import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { List, Map as MapIcon, SlidersHorizontal, Crosshair } from 'lucide-react-native';

import { IconButton, iconButtonIconSize } from '@/components/ui';
import { useTheme } from '@/theme';

export type MapViewMode = 'map' | 'list';

export interface MapControlsProps {
  viewMode: MapViewMode;
  onToggleView: () => void;
  onFiltersPress: () => void;
  onMyLocationPress: () => void;
  hasUserLocation: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating controls overlay. Top-right: list/map toggle + filter. Bottom-right:
 * my-location FAB. All buttons hide on Android back-button by default — the
 * parent screen owns the gesture surface.
 */
export function MapControls({
  viewMode,
  onToggleView,
  onFiltersPress,
  onMyLocationPress,
  hasUserLocation,
  style,
}: MapControlsProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View pointerEvents="box-none" style={[styles.root, style]}>
      <View
        pointerEvents="box-none"
        style={[
          styles.topBar,
          { top: theme.spacing.md, right: theme.spacing.md, gap: 8 },
        ]}
      >
        <IconButton
          accessibilityLabel="Filtros"
          shape="square"
          size="md"
          variant="soft"
          onPress={onFiltersPress}
          icon={
            <SlidersHorizontal
              color={theme.colors.text}
              size={iconButtonIconSize.md}
            />
          }
        />
        <IconButton
          accessibilityLabel={viewMode === 'map' ? 'Ver lista' : 'Ver mapa'}
          shape="square"
          size="md"
          variant="soft"
          onPress={onToggleView}
          icon={
            viewMode === 'map' ? (
              <List color={theme.colors.text} size={iconButtonIconSize.md} />
            ) : (
              <MapIcon color={theme.colors.text} size={iconButtonIconSize.md} />
            )
          }
        />
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.fab,
          {
            bottom: theme.spacing.xl + 16,
            right: theme.spacing.md,
          },
        ]}
      >
        <IconButton
          accessibilityLabel="Mi ubicación"
          shape="circle"
          size="lg"
          variant="solid"
          onPress={onMyLocationPress}
          disabled={!hasUserLocation}
          icon={
            <Crosshair
              color="#FFFFFF"
              size={iconButtonIconSize.lg}
              strokeWidth={2.5}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    flexDirection: 'column',
  },
  fab: {
    position: 'absolute',
  },
});
