/**
 * Step 2 — Ubicación.
 *
 * On mount we ask for the foreground location permission and seed the
 * map at the user's coordinates. The user can then drag the pin to
 * refine the spot, and type a free-form address in the text field. The
 * pin is the source of truth; the address is for display.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Crosshair } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import { TextField } from '@/components/ui';
import { PublishGateBanner, WizardFooter } from '@/components/publish';
import { usePublishDraft } from '@/features/publish';
import type { LatLng } from '@/data/types';
import { useTheme } from '@/theme';

const DEFAULT_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export default function Step2Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update, isStepValid } = usePublishDraft();
  const mapRef = React.useRef<MapView | null>(null);
  const [location, setLocation] = useState<LatLng | null>(
    draft.step2?.location ?? null,
  );
  const [address, setAddress] = useState<string>(draft.step2?.address ?? '');
  const [locating, setLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    update(2, { location: location ?? undefined, address });
  }, [location, address, update]);

  const handleUseMyLocation = async (): Promise<void> => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Necesitamos tu ubicación para centrar el mapa.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LatLng = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);
      mapRef.current?.animateCamera(
        { center: coords, zoom: 15 },
        { duration: 400 },
      );
    } catch (err) {
      console.warn('[publish-step2] location error', err);
      setError('No pudimos obtener tu ubicación. Tirá el pin manualmente.');
    } finally {
      setLocating(false);
    }
  };

  const handleNext = (): void => {
    if (!location) {
      setError('Tocá "Usar mi ubicación" o arrastrá el pin en el mapa.');
      return;
    }
    if (address.trim().length < 3) {
      setError('Ingresá una dirección o referencia corta.');
      return;
    }
    setError(null);
    router.push('/publish/specs');
  };

  const valid = isStepValid(2);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
      >
        <PublishGateBanner />

        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            ¿Dónde está tu cargador?
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Centrá el mapa y ajustá el pin en la ubicación exacta.
          </Text>
        </View>

        <View
          style={[
            styles.mapWrap,
            {
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceAlt,
            },
          ]}
        >
          <MapView
            ref={mapRef}
            provider={
              Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)}
            showsUserLocation
            toolbarEnabled={false}
            loadingEnabled
          >
            {location ? (
              <Marker
                coordinate={location}
                draggable
                onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)}
              />
            ) : null}
          </MapView>
          <Pressable
            onPress={() => void handleUseMyLocation()}
            accessibilityRole="button"
            accessibilityLabel="Usar mi ubicación"
            style={({ pressed }) => [
              styles.locateButton,
              {
                backgroundColor: theme.colors.background,
                borderRadius: theme.radii.full,
                opacity: pressed ? 0.8 : 1,
              },
              theme.shadows.md,
            ]}
          >
            {locating ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Crosshair color={theme.colors.primary} size={18} />
            )}
          </Pressable>
        </View>

        <TextField
          label="Dirección o referencia"
          value={address}
          onChangeText={setAddress}
          placeholder="Ej: Malabia 1450, Palermo"
          maxLength={140}
          error={error ?? undefined}
          helper="El pin queda como la ubicación exacta; el texto ayuda a los conductores."
          autoCapitalize="words"
        />
      </View>
      <View
        style={[
          styles.footerBar,
          {
            borderTopColor: theme.colors.border,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <WizardFooter
          canGoBack
          canGoNext={valid}
          onBack={() => router.back()}
          onNext={handleNext}
          isSubmitting={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
  },
  mapWrap: {
    height: 240,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  locateButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
