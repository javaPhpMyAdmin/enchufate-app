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
 *               ThemedNavigator
 *
 * The `AuthProvider` hydrates the user session + onboarding flag from
 * AsyncStorage on mount. While hydration is in progress we render a
 * full-screen splash; once we know who the user is (and whether they've
 * completed onboarding) the navigator chooses an initial route via
 * `router.replace`.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Zap } from 'lucide-react-native';

import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/features/auth';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout(): React.JSX.Element {

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <BottomSheetModalProvider>
                <ThemedNavigator />
              </BottomSheetModalProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// Splash — shown while AsyncStorage hydration is in progress.
// ---------------------------------------------------------------------------

function SplashView(): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[styles.splash, { backgroundColor: theme.colors.primary }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando Enchufate"
    >
      <StatusBar style="light" />
      <View style={styles.splashBubble}>
        <Zap
          color={theme.colors.textOnPrimary}
          size={56}
          fill={theme.colors.textOnPrimary}
        />
      </View>
      <Text style={styles.splashWordmark}>Enchufate</Text>
      <View style={styles.splashSpinner}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Navigator — picks the initial route based on auth + onboarding state.
// ---------------------------------------------------------------------------

function ThemedNavigator(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status, onboardingSeen } = useAuth();

  useEffect(() => {
    // Wait until the AuthProvider has finished hydrating from AsyncStorage.
    if (status === 'loading' || onboardingSeen === null) return;

    if (!onboardingSeen) {
      router.replace('/(public)/onboarding');
    } else if (status === 'authenticated') {
      router.replace('/(tabs)');
    } else {
      router.replace('/(public)/welcome');
    }
  }, [status, onboardingSeen, router]);

  if (status === 'loading' || onboardingSeen === null) {
    return <SplashView />;
  }

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
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/callback"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  splashBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashWordmark: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  splashSpinner: {
    marginTop: 8,
  },
});
