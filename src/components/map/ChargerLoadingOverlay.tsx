/**
 * Full-screen loading overlay shown on first charger fetch.
 *
 * Uses React Native's Animated API (NOT Reanimated — Expo Go crashes with it).
 * Shows a pulsing + spinning Zap icon with a Spanish loading message.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useTheme } from '@/theme';

export function ChargerLoadingOverlay(): React.JSX.Element {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse: scale 1 → 1.2 → 1, looping
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Spin: rotate 0 → 360, looping
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ).start();
  }, [pulseAnim, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            ...theme.shadows.md,
          },
        ]}
      >
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }, { rotate: spin }] }}
        >
          <Zap color={theme.colors.primary} size={32} />
        </Animated.View>
        <Text
          style={[
            theme.typography.bodyBold,
            { color: theme.colors.text, marginTop: 12 },
          ]}
        >
          Obteniendo cargadores...
        </Text>
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.textMuted, marginTop: 4 },
          ]}
        >
          Un momento por favor
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
  },
});
