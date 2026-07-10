/**
 * Home tab — discovery landing.
 *
 * Marketing-style home for all users (drivers + hosts):
 *   - Brand header with the Enchufate wordmark + Zap glyph
 *   - Hero card with the value proposition
 *   - Two primary CTAs:
 *       "Buscar un cargador"     → /map
 *       "Publicar mi cargador"   → /publish (or /login if not authenticated)
 *
 * Hosts who want to manage their existing chargers find them in the
 * Profile tab ("Mis cargadores" section). This screen is intentionally
 * static — no data fetching — so it renders instantly on every tab tap.
 */
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Search, Zap } from 'lucide-react-native';

import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

const HERO_IMAGE = require('../../assets/home_card.png');

export default function HomeScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useAuth();

  const handleFindCharger = useCallback((): void => {
    router.push('/(tabs)/map');
  }, [router]);

  const handlePublish = useCallback((): void => {
    if (status !== 'authenticated') {
      router.push('/(public)/login');
      return;
    }
    router.push('/publish');
  }, [router, status]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {/* Header — Enchufate wordmark + Zap glyph */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: theme.colors.primaryLight },
            ]}
          >
            <Zap
              color={theme.colors.success}
              size={20}
              fill={theme.colors.success}
            />
          </View>
          <Text
            style={[
              theme.typography.h2,
              {
                color: theme.colors.primary,
                marginLeft: 10,
                fontWeight: '800',
                letterSpacing: 0.5,
              },
            ]}
          >
            Enchufate
          </Text>
        </View>

        <View style={styles.content}>
          {/* Hero card — just the photo, nothing else */}
          <View style={[styles.hero, theme.shadows.md]}>
            <Image
              source={HERO_IMAGE}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* Action: Buscar un cargador — white card with orange icon */}
          <Pressable
            onPress={handleFindCharger}
            accessibilityRole="button"
            accessibilityLabel="Buscar un cargador"
            style={({ pressed }) => [
              styles.actionCard,
              styles.actionCardWhite,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.lg,
              },
              theme.shadows.sm,
              { opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: theme.colors.primaryLight },
              ]}
            >
              <Search color={theme.colors.primary} size={22} />
            </View>
            <View style={styles.actionText}>
              <Text
                style={[
                  theme.typography.h3,
                  { color: theme.colors.text, marginBottom: 2 },
                ]}
              >
                Buscar un cargador
              </Text>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textMuted },
                ]}
              >
                Encontrá estaciones cerca de ti
              </Text>
            </View>
          </Pressable>

          {/* Action: Publicar mi cargador — orange card with white content */}
          <Pressable
            onPress={handlePublish}
            accessibilityRole="button"
            accessibilityLabel="Publicar mi cargador"
            style={({ pressed }) => [
              styles.actionCard,
              {
                backgroundColor: theme.colors.primaryDark,
                borderRadius: theme.radii.lg,
                borderColor: 'transparent',
              },
              theme.shadows.sm,
              { opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <View
              style={[
                styles.actionIconCircle,
                { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              ]}
            >
              <MapPin color={theme.colors.textOnPrimary} size={22} />
            </View>
            <View style={styles.actionText}>
              <Text
                style={[
                  theme.typography.h3,
                  { color: theme.colors.textOnPrimary, marginBottom: 2 },
                ]}
              >
                Publicar mi cargador
              </Text>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.textOnPrimary, opacity: 0.9 },
                ]}
              >
                Ganá dinero compartiendo tu punto
              </Text>
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  hero: {
    // Responsive: takes the larger share of remaining vertical space.
    // `minHeight` keeps it visible on very small devices (e.g. iPhone SE).
    flex: 1.5,
    minHeight: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCard: {
    // Responsive: grows proportionally to fill the screen but less than
    // the hero. Together with `hero: flex 1.5` this keeps the visual
    // hierarchy (hero > actions) on any aspect ratio.
    flex: 0.7,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionCardWhite: {},
  actionIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
});
