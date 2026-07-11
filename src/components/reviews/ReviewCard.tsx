/**
 * ReviewCard — displays a single review with author avatar, name, stars,
 * comment, and relative time.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui';
import { formatRating } from '@/lib/format';
import { useTheme } from '@/theme';

import { StarRating } from './StarRating';

interface ReviewCardProps {
  authorName: string;
  authorAvatar?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mes`;
}

export function ReviewCard({
  authorName,
  authorAvatar,
  rating,
  comment,
  createdAt,
}: ReviewCardProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.header}>
        <Avatar
          source={authorAvatar ?? undefined}
          name={authorName}
          size="sm"
        />
        <View style={styles.headerText}>
          <Text
            style={[theme.typography.bodyBold, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {authorName}
          </Text>
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
              {timeAgo(createdAt)}
            </Text>
          </View>
        </View>
      </View>
      {comment ? (
        <Text
          style={[
            theme.typography.body,
            { color: theme.colors.text, marginTop: 8 },
          ]}
        >
          {comment}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
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
