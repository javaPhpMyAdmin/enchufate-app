/**
 * UserReviews — screen showing all reviews for a given user (host).
 *
 * Route param: userId — the host whose reviews are displayed.
 */
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReviewCard } from '@/components/reviews';
import { useReviewsWithAuthors } from '@/hooks/useReviewsQuery';
import { useTheme } from '@/theme';

export default function UserReviewsScreen(): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: reviews, isLoading } = useReviewsWithAuthors(userId);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : !reviews || reviews.length === 0 ? (
        <View style={styles.centered}>
          <Text
            style={[theme.typography.body, { color: theme.colors.textMuted }]}
          >
            Sin reseñas aún
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <ReviewCard
                authorName={item.authorName}
                authorAvatar={item.authorAvatar}
                rating={item.rating}
                comment={item.comment}
                createdAt={item.createdAt}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 16,
  },
  listItem: {
    paddingHorizontal: 20,
  },
});
