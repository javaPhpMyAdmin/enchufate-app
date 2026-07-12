/**
 * DurationPickerModal — modal that lets the host choose a duration
 * when toggling a charger to "busy".
 *
 * Shows horizontal chip options: 30 min, 1 h, 1.5 h, 2 h, 3 h.
 * Uses RN Animated (NOT Reanimated — Expo Go constraint).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/theme';

export const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '1.5 h', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
] as const;

export interface DurationPickerModalHandle {
  open: () => void;
  close: () => void;
}

interface DurationPickerModalProps {
  /** Called when the user confirms a duration. Receives selected minutes. */
  onConfirm: (minutes: number) => void;
}

export const DurationPickerModal = React.forwardRef<
  DurationPickerModalHandle,
  DurationPickerModalProps
>(function DurationPickerModal({ onConfirm }, ref) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(1); // default: 1 h
  const progress = useRef(new Animated.Value(0)).current;

  // Imperative handle.
  React.useImperativeHandle(
    ref,
    () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
    }),
    [],
  );

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

  const handleConfirm = useCallback(() => {
    const selected = DURATION_OPTIONS[selectedIndex] ?? DURATION_OPTIONS[1];
    setVisible(false);
    onConfirm(selected.minutes);
  }, [selectedIndex, onConfirm]);

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: '#000', opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVisible(false)}
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
              { color: theme.colors.text, marginBottom: 8 },
            ]}
          >
            Duración estimada
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginBottom: 20 },
            ]}
          >
            ¿Cuánto tiempo estimás que va a tardar?
          </Text>

          {/* Duration chips */}
          <View style={styles.chipsRow}>
            {DURATION_OPTIONS.map((opt, idx) => (
              <DurationChip
                key={opt.minutes}
                label={opt.label}
                selected={idx === selectedIndex}
                onPress={() => setSelectedIndex(idx)}
              />
            ))}
          </View>

          {/* Confirm button */}
          <Pressable
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={`Confirmar ${DURATION_OPTIONS[selectedIndex]?.label ?? ''}`}
            style={({ pressed }) => [
              styles.confirmButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.textOnPrimary },
              ]}
            >
              Confirmar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setVisible(false)}
            style={styles.cancelButton}
          >
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.primary },
              ]}
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
// Duration chip with RN Animated scale feedback
// ---------------------------------------------------------------------------

function DurationChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse on selection change.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selected, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[
          styles.chip,
          {
            backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        <Text
          style={[
            theme.typography.smallBold,
            { color: selected ? theme.colors.textOnPrimary : theme.colors.text },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

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
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
  },
  confirmButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
});
