import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import type { Charger, LatLng } from '@/data/types';
import { useTheme } from '@/theme';

const chargerPin = require('../../../assets/cargador.png');

/* ------------------------------------------------------------------ */
/*  Animated Marker — safe for Android Google Maps because we animate  */
/*  the coordinate prop, NOT React Native children inside the Marker.  */
/* ------------------------------------------------------------------ */

const AnimatedMarker = Animated.createAnimatedComponent(Marker);

/** How high the marker "jumps" in latitude degrees (~30 m). */
const BOUNCE_AMPLITUDE = 0.00028;
/** Duration of one full bounce cycle in ms. */
const BOUNCE_PERIOD = 1200;
/** Total bounce duration in ms. */
const BOUNCE_DURATION = 5000;

export interface ChargerMapHandle {
  animateTo: (coords: LatLng, zoomDelta?: number) => void;
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
    const mapRef = useRef<MapView | null>(null);
    const bounceAnim = useRef(new Animated.Value(0)).current;

    // Drive the bounce animation for the selected charger.
    useEffect(() => {
      if (!selectedId) {
        bounceAnim.setValue(0);
        return;
      }

      bounceAnim.setValue(0);

      const bounce = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: BOUNCE_PERIOD / 2,
            useNativeDriver: false,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: BOUNCE_PERIOD / 2,
            useNativeDriver: false,
          }),
        ]),
      );

      bounce.start();

      const timer = setTimeout(() => {
        bounce.stop();
        bounceAnim.setValue(0);
      }, BOUNCE_DURATION);

      return () => {
        bounce.stop();
        clearTimeout(timer);
        bounceAnim.setValue(0);
      };
    }, [selectedId, bounceAnim]);

    useImperativeHandle(
      ref,
      () => ({
        animateTo: (coords, zoomDelta) => {
          mapRef.current?.animateCamera(
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
            mapRef.current?.animateCamera(
              { center: only, zoom: 14 },
              { duration: 400 },
            );
            return;
          }
          mapRef.current?.fitToCoordinates(coords, {
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
        <MapView
          ref={mapRef}
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
        >
          {chargers.map((c) => {
            const isSelected = selectedId === c.id;

            if (isSelected) {
              // Interpolate bounce value (0→1→0) directly to latitude range.
              const animatedLatitude = bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  c.location.latitude,
                  c.location.latitude - BOUNCE_AMPLITUDE,
                ],
              });

              return (
                <AnimatedMarker
                  key={c.id}
                  identifier={c.id}
                  coordinate={{
                    latitude: animatedLatitude,
                    longitude: c.location.longitude,
                  }}
                  onPress={() => onSelectCharger(c.id)}
                  image={chargerPin}
                  anchor={{ x: 0.5, y: 0.5 }}
                  zIndex={99}
                />
              );
            }

            return (
              <Marker
                key={c.id}
                identifier={c.id}
                coordinate={c.location}
                onPress={() => onSelectCharger(c.id)}
                image={chargerPin}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={1}
              />
            );
          })}
        </MapView>
      </View>
    );
  },
));

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
