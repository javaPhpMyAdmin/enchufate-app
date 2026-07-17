/**
 * ReservationConfirmDialog — simple modal to confirm a reservation request.
 *
 * Replaces the TimeSlotPicker flow. Shows "¿Quieres reservar este cargador?"
 * with Confirm/Cancel buttons. No time selection — scheduling is done via chat.
 *
 * Uses RN Animated (NOT Reanimated — Expo Go constraint).
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, X } from 'lucide-react-native';

import { reservationStore } from '@/data/reservationStore';
import { useTheme } from '@/theme';

export interface ReservationConfirmDialogProps {
  visible: boolean;
  chargerId: string;
  chargerTitle: string;
  ownerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationConfirmDialog({
  visible,
  chargerId,
  chargerTitle,
  ownerId,
  onClose,
  onSuccess,
}: ReservationConfirmDialogProps): React.JSX.Element {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await reservationStore.request(chargerId, chargerTitle, ownerId);
      setLoading(false);
      onSuccess();
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : 'No se pudo crear la solicitud',
      );
    }
  }, [chargerId, chargerTitle, ownerId, onSuccess]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.overlay, { opacity: fadeAnim }]}
      >
        <Pressable style={styles.overlayPress} onPress={onClose} />
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Cerrar"
          >
            <X color={theme.colors.textMuted} size={18} />
          </Pressable>

          {/* Icon */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.colors.primary + '15' },
            ]}
          >
            <Calendar color={theme.colors.primary} size={28} />
          </View>

          {/* Title */}
          <Text
            style={[
              theme.typography.h3,
              { color: theme.colors.text, marginTop: 16, textAlign: 'center' },
            ]}
          >
            Reservar cargador
          </Text>

          {/* Description */}
          <Text
            style={[
              theme.typography.body,
              {
                color: theme.colors.textMuted,
                marginTop: 8,
                textAlign: 'center',
                lineHeight: 22,
              },
            ]}
          >
            {`¿Quieres reservar ${chargerTitle}? El anfitrión recibirá tu solicitud y podrán coordinar los horarios por chat.`}
          </Text>

          {/* Error */}
          {error ? (
            <Text
              style={[
                theme.typography.small,
                {
                  color: theme.colors.danger,
                  marginTop: 12,
                  textAlign: 'center',
                },
              ]}
            >
              {error}
            </Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.buttonSecondary,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  opacity: pressed || loading ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  theme.typography.smallBold,
                  { color: theme.colors.text },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.buttonPrimary,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed || loading ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.textOnPrimary} size="small" />
              ) : (
                <Text
                  style={[
                    theme.typography.smallBold,
                    { color: theme.colors.textOnPrimary },
                  ]}
                >
                  Solicitar reserva
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPress: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonSecondary: {},
  buttonPrimary: {
    borderColor: 'transparent',
  },
});
