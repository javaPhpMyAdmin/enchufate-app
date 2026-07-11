/**
 * `<TypingIndicator />` — three animated dots rendered inside an
 * incoming-bubble-styled container.
 *
 * Uses React Native's built-in `Animated` API for a smooth opacity
 * loop. The animation is staggered per-dot so the dots pulse in a
 * wave. Loop is infinite; the parent decides when to mount/unmount.
 *
 * NOTE: We switched away from Reanimated 4 to avoid
 * "Cannot create property 'reduceMotion' on number" errors in Expo Go.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const DOT_COUNT = 3;
const DOT_SIZE = 6;
const DOT_GAP = 4;
const ANIM_DURATION_MS = 600;
const STAGGER_MS = 160;

export function TypingIndicator(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel="Escribiendo"
    >
      {Array.from({ length: DOT_COUNT }).map((_, idx) => (
        <Dot key={idx} color={theme.colors.textMuted} index={idx} />
      ))}
    </View>
  );
}

interface DotProps {
  color: string;
  index: number;
}

function Dot({ color, index }: DotProps): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIM_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: ANIM_DURATION_MS,
          useNativeDriver: true,
        }),
      ]),
    );

    // Stagger: delay each dot by `index * STAGGER_MS`.
    const timeout = setTimeout(() => anim.start(), index * STAGGER_MS);

    return () => {
      clearTimeout(timeout);
      anim.stop();
    };
  }, [opacity, index]);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
