/**
 * WizardProgress — top-of-screen progress indicator.
 *
 * Renders a slim bar that fills from 0 → 100% across the 7 steps, with a
 * `Paso X de 7` label and the current step's name. The fill animates with
 * Reanimated so jumping between steps feels smooth.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { WIZARD_STEP_NAMES, type WizardStep } from '@/features/publish';

export interface WizardProgressProps {
  currentStep: WizardStep;
  totalSteps?: number;
}

export function WizardProgress({
  currentStep,
  totalSteps = 7,
}: WizardProgressProps): React.JSX.Element {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(currentStep / totalSteps, { duration: 240 });
  }, [currentStep, totalSteps, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text
          style={[theme.typography.caption, { color: theme.colors.textMuted }]}
        >
          Paso {currentStep} de {totalSteps}
        </Text>
        <Text
          style={[theme.typography.caption, { color: theme.colors.textMuted }]}
          numberOfLines={1}
        >
          {WIZARD_STEP_NAMES[currentStep]}
        </Text>
      </View>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.surfaceAlt },
        ]}
      >
        <Animated.View
          style={[styles.fill, { backgroundColor: theme.colors.primary }, fillStyle]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
