/**
 * SocialAuthButtons — mocked Google + Apple sign-in.
 *
 * Tapping either button shows a "Próximamente" alert. REQ-3 / REQ-4 only
 * require the buttons to exist for v1; real OAuth comes later.
 */
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

type Provider = 'google' | 'apple';

const COMING_SOON: Record<Provider, string> = {
  google: 'Login con Google llega en una próxima versión.',
  apple: 'Login con Apple llega en una próxima versión.',
};

export function SocialAuthButtons(): React.JSX.Element {
  const theme = useTheme();

  const handlePress = (provider: Provider): void => {
    Alert.alert('Próximamente', COMING_SOON[provider]);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar con Google"
        onPress={() => handlePress('google')}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: '#FFFFFF',
            borderColor: theme.colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.googleBubble}>
          <Text style={styles.googleLetter}>G</Text>
        </View>
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
        onPress={() => handlePress('apple')}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: '#0F172A',
            borderColor: '#0F172A',
            opacity: pressed ? 0.85 : 1,
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
