/**
 * Step 2 — Ubicación.
 *
 * Uses GPS + reverse geocoding to auto-fill the address. The user can
 * edit the address text. GPS coordinates are the source of truth for
 * the map marker; the address text is for display and search.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';

import { TextField } from '@/components/ui';
import { PublishGateBanner, WizardFooter } from '@/components/publish';
import { usePublishDraft } from '@/features/publish';
import type { LatLng } from '@/data/types';
import { useTheme } from '@/theme';

export default function Step2Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update } = usePublishDraft();
  const [location, setLocation] = useState<LatLng | null>(
    draft.step2?.location ?? null,
  );
  const [address, setAddress] = useState<string>(draft.step2?.address ?? '');
  const [locating, setLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect GPS location + reverse geocode on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) {
          setError('Dale permisos de ubicación para auto-completar la dirección.');
          setLocating(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const coords: LatLng = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);

        // Reverse geocode to get a human-readable address.
        const [geo] = await Location.reverseGeocodeAsync(coords);
        if (cancelled) return;

        let detectedAddress = '';
        if (geo) {
          const parts = [
            geo.street,
            geo.streetNumber,
            geo.district,
            geo.city,
            geo.region,
          ].filter(Boolean);
          const addr = parts.join(', ');
          if (addr.length > 0) {
            detectedAddress = addr;
            setAddress(addr);
          }
        }
        update(2, { location: coords, address: detectedAddress });
      } catch (err) {
        console.warn('[publish-step2] GPS error', err);
        setError('No pudimos obtener tu ubicación. Ingresá la dirección manualmente.');
      } finally {
        if (!cancelled) setLocating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [update]);

  const handleNext = (): void => {
    if (!location) {
      setError('Esperá a que se detecte tu ubicación o ingresá una dirección.');
      return;
    }
    if (address.trim().length < 3) {
      setError('Ingresá una dirección o referencia corta.');
      return;
    }
    setError(null);
    update(2, { location, address });
    router.replace('/publish/specs');
  };

  const handleAddressBlur = (): void => {
    update(2, { location: location ?? undefined, address });
  };

  const valid = location !== null && address.trim().length >= 3;

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
            Detectamos tu ubicación automáticamente. Si es necesario, editá
            la dirección.
          </Text>
        </View>

        {/* Location status card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing.md,
            },
          ]}
        >
          {locating ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textMuted, marginLeft: 10 },
                ]}
              >
                Detectando ubicación...
              </Text>
            </View>
          ) : location ? (
            <View style={styles.statusRow}>
              <MapPin color={theme.colors.primary} size={20} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text
                  style={[theme.typography.smallBold, { color: theme.colors.text }]}
                >
                  Ubicación detectada
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted, marginTop: 2 },
                  ]}
                >
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <MapPin color={theme.colors.textMuted} size={20} />
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textMuted, marginLeft: 10 },
                ]}
              >
                Sin ubicación aún
              </Text>
            </View>
          )}
        </View>

        <TextField
          label="Dirección"
          value={address}
          onChangeText={setAddress}
          onBlur={handleAddressBlur}
          placeholder="Ej: Av. 18 de Julio 1234, Montevideo"
          maxLength={140}
          error={error ?? undefined}
          helper="La dirección se usa para que los conductores te encuentren."
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
          nextLabel="Siguiente"
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
  statusCard: {
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
