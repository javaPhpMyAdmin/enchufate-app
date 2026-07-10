/**
 * SocialAuthButtons — Google + Apple sign-in.
 *
 * Google (Phase 4) is wired to `useAuth().signInWithGoogle()` which kicks
 * off the Supabase OAuth webview. Apple is still a "Próximamente" stub —
 * real Apple sign-in needs native config (Sign in with Apple capability
 * + Service ID) that will land in a later phase.
 *
 * Both buttons share a single loading flag so the user can see the OAuth
 * round-trip in flight.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

type Provider = 'google' | 'apple';

const APPLE_COMING_SOON =
  'Login con Apple llega en una próxima versión.';

export function SocialAuthButtons(): React.JSX.Element {
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);

  const handleGoogle = async (): Promise<void> => {
    if (busy) return;
    setBusy('google');
    try {
      await signInWithGoogle();
      // The webview is taking over; the spinner stays on while the
      // auth state change listener brings us back into the app.
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No pudimos iniciar sesión con Google.';
      Alert.alert('Error', message);
    } finally {
      setBusy(null);
    }
  };

  const handleApple = (): void => {
    if (busy) return;
    Alert.alert('Próximamente', APPLE_COMING_SOON);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        onPress={() => void handleGoogle()}
        disabled={busy !== null}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: '#FFFFFF',
            borderColor: theme.colors.border,
            opacity: busy && busy !== 'google' ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {busy === 'google' ? (
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
          Google
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar con Apple"
        onPress={handleApple}
        disabled={busy !== null}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: '#0F172A',
            borderColor: '#0F172A',
            opacity: busy && busy !== 'apple' ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.appleGlyph,
            { color: '#FFFFFF' },
          ]}
        >
          {/* Apple logo (text glyph) — a real brand asset lands later. */}
          {'\uF8FF'}
        </Text>
        <Text
          style={[
            theme.typography.smallBold,
            styles.label,
            { color: '#FFFFFF' },
          ]}
        >
          Apple
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  googleBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  appleGlyph: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
  },
});
