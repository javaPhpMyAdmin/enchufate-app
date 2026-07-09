/**
 * ProfileStats — horizontal stat row used by host profiles.
 *
 * Renders a Card with up to 3 stats:
 *   - rating       (always shown)
 *   - reviewCount  (always shown)
 *   - chargerCount (hidden when 0)
 *
 * Plugs into both the own profile tab and the public profile screen.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star, Zap, MessageSquare } from 'lucide-react-native';

import { Card, CardBody } from '@/components/ui';
import { formatRating } from '@/lib/format';
import { useTheme } from '@/theme';

export interface ProfileStatsProps {
  rating: number;
  reviewCount: number;
  chargerCount: number;
}

export function ProfileStats({
  rating,
  reviewCount,
  chargerCount,
}: ProfileStatsProps): React.JSX.Element {
  const theme = useTheme();
  const showChargers = chargerCount > 0;

  return (
    <Card variant="elevated" padded={false}>
      <CardBody>
        <View style={styles.row}>
          <StatCell
            icon={
              <Star
                color={theme.colors.warning}
                fill={theme.colors.warning}
                size={18}
              />
            }
            value={formatRating(rating)}
            label="Rating"
          />
          <Divider />
          <StatCell
            icon={
              <MessageSquare color={theme.colors.secondary} size={18} />
            }
            value={String(reviewCount)}
            label="Reseñas"
          />
          {showChargers ? (
            <>
              <Divider />
              <StatCell
                icon={<Zap color={theme.colors.primary} size={18} />}
                value={String(chargerCount)}
                label={
                  chargerCount === 1 ? 'Cargador' : 'Cargadores'
                }
              />
            </>
          ) : null}
        </View>
      </CardBody>
    </Card>
  );
}

interface StatCellProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function StatCell({ icon, value, label }: StatCellProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.cell}>
      <View style={styles.cellIcon}>{icon}</View>
      <Text
        style={[
          theme.typography.h3,
          { color: theme.colors.text, marginTop: 4 },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          theme.typography.caption,
          { color: theme.colors.textMuted, marginTop: 2 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  cellIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
});
