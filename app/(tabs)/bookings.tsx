/**
 * Bookings tab — list of the authenticated user's charger reservations.
 *
 * Two modes driven by the auth status:
 *   - unauthenticated: EmptyState with "Iniciá sesión" CTA that bounces
 *     the user to `/(public)/login?redirect=/(tabs)/bookings` so they
 *     land back here after signing in.
 *   - authenticated: EmptyState explaining that reservations will appear
 *     here once the user books a charger from the map.
 *
 * Mirrors the messages tab pattern so the gated UX is consistent.
 */
import { useRouter } from 'expo-router';
import { Calendar, LogIn } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/theme';

export default function BookingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status } = useAuth();

  if (status === 'loading') {
    return <Screen scroll={false} edges={['top']} />;
  }

  if (status === 'unauthenticated') {
    return (
      <Screen scroll={false} edges={['top']}>
        <View style={styles.unauth}>
          <EmptyState
            icon={<LogIn color={theme.colors.textMuted} size={36} />}
            title="Iniciá sesión"
            message="Necesitás iniciar sesión para ver tus reservas."
            actionLabel="Iniciá sesión"
            onAction={() =>
              router.push('/(public)/login?redirect=/(tabs)/bookings')
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <EmptyState
        icon={<Calendar color={theme.colors.textMuted} size={36} />}
        title="Tus reservas van a aparecer acá"
        message="Reservá un cargador desde el mapa y gestioná tus slots desde este tab."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  unauth: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
