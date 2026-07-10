/**
 * SocialAuthButtons — single Google sign-in button.
 *
 * Tapping the button calls `useAuth().signInWithGoogle()`, which kicks
 * off the Supabase OAuth flow (via `signInWithOAuth` + `expo-web-browser`).
 * The provider's consent screen opens in an in-app webview; once the
 * user completes Google auth, Supabase redirects back to the app
 * through the deep link. The auth state change listener fires with
 * `SIGNED_IN` and the app routes to (tabs).
 *
 * UX: while the webview is open and after it closes (until the callback
 * navigates away), a full-screen loading overlay covers the login screen
 * so the user never sees a flash of the login form between Google auth
 * and the home screen.
 *
 * Setup required (in the Supabase dashboard):
 *   1. Authentication > Providers > Google — enabled with OAuth client
 *      ID + secret from Google Cloud Console.
 *   2. Authentication > URL Configuration — redirect URI allow-list
 *      must include both:
 *        - enchufate://auth/callback (dev builds / production)
 *        - exp://<local-ip>:8081/--/auth/callback (Expo Go)
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

export function SocialAuthButtons(): React.JSX.Element {
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<boolean>(false);

  const handleGoogle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
      // The webview takes over; onAuthStateChange will bring us into
      // the app once the user completes the consent screen.
      // NOTE: we do NOT set busy = false here. The loading overlay
      // must persist until this screen unmounts (which happens when
      // the callback navigates to /(tabs)). Setting busy = false
      // prematurely would flash the login screen for one frame.
    } catch (err) {
      // Only clear busy on error — the user stays on the login screen.
      setBusy(false);
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos iniciar sesión con Google.';
      Alert.alert('Error con Google', message);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        accessibilityState={{ busy }}
        onPress={() => void handleGoogle()}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: '#FFFFFF',
            borderColor: theme.colors.border,
            opacity: busy ? 0.6 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#4285F4" />
        ) : (
          <View style={styles.googleBubble}>
            <Text style={styles.googleLetter}>G</Text>
          </View>
        )}
        <Text
          style={[
            theme.typography.smallBold,
            styles.label,
            { color: theme.colors.text },
          ]}
        >
          {busy ? 'Conectando con Google...' : 'Continuar con Google'}
        </Text>
      </Pressable>

      {/* Full-screen loading overlay — covers the login form while the
          Google webview is open and after it closes (until the callback
          route navigates to /(tabs) and this screen unmounts). */}
      {busy ? (
        <View style={[styles.overlay, { backgroundColor: theme.colors.background }]}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.overlayContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textMuted, marginTop: 16, textAlign: 'center' },
              ]}
            >
              Conectando con Google...
            </Text>
          </SafeAreaView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  googleBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
