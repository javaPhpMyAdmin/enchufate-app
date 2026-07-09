/**
 * ReviewCard — a single review row in the public profile's reviews list.
 *
 * Renders the author's avatar + full name, a relative timestamp, a 1-5
 * star bar, and the comment body. The author is optional because the
 * mock layer always has the author present, but tests / future
 * "deleted user" cases can pass `null`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { Avatar } from '@/components/ui';
import type { Review, User } from '@/data/types';
import { formatRelativeTime, fullName } from '@/features/profile/helpers';
import { useTheme } from '@/theme';

export interface ReviewCardProps {
  review: Review;
  author: User | null;
}

export function ReviewCard({ review, author }: ReviewCardProps): React.JSX.Element {
  const theme = useTheme();
  const authorName = author ? fullName(author) : 'Usuario';
  const authorAvatar = author?.avatarUrl;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Avatar source={authorAvatar} name={authorName} size="md" />
        <View style={styles.headerText}>
          <Text
            style={[
              theme.typography.bodyBold,
              { color: theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {authorName}
          </Text>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginTop: 2 },
            ]}
          >
            {formatRelativeTime(review.createdAt)}
          </Text>
        </View>
        <StarRating rating={review.rating} />
      </View>
      <Text
        style={[
          theme.typography.body,
          styles.comment,
          { color: theme.colors.text },
        ]}
      >
        {review.comment}
      </Text>
    </View>
  );
}

function StarRating({ rating }: { rating: number }): React.JSX.Element {
  const theme = useTheme();
  // Render exactly 5 stars so the rating is always visually comparable.
  // For ratings < 1 we still show all 5 in the muted color — easier to
  // read than 0.4 of a star.
  const stars: number[] = [1, 2, 3, 4, 5];
  return (
    <View style={styles.starsRow}>
      {stars.map((i) => {
        const filled = i <= Math.round(rating);
        return (
          <Star
            key={i}
            color={filled ? theme.colors.warning : theme.colors.border}
            fill={filled ? theme.colors.warning : 'transparent'}
            size={14}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    marginTop: 8,
  },
});
