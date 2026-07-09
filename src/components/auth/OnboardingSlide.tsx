/**
 * OnboardingSlide — one of the three slides in the onboarding pager.
 *
 * Centers an icon inside a soft bubble and renders the title + subtitle
 * underneath. The host (onboarding screen) controls layout, pagination and
 * dots.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface OnboardingSlideProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function OnboardingSlide({
  icon: Icon,
  title,
  subtitle,
}: OnboardingSlideProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBubble,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Icon
          color={theme.colors.primary}
          size={56}
          strokeWidth={1.6}
        />
      </View>
      <Text
        style={[
          theme.typography.h1,
          {
            color: theme.colors.text,
            marginTop: theme.spacing.xl,
            textAlign: 'center',
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          theme.typography.body,
          {
            color: theme.colors.textMuted,
            marginTop: theme.spacing.sm,
            textAlign: 'center',
            maxWidth: 320,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
