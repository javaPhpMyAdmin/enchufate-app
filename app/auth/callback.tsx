/**
 * OAuth callback route — handles the deep link that arrives when the
 * system opens the app at `enchufate://auth/callback?...` (or its Expo Go
 * equivalent `exp://.../--/auth/callback?...`).
 *
 * This is a SAFETY NET. The normal happy path is that
 * `WebBrowser.openAuthSessionAsync` captures the redirect URL and never
 * lets the OS open the app with the deep link. On Android Expo Go the
 * deep link DOES reach the app, so this route handles the exchange.
 *
 * Strategy (mirrors the working umpi-app pattern):
 *   1. Check Expo Router query params for ?code=
 *   2. Fall back to Linking.getInitialURL() for full URL (fragments)
 *   3. Listen for onAuthStateChange SIGNED_IN
 *   4. Safety timeout: always redirect home after 3s
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';

export default function AuthCallback(): React.JSX.Element {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    let cancelled = false;

    const goHome = () => {
      if (!cancelled) router.replace('/(tabs)');
    };

    const handleUrl = async (url: string) => {
      console.log('[auth/callback] handleUrl:', url);

      // PKCE: ?code=xxx
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (codeMatch) {
        console.log('[auth/callback] PKCE code found, exchanging…');
        const { error } = await supabase.auth.exchangeCodeForSession(
          decodeURIComponent(codeMatch[1] ?? ''),
        );
        if (!cancelled) {
          if (error) {
            console.log('[auth/callback] exchange error:', error.message);
          } else {
            console.log('[auth/callback] exchange OK');
          }
          goHome();
        }
        return;
      }

      // Implicit: #access_token=xxx&refresh_token=yyy
      const fragment = url.split('#')[1];
      if (fragment) {
        const fp: Record<string, string> = {};
        fragment.split('&').forEach((p) => {
          const [k, v] = p.split('=');
          if (k && v) fp[k] = decodeURIComponent(v);
        });
        if (fp.access_token) {
          console.log('[auth/callback] implicit tokens found, setting session');
          const { error } = await supabase.auth.setSession({
            access_token: fp.access_token,
            refresh_token: fp.refresh_token || '',
          });
          if (error) {
            console.log('[auth/callback] setSession error:', error.message);
          }
        }
      }

      if (!cancelled) goHome();
    };

    // Case 1: code in Expo Router query params
    if (params.code) {
      console.log('[auth/callback] code from params:', params.code);
      handleUrl('?code=' + params.code);
      return;
    }

    // Case 2: try to get full URL (with fragment) via Linking
    console.log('[auth/callback] no params.code, trying Linking.getInitialURL…');
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[auth/callback] Linking.getInitialURL:', url);
        handleUrl(url);
      } else {
        // No URL at all — check if session already exists
        console.log('[auth/callback] no URL, checking existing session…');
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('[auth/callback] existing session found → (tabs)');
          }
          if (!cancelled) goHome();
        });
      }
    });

    // Secondary trigger: auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.log('[auth/callback] onAuthStateChange:', event);
      if (event === 'SIGNED_IN') goHome();
    });

    // Safety timeout: always go home after 3s
    const timeout = setTimeout(goHome, 3000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          title: 'Iniciando sesión...',
        }}
      />
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
