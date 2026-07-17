/**
 * TimeSlotPicker — modal that lets a driver pick a time slot and
 * duration to reserve a charger.
 *
 * Flow:
 *   1. Duration chips (1h / 2h / 4h)
 *   2. Start-time selector (scrollable list of valid slots based on charger schedule)
 *   3. Price estimate display
 *   4. Confirm → calls reservationStore.create() → closes
 *
 * Uses RN Animated (NOT Reanimated — Expo Go constraint).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Clock, Zap, AlertCircle } from 'lucide-react-native';

import type { DaySchedule } from '@/data/types';
import { reservationStore } from '@/data/reservationStore';
import { getChargerReservations } from '@/lib/reservationService';
import { formatPrice, formatPower } from '@/lib/format';
import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DURATION_OPTIONS = [
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '4 h', minutes: 240 },
] as const;

const SLOT_STEP_MINUTES = 30; // slots every 30 minutes

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TimeSlotPickerHandle {
  open: () => void;
  close: () => void;
}

interface TimeSlotPickerProps {
  chargerId: string;
  pricePerHour: number;
  schedule?: DaySchedule[];
  /** Called after successful reservation creation. */
  onReserved?: () => void;
}

export const TimeSlotPicker = React.forwardRef<
  TimeSlotPickerHandle,
  TimeSlotPickerProps
