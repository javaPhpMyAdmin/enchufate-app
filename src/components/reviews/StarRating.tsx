/**
 * StarRating — reusable 1-5 star rating input/display.
 *
 * Uses RN Animated API for a subtle pulse on tap (no Reanimated).
 */
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { useTheme } from '@/theme';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({
  value,
  onChange,
  size = 24,
  readonly = false,
}: StarRatingProps): React.JSX.Element {
  const theme = useTheme();
  const scales = useRef<Animated.Value[]>(
    [1, 2, 3, 4, 5].map(() => new Animated.Value(1)),
  ).current;

  const handlePress = useCallback(
    (star: number) => {
      if (readonly) return;
      onChange?.(star);

      // Pulse the selected star.
      const scale = scales[star - 1];
      if (!scale) return;
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [readonly, onChange, scales],
  );

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Animated.View
          key={star}
          style={{ transform: [{ scale: scales[star - 1] ?? new Animated.Value(1) }] }}
        >
          <Pressable
            onPress={() => handlePress(star)}
            disabled={readonly}
            style={styles.star}
            accessibilityRole="button"
            accessibilityLabel={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
          >
            <Star
              size={size}
              color={star <= value ? theme.colors.warning : theme.colors.border}
              fill={star <= value ? theme.colors.warning : 'transparent'}
            />
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    padding: 2,
  },
});
