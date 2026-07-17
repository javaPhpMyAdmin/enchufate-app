/**
 * PendingRequests — host UI showing pending reservation requests.
 *
 * Displays a list of pending requests with driver info, charger title,
 * and approve/reject actions. Uses optimistic UI updates for instant feedback.
 *
 * Rendered in the profile tab between "Mis cargadores" and "Editar perfil".
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, X as XIcon } from 'lucide-react-native';

import { Avatar } from '@/components/ui';
import { usePendingHostRequests } from '@/hooks/useReservationsQuery';
import { reservationStore } from '@/data/reservationStore';
import type { ReservationWithCharger } from '@/data/types';
import { useTheme } from '@/theme';

export function PendingRequests(): React.JSX.Element | null {
  const theme = useTheme();
  const { data: pendingRequests, isLoading } = usePendingHostRequests();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = useCallback(
    async (reservation: ReservationWithCharger) => {
      if (!reservation.driver) return;
      setActionLoading(reservation.id);
      try {
        await reservationStore.approve(
          reservation.id,
          reservation.driver.id,
          reservation.charger.title,
        );
      } catch (err) {
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'No se pudo aprobar la reserva',
        );
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const handleReject = useCallback(
    async (reservation: ReservationWithCharger) => {
      if (!reservation.driver) return;
      Alert.alert(
        'Rechazar reserva',
        '¿Seguro que querés rechazar esta solicitud?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Sí, rechazar',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(reservation.id);
              try {
                await reservationStore.reject(
                  reservation.id,
                  reservation.driver!.id,
                  reservation.charger.title,
                );
              } catch (err) {
                Alert.alert(
                  'Error',
                  err instanceof Error ? err.message : 'No se pudo rechazar la reserva',
                );
              } finally {
                setActionLoading(null);
              }
            },
          },
        ],
      );
    },
    [],
  );

  if (isLoading || pendingRequests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text
        style={[
          theme.typography.h3,
          { color: theme.colors.text, marginBottom: 4 },
        ]}
      >
        Solicitudes pendientes
      </Text>
      <Text
        style={[
          theme.typography.body,
          { color: theme.colors.textMuted, marginBottom: 12 },
        ]}
      >
        {`${pendingRequests.length} ${pendingRequests.length === 1 ? 'solicitud espera' : 'solicitudes esperan'} tu respuesta`}
      </Text>
      {pendingRequests.map((item) => (
        <PendingRequestCard
          key={item.id}
          reservation={item}
          loading={actionLoading === item.id}
          onApprove={() => handleApprove(item)}
          onReject={() => handleReject(item)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Individual request card
// ---------------------------------------------------------------------------

interface PendingRequestCardProps {
  reservation: ReservationWithCharger;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function PendingRequestCard({
  reservation,
  loading,
  onApprove,
  onReject,
}: PendingRequestCardProps): React.JSX.Element {
  const theme = useTheme();
  const driver = reservation.driver;

  const dateStr = new Date(reservation.createdAt).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: loading ? 0.6 : 1,
        },
      ]}
    >
      {/* Driver info */}
      <View style={styles.driverRow}>
        {driver ? (
          <Avatar
            source={driver.avatarUrl}
            name={driver.name}
            size="sm"
          />
        ) : null}
        <View style={styles.driverInfo}>
          <Text
            style={[theme.typography.bodyBold, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {driver ? `${driver.name} ${driver.surname}` : 'Usuario'}
          </Text>
          <Text
            style={[
              theme.typography.small,
              { color: theme.colors.textMuted, marginTop: 2 },
            ]}
          >
            {`${reservation.charger.title} · ${dateStr}`}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onReject}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionButton,
            styles.rejectButton,
            {
              borderColor: theme.colors.danger,
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
        >
          <XIcon color={theme.colors.danger} size={14} />
          <Text style={[styles.actionText, { color: theme.colors.danger }]}>
            Rechazar
          </Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionButton,
            styles.approveButton,
            {
              backgroundColor: theme.colors.success,
              opacity: pressed || loading ? 0.85 : 1,
            },
          ]}
        >
          <Check color="#fff" size={14} />
          <Text style={[styles.actionText, { color: '#fff' }]}>
            Aceptar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverInfo: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  rejectButton: {
    backgroundColor: 'transparent',
  },
  approveButton: {
    borderColor: 'transparent',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