>(function TimeSlotPicker({ chargerId, pricePerHour, schedule, onReserved }, ref) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [durationIndex, setDurationIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReservations, setExistingReservations] = useState<{ startTime: string; endTime: string }[]>([]);
  const progress = useRef(new Animated.Value(0)).current;

  React.useImperativeHandle(ref, () => ({
    open: () => {
      setVisible(true);
      setSelectedSlot(null);
      setError(null);
      // Fetch existing reservations for this charger to filter occupied slots
      getChargerReservations(chargerId).then(setExistingReservations).catch(() => {});
    },
    close: () => setVisible(false),
  }));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const cardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  // ---------------------------------------------------------------------------
  // Available time slots based on charger schedule
  // ---------------------------------------------------------------------------

  const availableSlots = useMemo(() => {
    // Default schedule: every day 08:00–22:00 when charger has no schedule set
    const effectiveSchedule = schedule?.length
      ? schedule
      : ([0, 1, 2, 3, 4, 5, 6].map((day) => ({
          day,
          enabled: true,
          startTime: '08:00',
          endTime: '22:00',
        })) as DaySchedule[]);

    const opt = DURATION_OPTIONS[durationIndex];
    if (!opt) return [];
    const durationMinutes = opt.minutes;
    const now = new Date();
    const slots: { label: string; startTime: Date; endTime: Date }[] = [];

    // Generate slots for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();

      const daySchedule = effectiveSchedule.find((d) => d.day === dayOfWeek);
      if (!daySchedule || !daySchedule.enabled) continue;

      const startParts = daySchedule.startTime.split(':').map(Number);
      const endParts = daySchedule.endTime.split(':').map(Number);
      const startH = startParts[0] ?? 0;
      const startM = startParts[1] ?? 0;
      const endH = endParts[0] ?? 0;
      const endM = endParts[1] ?? 0;

      const slotDate = new Date(date);
      slotDate.setHours(startH, startM, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(endH, endM, 0, 0);

      while (true) {
        const slotEnd = new Date(slotDate.getTime() + durationMinutes * 60_000);

        // Skip slots that are in the past or overlap with the end of day
        if (slotEnd > dayEnd) break;
        if (slotDate <= now) {
          slotDate.setTime(slotDate.getTime() + SLOT_STEP_MINUTES * 60_000);
          continue;
        }

        // Skip slots that overlap with existing confirmed reservations
        const overlaps = existingReservations.some((res) => {
          const resStart = new Date(res.startTime).getTime();
          const resEnd = new Date(res.endTime).getTime();
          return slotDate.getTime() < resEnd && slotEnd.getTime() > resStart;
        });
        if (overlaps) {
          slotDate.setTime(slotDate.getTime() + SLOT_STEP_MINUTES * 60_000);
          continue;
        }

        const label = `${slotDate.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })}  ${slotDate.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} – ${slotEnd.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`;

        slots.push({
          label,
          startTime: new Date(slotDate),
          endTime: new Date(slotEnd),
        });

        slotDate.setTime(slotDate.getTime() + SLOT_STEP_MINUTES * 60_000);
      }
    }

    return slots;
  }, [schedule, durationIndex, existingReservations]);

  // ---------------------------------------------------------------------------
  // Price estimate
  // ---------------------------------------------------------------------------

  const durationMinutes = DURATION_OPTIONS[durationIndex]?.minutes ?? 60;
  const priceEstimate = (durationMinutes / 60) * pricePerHour;

  // ---------------------------------------------------------------------------
  // Confirm
  // ---------------------------------------------------------------------------

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) return;

    const slot = availableSlots.find((s) => s.label === selectedSlot);
    if (!slot) return;

    setLoading(true);
    setError(null);

    try {
      await reservationStore.create(
        chargerId,
        slot.startTime.toISOString(),
        slot.endTime.toISOString(),
      );
      setVisible(false);
      onReserved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la reserva';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedSlot, availableSlots, chargerId, onReserved]);

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => !loading && setVisible(false)}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: '#000', opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !loading && setVisible(false)}
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.xl,
            },
            theme.shadows.lg,
            { opacity: progress, transform: [{ scale: cardScale }] },
          ]}
        >
          <Text
            style={[
              theme.typography.h3,
              { color: theme.colors.text, marginBottom: 4 },
            ]}
          >
            Reservar cargador
          </Text>

          {/* Duration picker */}
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginBottom: 8 },
            ]}
          >
            DURACIÓN
          </Text>
          <View style={styles.chipsRow}>
            {DURATION_OPTIONS.map((opt, idx) => (
              <Pressable
                key={opt.minutes}
                onPress={() => {
                  setDurationIndex(idx);
                  setSelectedSlot(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: idx === durationIndex }}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      idx === durationIndex
                        ? theme.colors.primary
                        : theme.colors.surface,
                    borderColor:
                      idx === durationIndex
                        ? theme.colors.primary
                        : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    theme.typography.smallBold,
                    {
                      color:
                        idx === durationIndex
                          ? theme.colors.textOnPrimary
                          : theme.colors.text,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price estimate */}
          <View style={styles.priceRow}>
            <Zap color={theme.colors.textMuted} size={14} />
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted, marginLeft: 4 },
              ]}
            >
              {`${formatPower(0).split(' ')[0]} kW · ${formatPrice(pricePerHour)} · Estimado: $${priceEstimate.toFixed(2)}`}
            </Text>
          </View>

          {/* Time slot selector */}
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginBottom: 8, marginTop: 16 },
            ]}
          >
            HORARIO DISPONIBLE
          </Text>

          {availableSlots.length === 0 ? (
            <View style={styles.emptySlots}>
              <Clock color={theme.colors.textMuted} size={20} />
              <Text
                style={[
                  theme.typography.small,
                  { color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
                ]}
              >
                No hay horarios disponibles para esta duración en los próximos 7 días.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.slotScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {availableSlots.map((slot) => {
                const isSelected = slot.label === selectedSlot;
                return (
                  <Pressable
                    key={slot.label}
                    onPress={() => setSelectedSlot(slot.label)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.slotOption,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary + '15'
                          : theme.colors.surface,
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Clock
                      color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                      size={14}
                    />
                    <Text
                      style={[
                        theme.typography.small,
                        {
                          color: isSelected ? theme.colors.primary : theme.colors.text,
                          marginLeft: 8,
                          flex: 1,
                        },
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <AlertCircle color={theme.colors.danger} size={14} />
              <Text
                style={[
                  theme.typography.small,
                  { color: theme.colors.danger, marginLeft: 4, flex: 1 },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Confirm */}
          <Pressable
            onPress={handleConfirm}
            disabled={!selectedSlot || loading}
            accessibilityRole="button"
            accessibilityLabel="Confirmar reserva"
            style={({ pressed }) => [
              styles.confirmButton,
              {
                backgroundColor:
                  selectedSlot && !loading
                    ? theme.colors.primary
                    : theme.colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.textOnPrimary} size="small" />
            ) : (
              <Text
                style={[
                  theme.typography.bodyBold,
                  {
                    color:
                      selectedSlot && !loading
                        ? theme.colors.textOnPrimary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                Confirmar reserva
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => !loading && setVisible(false)}
            style={styles.cancelButton}
          >
            <Text
              style={[theme.typography.body, { color: theme.colors.primary }]}
            >
              Cancelar
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </RNModal>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 28,
    maxHeight: '80%',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  slotScroll: {
    maxHeight: 200,
    marginBottom: 12,
  },
  slotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  emptySlots: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
});
