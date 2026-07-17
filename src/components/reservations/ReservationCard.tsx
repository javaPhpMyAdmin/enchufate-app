/**
 * ReservationCard — renders a single reservation with status badge,
 * charger info, datetime range, and contextual actions.
 *
 * Used in the Bookings tab for both driver and host views.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, Clock, Zap, X } from 'lucide-react-native';

import { Avatar } from '@/components/ui';
import type { ReservationWithCharger } from '@/data/types';
import { CONNECTOR_LABELS, RESERVATION_STATUS_LABELS } from '@/data/types';
import { formatPower } from '@/lib/format';
import { useTheme } from '@/theme';

export interface ReservationCardProps {
  reservation: ReservationWithCharger;
  /** Whether to show the "Cancelar" action button. */
  showCancel?: boolean;
  onCancel?: () => void;
  onPress?: (reservation: ReservationWithCharger) => void;
  /** Whether this is the host view (shows driver info). */
  isHostView?: boolean;
}

export function ReservationCard({
  reservation,
  showCancel = false,
  onCancel,
  onPress,
  isHostView = false,
}: ReservationCardProps): React.JSX.Element {
  const theme = useTheme();

  const statusTone: Record<string, { fg: string; bg: string }> = {
    pending: { fg: '#D97706', bg: '#D9770622' },
    confirmed: { fg: '#10B981', bg: '#10B98122' },
    cancelled: { fg: '#EF4444', bg: '#EF444422' },
    completed: { fg: '#94A3B8', bg: '#94A3B822' },
  };
  const tone = statusTone[reservation.status] ?? statusTone.completed!;

  const hasSchedule = reservation.startTime && reservation.endTime;
  const start = hasSchedule ? new Date(reservation.startTime!) : null;
  const end = hasSchedule ? new Date(reservation.endTime!) : null;
  const isPast = end ? end.getTime() < Date.now() : false;
  const canCancel = showCancel && (reservation.status === 'confirmed' || reservation.status === 'pending') && !isPast;

  const dateStr = hasSchedule
    ? start!.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })
    : new Date(reservation.createdAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
  const timeStr = hasSchedule
    ? `${start!.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })} – ${end!.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}`
    : 'Horario a coordinar';

  return (
    <Pressable
      onPress={() => onPress?.(reservation)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      {/* Header: status badge + date */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <View style={[styles.dot, { backgroundColor: tone.fg }]} />
          <Text style={[styles.badgeText, { color: tone.fg }]}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </Text>
        </View>
        <Text style={[theme.typography.small, { color: theme.colors.textMuted }]}>
          {dateStr}
        </Text>
      </View>

      {/* Charger info */}
      <View style={styles.chargerRow}>
        <View style={styles.chargerInfo}>
          <Text
            style={[theme.typography.bodyBold, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {reservation.charger.title}
          </Text>
          <Text
            style={[theme.typography.small, { color: theme.colors.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {reservation.charger.address}
          </Text>
        </View>
      </View>

      {/* Time + power */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock color={theme.colors.textMuted} size={14} />
          <Text style={[theme.typography.small, { color: theme.colors.text, marginLeft: 4 }]}>
            {timeStr}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Zap color={theme.colors.textMuted} size={14} />
          <Text style={[theme.typography.small, { color: theme.colors.text, marginLeft: 4 }]}>
            {formatPower(reservation.charger.powerKw)}
          </Text>
        </View>
      </View>

      {/* Driver info (host view only) */}
      {isHostView && reservation.driver ? (
        <View style={styles.driverRow}>
          <Avatar
            source={reservation.driver.avatarUrl}
            name={reservation.driver.name}
            size="sm"
          />
          <Text
            style={[theme.typography.small, { color: theme.colors.text, marginLeft: 8 }]}
          >
            {`${reservation.driver.name} ${reservation.driver.surname}`}
          </Text>
        </View>
      ) : null}

      {/* Cancel action */}
      {canCancel ? (
        <Pressable
          onPress={() => onCancel?.()}
          style={({ pressed }) => [
            styles.cancelButton,
            {
              borderColor: theme.colors.danger,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <X color={theme.colors.danger} size={14} />
          <Text style={[styles.cancelText, { color: theme.colors.danger }]}>
            Cancelar
          </Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chargerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chargerInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    gap: 4,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
