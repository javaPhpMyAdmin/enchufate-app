/**
 * ReviewCard — displays a single review with author avatar, name, stars,
 * comment, and relative time.
 *
 * Variants:
 * - `full` (default): Avatar sm, meta row with stars + rating text + time, bottom border
 * - `compact`: Avatar md, stars right-aligned in header, time below name, no border
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { formatRelativeTime } from '@/features/profile/helpers';
import { formatRating } from '@/lib/format';
import { useTheme } from '@/theme';

import { StarRating } from './StarRating';

export interface ReviewCardProps {
  authorName: string;
  authorAvatar?: string | null;
  rating: number;
  text?: string | null;
  date: string;
  /** 'full' = reviews list style; 'compact' = inline profile style */
  variant?: 'full' | 'compact';
}

export function ReviewCard({
  authorName,
  authorAvatar,
  rating,
  text,
  date,
  variant = 'full',
}: ReviewCardProps): React.JSX.Element {
  const theme = useTheme();
  const isCompact = variant === 'compact';

  return (
    <View
      style={[
        styles.card,
        !isCompact && styles.cardBordered,
      ]}
    >
      <View style={styles.header}>
        <Avatar
          source={authorAvatar ?? undefined}
          name={authorName}
          size={isCompact ? 'md' : 'sm'}
        />
        <View style={styles.headerText}>
          <Text
            style={[theme.typography.bodyBold, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {authorName}
          </Text>
          {isCompact ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted, marginTop: 2 },
              ]}
            >
              {formatRelativeTime(date)}
            </Text>
          ) : (
            <View style={styles.metaRow}>
              <StarRating value={rating} readonly size={12} />
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textMuted, marginLeft: 6 },
                ]}
              >
                {formatRating(rating)}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textLight, marginLeft: 8 },
                ]}
              >
                {formatRelativeTime(date)}
              </Text>
            </View>
          )}
        </View>
        {isCompact && (
          <StarRating value={rating} readonly size={14} />
        )}
      </View>
      {text ? (
        <Text
          style={[
            theme.typography.body,
            { color: theme.colors.text, marginTop: 8 },
          ]}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
  },
  cardBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});
