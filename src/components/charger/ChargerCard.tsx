import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star, Zap, MapPin } from 'lucide-react-native';

import { Avatar, Badge, Card } from '@/components/ui';
import type { Charger, User } from '@/data/types';
import { CONNECTOR_LABELS, STATUS_LABELS } from '@/data/types';
import { formatDistance as fmtDist } from '@/lib/distance';
import {
  formatPower,
  formatPrice,
  formatRating,
} from '@/lib/format';
import { useTheme } from '@/theme';

export interface ChargerCardProps {
  charger: Charger;
  owner: User;
  distanceKm?: number | null;
  onPress: (chargerId: string) => void;
}

const statusToBadge: Record<
  Charger['status'],
  'available' | 'reserved' | 'busy'
> = {
  available: 'available',
  reserved: 'reserved',
  busy: 'busy',
};

export const ChargerCard = React.memo(function ChargerCard({
  charger,
  owner,
  distanceKm,
  onPress,
}: ChargerCardProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onPress(charger.id)}
      android_ripple={{ color: theme.colors.surfaceAlt }}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Card variant="elevated" padded>
        {/* Top row: owner + status badge */}
        <View style={styles.row}>
          <Avatar source={owner.avatarUrl} name={owner.name} size="md" />
          <View style={styles.ownerCol}>
            <Text
              style={[theme.typography.smallBold, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {owner.name}
            </Text>
            {owner.reviewCount > 0 && (
              <View style={styles.ratingRow}>
                <Star
                  color={theme.colors.warning}
                  fill={theme.colors.warning}
                  size={12}
                />
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted, marginLeft: 3 },
                  ]}
                >
                  {formatRating(owner.rating)}
                </Text>
              </View>
            )}
          </View>
          <Badge
            status={statusToBadge[charger.status]}
            tone="soft"
            label={STATUS_LABELS[charger.status]}
          />
        </View>

        {/* Title */}
        <Text
          style={[
            theme.typography.bodyBold,
            { color: theme.colors.text, marginTop: 10 },
          ]}
          numberOfLines={2}
        >
          {charger.title}
        </Text>

        {/* Address */}
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <MapPin color={theme.colors.textMuted} size={12} />
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginLeft: 4, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {charger.neighborhood}
            {distanceKm != null ? ` · ${fmtDist(distanceKm)}` : ''}
          </Text>
        </View>

        {/* Specs row */}
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.spec}>
            <Zap color={theme.colors.primary} size={14} />
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.text, marginLeft: 4 },
              ]}
            >
              {formatPower(charger.powerKw)}
            </Text>
          </View>
          <Text
            style={[theme.typography.caption, { color: theme.colors.textMuted }]}
          >
            {CONNECTOR_LABELS[charger.type]}
          </Text>
        </View>

        {/* Price row */}
        <View style={[styles.row, { marginTop: 10 }]}>
          <Text
            style={[
              theme.typography.bodyBold,
              { color: theme.colors.primary },
            ]}
          >
            {formatPrice(charger.pricePerHour)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerCol: {
    flex: 1,
    marginLeft: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
});
