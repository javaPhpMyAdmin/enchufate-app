/**
 * Bookings tab — list of the authenticated user's charger reservations.
 *
 * Two modes driven by the auth status:
 *   - unauthenticated: EmptyState with "Iniciá sesión" CTA that bounces
 *     the user to `/(public)/login?redirect=/(tabs)/bookings` so they
 *     land back here after signing in.
 *   - authenticated driver: "Mis reservas" list via useDriverReservations.
 *   - authenticated host: Segmented control "Mis reservas" / "Reservas
 *     en mis cargadores" with separate data sources.
 */
import { useRouter } from 'expo-router';
import { Calendar, LogIn } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, Screen } from '@/components/ui';
import { ReservationCard } from '@/components/reservations';
import { reservationStore } from '@/data/reservationStore';
import type { ReservationWithCharger } from '@/data/types';
import { useAuth } from '@/features/auth';
import { useDriverReservations, useHostReservations } from '@/hooks/useReservationsQuery';
import { useTheme } from '@/theme';

type Tab = 'driver' | 'host';

export default function BookingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { status, session } = useAuth();
  const isHost = session?.user?.isHost ?? false;

  const [activeTab, setActiveTab] = useState<Tab>('driver');

  const driverQuery = useDriverReservations();
  const hostQuery = useHostReservations();

  const activeQuery = activeTab === 'driver' ? driverQuery : hostQuery;

  const handleCancel = (reservationId: string) => {
    Alert.alert(
      'Cancelar reserva',
      '¿Estás seguro que querés cancelar esta reserva?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationStore.cancel(reservationId);
            } catch (err) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'No se pudo cancelar la reserva',
              );
            }
          },
        },
      ],
    );
  };

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

  const driverData = driverQuery.data ?? [];
  const hostData = hostQuery.data ?? [];

  return (
    <Screen scroll={false}>
      {/* Segmented control — only show host tab if user is a host */}
      {isHost ? (
        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('driver')}
            style={[
              styles.segment,
              activeTab === 'driver' && {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.smallBold,
                {
                  color:
                    activeTab === 'driver'
                      ? theme.colors.textOnPrimary
                      : theme.colors.text,
                },
              ]}
            >
              Mis reservas
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('host')}
            style={[
              styles.segment,
              activeTab === 'host' && {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.smallBold,
                {
                  color:
                    activeTab === 'host'
                      ? theme.colors.textOnPrimary
                      : theme.colors.text,
                },
              ]}
            >
              En mis cargadores
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.tabHeader}>
          <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
            Mis reservas
          </Text>
        </View>
      )}

      {/* Loading state */}
      {activeQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : activeQuery.data?.length === 0 ? (
        /* Empty state */
        <View style={styles.centered}>
          <EmptyState
            icon={<Calendar color={theme.colors.textMuted} size={36} />}
            title={
              activeTab === 'driver'
                ? 'Sin reservas aún'
                : 'Sin reservas en tus cargadores'
            }
            message={
              activeTab === 'driver'
                ? 'Reservá un cargador desde el mapa y tus reservas van a aparecer acá.'
                : 'Cuando alguien reserve uno de tus cargadores, vas a verlo acá.'
            }
          />
        </View>
      ) : (
        /* Reservation list */
        <FlatList
          data={activeQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              showCancel={activeTab === 'driver'}
              onCancel={handleCancel}
              isHostView={activeTab === 'host'}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery.isRefetching}
              onRefresh={() => activeQuery.refetch()}
            />
          }
        />
      )}
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
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
