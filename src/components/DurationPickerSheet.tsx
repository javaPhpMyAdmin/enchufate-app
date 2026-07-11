/**
 * DurationPickerSheet — bottom sheet that lets the host choose a duration
 * when toggling a charger to "busy".
 *
 * Shows horizontal chip options: 30 min, 1 h, 1.5 h, 2 h, 3 h.
 * Uses `@gorhom/bottom-sheet` consistent with the rest of the app.
 * RN Animated for selection feedback (NOT Reanimated — Expo Go constraint).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { useTheme } from '@/theme';

export const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '1.5 h', minutes: 90 },
  { label: '2 h', minutes: 120 },
  { label: '3 h', minutes: 180 },
] as const;

export interface DurationPickerSheetHandle {
  open: () => void;
  close: () => void;
}

interface DurationPickerSheetProps {
  /** Called when the user confirms a duration. Receives selected minutes. */
  onConfirm: (minutes: number) => void;
}

const SNAP_POINTS = ['38%'];

export const DurationPickerSheet = React.forwardRef<
  DurationPickerSheetHandle,
  DurationPickerSheetProps
>(function DurationPickerSheet({ onConfirm }, ref) {
  const theme = useTheme();
  const sheetRef = React.useRef<BottomSheet | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(1); // default: 1 h

  // Imperative handle.
  React.useImperativeHandle(
    ref,
    () => ({
      open: () => sheetRef.current?.snapToIndex(0),
      close: () => sheetRef.current?.close(),
    }),
    [],
  );

  const handleConfirm = useCallback(() => {
    const selected = DURATION_OPTIONS[selectedIndex] ?? DURATION_OPTIONS[1];
    sheetRef.current?.close();
    onConfirm(selected.minutes);
  }, [selectedIndex, onConfirm]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.borderStrong,
        width: 40,
      }}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
    >
      <BottomSheetView style={styles.content}>
        <Text
          style={[
            theme.typography.h3,
            { color: theme.colors.text, marginBottom: 16 },
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
      </BottomSheetView>
    </BottomSheet>
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
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

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
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
});
