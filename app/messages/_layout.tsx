/**
 * Stack for the `/messages` route group — owns the chat screen.
 *
 * The chat screen sits OUTSIDE the (tabs) group so the bottom tab bar
 * is hidden while the user is having a conversation. The native header
 * is replaced by `<ChatHeader />` rendered inside the chat screen
 * (so the back button and avatar stay consistent with the rest of the
 * chat UI).
 */
import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/theme';

export default function MessagesLayout(): React.JSX.Element {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        // Hide the native header — the chat screen renders its own
        // header inline so the back/avatar/title cluster sits above
        // the message list.
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
