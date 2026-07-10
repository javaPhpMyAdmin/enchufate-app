/**
 * Splash screen — first impression for any new or returning visitor.
 *
 * Replaces the old "welcome with CTAs" screen. Animates the brand
 * mark (scale up + back), shows a "Cargando..." with cycling dots and
 * a progress bar, then fades the screen out and replaces itself with
 * the (tabs) experience.
 *
 * Animation timing (parallel):
 *   - Logo scale: 1 → 1.25 (700ms, ease-out) → 1 (500ms, ease-in-out)
 *   - Progress bar: 0 → 100% over 2.2s
 *   - Dots: cycle 0,1,2,3 every 450ms
 *   - At 2.4s: screen fades to 0 over 500ms, then router.replace
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

const BRAND_LOGO = require('../../assets/icon.png');

const LOGO_SIZE = 140;
const LOGO_PEAK_SCALE = 1.7;
const LOGO_REST_SCALE = 1.4;
const LOGO_PEAK_DURATION = 800;
const LOGO_SETTLE_DURATION = 500;
const PROGRESS_DURATION = 3500;
const REDIRECT_AFTER = 3500;
const FADE_OUT_DURATION = 600;
const DOTS_INTERVAL = 450;

export default function WelcomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();

  const logoScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const screenOpacity = useSharedValue(1);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    // Logo: scale up to a peak, then settle at a larger-than-original
    // resting size. The "grow and return" feels like the icon is
    // arriving, but it stays bigger than scale 1.
    logoScale.value = withSequence(
      withTiming(LOGO_PEAK_SCALE, {
        duration: LOGO_PEAK_DURATION,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(LOGO_REST_SCALE, {
        duration: LOGO_SETTLE_DURATION,
        easing: Easing.inOut(Easing.quad),
      }),
    );

    // Progress bar fills over the splash duration.
    progressWidth.value = withTiming(1, {
      duration: PROGRESS_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });

    // Cycling dots ("Cargando.", "Cargando..", "Cargando...").
    const dotsInterval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, DOTS_INTERVAL);

    // After the splash plays, fade out and replace with the home tabs.
    const redirectTimer = setTimeout(() => {
      clearInterval(dotsInterval);
      screenOpacity.value = withTiming(
        0,
        { duration: FADE_OUT_DURATION, easing: Easing.in(Easing.quad) },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(router.replace)('/(tabs)');
          }
        },
      );
    }, REDIRECT_AFTER);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(redirectTimer);
    };
  }, [logoScale, progressWidth, screenOpacity, router]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.primary },
        screenAnimatedStyle,
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.content}>
        <Animated.Image
          source={BRAND_LOGO}
          style={[styles.brandMark, logoAnimatedStyle]}
          resizeMode="contain"
          accessibilityLabel="Enchufate"
        />
        <Text style={styles.loadingText}>
          {`Cargando${'.'.repeat(dots)}`}
        </Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, progressAnimatedStyle]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    gap: 32,
    width: '100%',
    maxWidth: 280,
  },
  brandMark: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
