/**
 * Root layout — owns the global provider stack and the auth gate.
 *
 * Provider tree:
 *   GestureHandlerRootView
 *     QueryClientProvider
 *       ThemeProvider
 *         SafeAreaProvider
 *           AuthProvider
 *             BottomSheetModalProvider
 *               AppNavigator
 *
 * Pattern (Umpi-inspired): the Stack ALWAYS renders with (tabs) as the
 * first screen so authenticated users land directly on the home tab.
 * A branded SplashOverlay covers everything while the session hydrates.
 * For unauthenticated users, router.replace fires under the splash so
 * they see login when the overlay fades out.
 */
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/features/auth';
import { ThemeProvider, useTheme } from '@/theme';
import { SplashOverlay } from '@/components/SplashOverlay';

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <BottomSheetModalProvider>
                <AppNavigator />
              </BottomSheetModalProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// Navigator — Stack always renders; (tabs) is first so authenticated
// users see the correct screen immediately. SplashOverlay hides
// everything while auth hydrates.
// ---------------------------------------------------------------------------

function AppNavigator(): React.JSX.Element {
  const theme = useTheme();
  const [splashDone, setSplashDone] = useState(false);

  // ALL users land on (tabs) — the map is public. Auth gates on
  // individual screens (publish, profile, bookings, messages) handle
  // login prompts when needed.

  return (
    <>
      <StatusBar style="auto" />
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
        {/* (tabs) FIRST — authenticated users land here by default */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="reviews" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/callback"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>
      {!splashDone && <SplashOverlay onFinish={() => setSplashDone(true)} />}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
