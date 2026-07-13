/**
 * SplashOverlay — branded splash that sits ON TOP of the Stack.
 *
 * Pattern borrowed from the Umpi project: the Stack always renders
 * (no conditional mounting), and this overlay covers everything while
 * the auth session hydrates. Once auth is ready AND the minimum display
 * time has elapsed, the overlay fades out and calls `onFinish`.
 *
 * Animation (all RN Animated, no Reanimated):
 *   - Logo: pulse loop (0.92 → 1.12 → 0.92, 900ms each)
 *   - Dots: cycle 0–3 every 400ms
 *   - Progress bar: indeterminate fill/empty loop (1500ms each)
 *   - Exit: fade to 0 over 600ms, then onFinish()
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth';

const BRAND_LOGO = require('../../assets/icon.png');

const TOTAL_DOTS = 3;
const MIN_DISPLAY_MS = 3000;
const EXIT_DURATION = 600;

interface SplashOverlayProps {
  onFinish: () => void;
}

export function SplashOverlay({ onFinish }: SplashOverlayProps): React.JSX.Element {
  const { status, onboardingSeen } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState(0);
  const finishingRef = useRef(false);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Logo pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => scaleAnim.stopAnimation();
  }, [scaleAnim]);

  // Cycling dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % (TOTAL_DOTS + 1));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Indeterminate progress bar (fill → empty loop)
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(barProgress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(barProgress, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [barProgress]);

  // Exit when auth loaded + minimum time passed
  const authReady = status !== 'loading' && onboardingSeen !== null;
  const ready = authReady && minTimePassed;

  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    if (!ready || finishingRef.current) return;
    finishingRef.current = true;

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      handleFinish();
    });
  }, [ready, containerOpacity, handleFinish]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.container, { opacity: containerOpacity }]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Image
          source={BRAND_LOGO}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.loadingRow}>
        <Text style={styles.loadingText}>Cargando</Text>
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
          <Text
            key={i}
            style={[styles.dot, { opacity: i < dots ? 1 : 0.2 }]}
          >
            .
          </Text>
        ))}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: barProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 36,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 48,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dot: {
    fontSize: 32,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 26,
  },
  progressTrack: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 28,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 3,
  },
});
