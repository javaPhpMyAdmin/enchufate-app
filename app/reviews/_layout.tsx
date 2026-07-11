/**
 * Stack for the `/reviews` route group — owns the write and list screens.
 *
 * write.tsx is presented as a modal; [userId].tsx is a normal push.
 */
import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/theme';

export default function ReviewsLayout(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="write" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[userId]" />
    </Stack>
  );
}
