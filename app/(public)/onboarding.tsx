/**
 * Onboarding — 3-slide horizontal pager that introduces Enchufate to
 * first-time users. Dots + "Saltar" link + "Siguiente" / "Empezar" CTA
 * match REQ-2.
 *
 * First-run detection is handled by the AuthProvider: it owns the
 * `enchufate.onboardingSeen` flag in AsyncStorage and exposes
 * `completeOnboarding()` so the rest of the app stays unaware of the
 * storage layer.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  MapPin,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import {
  OnboardingDots,
  OnboardingSlide,
} from '@/components/auth';
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

interface Slide {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: MapPin,
    title: 'Encontrá cargadores cerca tuyo',
    subtitle:
      'Explorá cargadores disponibles en tu ciudad y reservá en segundos.',
  },
  {
    id: '2',
    icon: MessageCircle,
    title: 'Contactá directo al propietario',
    subtitle:
      'Hablá directo con el host para coordinar el horario de carga.',
  },
  {
    id: '3',
    icon: DollarSign,
    title: 'Publicá tu cargador y ganá dinero',
    subtitle:
      'Compartí tu cargador EV con la comunidad y monetizá tu inversión.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const next = Math.round(x / SCREEN_WIDTH);
      if (next !== activeIndex) setActiveIndex(next);
    },
    [activeIndex],
  );

  const handleNext = useCallback(async (): Promise<void> => {
    if (isLast) {
      await completeOnboarding();
      router.replace('/(public)/welcome');
      return;
    }
    listRef.current?.scrollToIndex({
      index: activeIndex + 1,
      animated: true,
    });
  }, [isLast, activeIndex, completeOnboarding, router]);

  const handleSkip = useCallback(async (): Promise<void> => {
    await completeOnboarding();
    router.replace('/(public)/welcome');
  }, [completeOnboarding, router]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => (
      <View style={{ width: SCREEN_WIDTH }}>
        <OnboardingSlide
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
        />
      </View>
    ),
    [],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Saltar onboarding"
        >
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.textMuted },
            ]}
          >
            Saltar
          </Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.footer}>
        <OnboardingDots count={SLIDES.length} activeIndex={activeIndex} />
        <Button
          label={isLast ? 'Empezar' : 'Siguiente'}
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => void handleNext()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  spacer: { flex: 1 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 24,
  },
});
