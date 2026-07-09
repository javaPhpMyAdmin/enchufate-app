/**
 * OnboardingDots — animated pagination indicator for the onboarding pager.
 *
 * The active dot stretches to a wider pill so the active slide is obvious
 * at a glance, matching the visual language of common EV / mobility apps.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export interface OnboardingDotsProps {
  count: number;
  activeIndex: number;
}

const ACTIVE_WIDTH = 24;
const INACTIVE_WIDTH = 8;
const DOT_HEIGHT = 8;
const ANIMATION_MS = 220;

export function OnboardingDots({
  count,
  activeIndex,
}: OnboardingDotsProps): React.JSX.Element {
  const theme = useTheme();
  // Keep one Animated.Value per dot. We rebuild when `count` changes.
  const widths = useRef<Animated.Value[]>([]);
  const opacities = useRef<Animated.Value[]>([]);
  if (widths.current.length !== count) {
    widths.current = Array.from(
      { length: count },
      (_, i) => new Animated.Value(i === activeIndex ? ACTIVE_WIDTH : INACTIVE_WIDTH),
    );
    opacities.current = Array.from(
      { length: count },
      (_, i) => new Animated.Value(i === activeIndex ? 1 : 0.4),
    );
  }

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    widths.current.forEach((value, i) => {
      animations.push(
        Animated.timing(value, {
          toValue: i === activeIndex ? ACTIVE_WIDTH : INACTIVE_WIDTH,
          duration: ANIMATION_MS,
          useNativeDriver: false,
        }),
      );
    });
    opacities.current.forEach((value, i) => {
      animations.push(
        Animated.timing(value, {
          toValue: i === activeIndex ? 1 : 0.4,
          duration: ANIMATION_MS,
          useNativeDriver: false,
        }),
      );
    });
    Animated.parallel(animations).start();
  }, [activeIndex, count]);

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: widths.current[i],
              opacity: opacities.current[i],
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: DOT_HEIGHT,
    borderRadius: DOT_HEIGHT / 2,
  },
});
