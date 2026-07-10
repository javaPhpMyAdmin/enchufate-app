/**
 * SocialAuthButtons — single Google sign-in button.
 *
 * Tapping the button kicks off the Supabase OAuth webview (`signInWithOAuth`).
 * The provider's consent screen opens in the system browser/webview; once
 * the user completes Google auth, Supabase redirects back to the app
 * through the `enchufate://auth/callback` deep link (handled in
 * AuthProvider's Linking listener) and the auth state change fires with
 * `SIGNED_IN`.
 *
 * Setup required for this to actually work (in the Supabase dashboard):
 *   1. Authentication > Providers > Google — enabled with OAuth client
 *      ID + secret from Google Cloud Console.
 *   2. Authentication > URL Configuration — `enchufate://auth/callback`
 *      is in the redirect allow-list.
 *
 * If either of those is missing, `signInWithGoogle()` throws an
 * `AuthError` and we surface the message in an `Alert` (the only reliable
 * way to get user attention without refactoring the login screen).
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

import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

export function SocialAuthButtons(): React.JSX.Element {
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<boolean>(false);

  const handleGoogle = async (): Promise<void> => {
    console.log('[auth-google] 1) button pressed at', new Date().toISOString());
    if (busy) {
      console.log('[auth-google] 1b) already busy, ignoring press');
      return;
    }
    setBusy(true);
    try {
      console.log('[auth-google] 2) calling signInWithGoogle()...');
      await signInWithGoogle();
      console.log('[auth-google] 3) signInWithGoogle() resolved (webview should be opening)');
      // The webview / browser is taking over. The auth state change
      // listener will bring us back into the app once the user
      // completes Google auth and the redirect URL fires.
    } catch (err) {
      console.error('[auth-google] ERR signInWithGoogle threw:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos iniciar sesión con Google.';
      console.log('[auth-google] showing Alert with message:', message);
      Alert.alert('Error con Google', message);
    } finally {
      setBusy(false);
      console.log('[auth-google] 4) handleGoogle finally, busy=false');
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
});
