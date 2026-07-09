/**
 * `<TypingIndicator />` — three animated dots rendered inside an
 * incoming-bubble-styled container.
 *
 * Uses Reanimated 3 for a smooth scale + opacity loop. The animation
 * is staggered per-dot so the dots bounce in a wave rather than
 * pulsing in unison. Loop is infinite; the parent decides when to
 * mount/unmount.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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
        <Dot
          key={idx}
          color={theme.colors.textMuted}
          index={idx}
        />
      ))}
    </View>
  );
}

interface DotProps {
  color: string;
  index: number;
}

function Dot({ color, index }: DotProps): React.JSX.Element {
  const progress = useSharedValue<number>(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: ANIM_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: ANIM_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [progress]);

  // Stagger each dot so they bounce in a wave rather than in unison.
  useEffect(() => {
    progress.value = withDelay(index * STAGGER_MS, progress.value);
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * progress.value,
    transform: [{ scale: 0.85 + 0.35 * progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        animatedStyle,
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
