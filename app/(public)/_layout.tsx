import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Layout for the (public) route group — welcome, onboarding, login, register.
 *
 * No tab bar is rendered here. Headers are hidden; each screen owns its
 * own top bar (e.g. the "Saltar" link on onboarding) to keep the visual
 * language consistent with the welcome hero.
 */
export default function PublicLayout(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
