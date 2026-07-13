import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';

import type { Charger, LatLng } from '@/data/types';
import { useTheme } from '@/theme';

const chargerPin = require('../../../assets/cargador.png');

export interface ChargerMapHandle {
  /** Animate the camera to the given coordinates. */
  animateTo: (coords: LatLng, zoomDelta?: number) => void;
  /** Animate the camera to fit all chargers + (optional) user location. */
  fitToChargers: (chargers: Charger[], userLocation?: LatLng | null) => void;
}

export interface ChargerMapProps {
  chargers: Charger[];
  selectedId?: string | null;
  onSelectCharger: (id: string) => void;
  userLocation?: LatLng | null;
  initialRegion?: Region;
}

const DEFAULT_REGION: Region = {
  // Montevideo, Uruguay — center of the brand's home market.
  // ~0.18° delta ≈ 18 km wide, shows most of Montevideo + surroundings.
  latitude: -34.9036,
  longitude: -56.158,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

const PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

export const ChargerMap = React.memo(forwardRef<ChargerMapHandle, ChargerMapProps>(
  function ChargerMap(
    { chargers, selectedId, onSelectCharger, userLocation, initialRegion },
    ref,
  ) {
    const theme = useTheme();
    const underlyingMapRef = useRef<MapView | null>(null);

    const captureMapRef = useCallback((map: any) => {
      underlyingMapRef.current = map as MapView;
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        animateTo: (coords, zoomDelta) => {
          underlyingMapRef.current?.animateCamera(
            {
              center: coords,
              zoom: zoomDelta !== undefined ? 15 + zoomDelta : undefined,
            },
            { duration: 400 },
          );
        },
        fitToChargers: (list, userLoc) => {
          if (list.length === 0 && !userLoc) return;
          const coords: LatLng[] = list.map((c) => c.location);
          if (userLoc) coords.push(userLoc);
          if (coords.length === 1) {
            const only = coords[0]!;
            underlyingMapRef.current?.animateCamera(
              {
                center: only,
                zoom: 14,
              },
              { duration: 400 },
            );
            return;
          }
          underlyingMapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 80, bottom: 240, left: 80 },
            animated: true,
          });
        },
      }),
      [],
    );

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.surfaceAlt },
        ]}
      >
        <ClusteredMapView
          ref={captureMapRef}
          provider={PROVIDER}
          style={styles.map}
          initialRegion={initialRegion ?? DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
          loadingEnabled
          loadingBackgroundColor={theme.colors.surface}
          loadingIndicatorColor={theme.colors.primary}
          radius={50}
          minZoom={1}
          maxZoom={20}
          clusterColor={theme.colors.primary}
          clusterTextColor="#FFFFFF"
        >
          {chargers.map((c) => (
            <Marker
              key={c.id}
              identifier={c.id}
              coordinate={c.location}
              onPress={() => onSelectCharger(c.id)}
              image={chargerPin}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={selectedId === c.id ? 99 : 1}
            />
          ))}
        </ClusteredMapView>
      </View>
    );
  },
));

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
