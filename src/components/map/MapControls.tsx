import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
  hasActiveFilters: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating controls overlay. Top-right: filter pill + list/map toggle. Bottom-right:
 * my-location FAB. All buttons hide on Android back-button by default — the
 * parent screen owns the gesture surface.
 */
export function MapControls({
  viewMode,
  onToggleView,
  onFiltersPress,
  onMyLocationPress,
  hasUserLocation,
  hasActiveFilters,
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
        {/* Filter pill — always visible, brand orange when active */}
        <Pressable
          onPress={onFiltersPress}
          accessibilityLabel="Filtros"
          style={[
            styles.filterPill,
            {
              backgroundColor: hasActiveFilters
                ? theme.colors.primary
                : theme.colors.background,
              borderColor: hasActiveFilters
                ? theme.colors.primary
                : theme.colors.border,
              ...(hasActiveFilters
                ? theme.shadows.md
                : theme.shadows.sm),
            },
          ]}
        >
          <SlidersHorizontal
            color={hasActiveFilters ? '#FFFFFF' : theme.colors.text}
            size={16}
            strokeWidth={2.5}
          />
          <Text
            style={[
              theme.typography.bodyBold,
              {
                color: hasActiveFilters
                  ? '#FFFFFF'
                  : theme.colors.text,
                fontSize: 13,
              },
            ]}
          >
            Filtros
          </Text>
          {hasActiveFilters && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>!</Text>
            </View>
          )}
        </Pressable>

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
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  badge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  badgeText: {
    color: '#FF6600',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 14,
  },
  fab: {
    position: 'absolute',
  },
});
