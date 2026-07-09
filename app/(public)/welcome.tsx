/**
 * Welcome screen — first impression for any new or returning visitor.
 *
 * Renders a full-bleed primary-green hero with the brand mark, the value
 * prop, and the two CTAs described in REQ-1:
 *   - "Buscar cargador"     -> enters the (tabs) experience without auth
 *   - "Publicar mi cargador" -> requires auth, so it routes to login
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function WelcomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();

  const handleBuscar = (): void => {
    // Search-only path: no auth required for the v1 demo.
    router.replace('/(tabs)');
  };

  const handlePublicar = (): void => {
    router.push('/(public)/login');
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.primary },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <Zap
            color={theme.colors.textOnPrimary}
            size={56}
            fill={theme.colors.textOnPrimary}
          />
        </View>
        <Text style={styles.wordmark}>Enchufate</Text>
        <Text style={styles.title}>Cargá donde quieras</Text>
        <Text style={styles.subtitle}>
          La red de cargadores EV entre particulares
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Buscar cargador"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleBuscar}
          style={styles.primaryCta}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publicar mi cargador"
          onPress={handlePublicar}
          style={({ pressed }) => [
            styles.secondaryCta,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.secondaryLabel}>Publicar mi cargador</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 32,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    gap: 12,
  },
  primaryCta: {
    backgroundColor: '#FFFFFF',
  },
  secondaryCta: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
});
