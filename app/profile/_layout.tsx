/**
 * Layout for the `/profile` route group — owns the edit and public
 * profile screens.
 *
 * The own profile tab stays inside the `(tabs)` group (so the bottom
 * tab bar is visible). Once the user navigates into `/profile/...`,
 * the tab bar is hidden and we get a normal header for back navigation.
 */
import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/theme';

export default function ProfileLayout(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: {
          color: theme.colors.text,
          fontWeight: '700',
        },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="edit"
        options={{ title: 'Editar perfil', presentation: 'modal' }}
      />
      <Stack.Screen
        name="[userId]"
        options={{ title: 'Perfil' }}
      />
    </Stack>
  );
}
