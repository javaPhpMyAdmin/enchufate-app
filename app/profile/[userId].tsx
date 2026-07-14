/**
 * Public owner profile — `/profile/[userId]`.
 *
 * Layout (top to bottom):
 *   1. Back button (route header)
 *   2. ProfileHeader (avatar + name + member-since)
 *   3. Verified-host badge (if isHost)
 *   4. ProfileStats (rating + reviews + chargers; only if host)
 *   5. Bio (Card, only if host and bio present)
 *   6. "Cargadores" section title + list of ChargerCard for this owner
 *   7. "Reseñas" section title + latest 3 ReviewCards
 *   8. Fixed "Contactar" button at the bottom
 *
 * Edge cases:
 *   - own userId: show the own profile (no redirect — the user opened
 *     "Ver mi perfil público" from the tab). The Contactar button is
 *     hidden in that case (it would message themselves).
 *   - user not found: EmptyState with a back button.
 *   - user exists but is not a host: hide stats, bio, chargers, reviews
 *     section title, and the Contactar button.
 */
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';

import { ChargerCard } from '@/components/charger';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  EmptyState,
  Screen,
} from '@/components/ui';
import {
  ProfileHeader,
  ProfileStats,
} from '@/components/profile';
import { ReviewCard } from '@/components/reviews';
import { useAuth } from '@/features/auth';
import { useChargers } from '@/data/chargerStore';
import { messageStore } from '@/data/messageStore';
import { getReviewsForUser } from '@/data/reviews';
import type { Charger, Review, User } from '@/data/types';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { fullName, isCurrentUser } from '@/features/profile';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/theme';

export default function PublicProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const rawId = params.userId;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { session } = useAuth();

  // Resolve the user: self from session, others from Supabase.
  const isSelf = userId != null && session?.user.id === userId;
  const { data: profileUser } = useProfileQuery(
    isSelf ? undefined : userId ?? undefined,
  );
  const user: User | null = isSelf ? (session?.user ?? null) : (profileUser ?? null);

  // Subscribe to the store so the chargers list reflects any new
  // publications by this host (covers hosts added via Phase 3 publish).
  const chargersAll = useChargers();
  const chargers = useMemo<Charger[]>(() => {
    if (!userId) return [];
    return chargersAll.filter((c) => c.ownerId === userId);
  }, [chargersAll, userId]);

  // Fetch reviews from Supabase (async).
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['reviews', userId],
    queryFn: () => getReviewsForUser(userId!, 3),
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Phase 5 (T-21): "Contactar" finds-or-creates a conversation with
  // the public user and navigates to the chat screen. No-op if the
  // user is the current user (self-conversation) or if the auth
  // session is missing.
  const handleContact = useCallback(async (): Promise<void> => {
    if (!user) return;
    const me = session?.user ?? null;
    if (!me) return;
    if (me.id === user.id) return;
    const conv = await messageStore.findOrCreateConversation([me.id, user.id]);
    router.push(`/messages/${conv.id}`);
  }, [user, session?.user, router]);

  const handleViewCharger = (chargerId: string) => {
    // The map screen owns the charger detail sheet, so jumping there
    // shows the user the location. Tapping a charger card inside the
    // public profile is a discovery flow, not a "go straight to
    // detail" flow — letting the map handle selection keeps the UX
    // consistent with how drivers find chargers.
    router.push({ pathname: '/(tabs)/map', params: { select: chargerId } });
  };

  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Not-found: EmptyState with a back action.
  if (!userId || !user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Perfil',
            headerLeft: () => (
              <BackButton onPress={handleBack} label="Volver" />
            ),
          }}
        />
        <Screen scroll={false}>
          <EmptyState
            icon={
              <Avatar
                name="Usuario no encontrado"
                size="lg"
              />
            }
            title="Usuario no encontrado"
            message="El perfil que buscás no existe o fue eliminado."
            actionLabel="Volver"
            onAction={handleBack}
          />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${user.name} ${user.surname}`.trim() || 'Perfil',
          headerLeft: () => (
            <BackButton onPress={handleBack} label="Volver" />
          ),
        }}
      />
      <Screen
        scroll
        edges={['bottom']}
        contentStyle={styles.scroll}
        footer={
          user.isHost && !isSelf ? (
            <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
              <Button
                label="Contactar"
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={
                  <MessageCircle
                    color={theme.colors.textOnPrimary}
                    size={18}
                  />
                }
                onPress={handleContact}
              />
            </View>
          ) : null
        }
      >
        <ProfileHeader user={user} />

        {user.isHost ? (
          <View style={styles.badgeRow}>
            <Badge
              label="Anfitrión verificado"
              tone="soft"
              status="available"
            />
          </View>
        ) : null}

        {user.isHost ? (
          <ProfileStats
            rating={user.rating}
            reviewCount={user.reviewCount}
            chargerCount={chargers.length}
          />
        ) : null}

        {user.isHost && user.bio ? (
          <Card variant="elevated">
            <CardBody>
              <Text
                style={[
                  theme.typography.smallBold,
                  { color: theme.colors.textMuted },
                ]}
              >
                Acerca de
              </Text>
              <Text
                style={[
                  theme.typography.body,
                  { color: theme.colors.text, marginTop: 6 },
                ]}
              >
                {user.bio}
              </Text>
            </CardBody>
          </Card>
        ) : null}

        {user.isHost ? (
          <>
            <Text style={[theme.typography.h3, styles.sectionTitle, { color: theme.colors.text }]}>
              Cargadores
            </Text>
            {chargers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text
                  style={[
                    theme.typography.body,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Este anfitrión todavía no publicó cargadores.
                </Text>
              </View>
            ) : (
              <View style={styles.chargerList}>
                {chargers.map((c, idx) => (
                  <View
                    key={c.id}
                    style={
                      idx < chargers.length - 1
                        ? styles.chargerItem
                        : styles.chargerItemLast
                    }
                  >
                    <ChargerCard
                      charger={c}
                      owner={user}
                      onPress={handleViewCharger}
                    />
                  </View>
                ))}
              </View>
            )}

            <Text style={[theme.typography.h3, styles.sectionTitle, { color: theme.colors.text }]}>
              Reseñas
            </Text>
            {reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text
                  style={[
                    theme.typography.body,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Este anfitrión todavía no tiene reseñas.
                </Text>
              </View>
            ) : (
              <Card variant="elevated" padded={false}>
                <CardBody>
                  {reviews.map((review, idx) => (
                    <React.Fragment key={review.id}>
                      <ReviewRow
                        review={review}
                        isLast={idx === reviews.length - 1}
                      />
                    </React.Fragment>
                  ))}
                </CardBody>
              </Card>
            )}
          </>
        ) : null}
      </Screen>
    </>
  );
}

interface BackButtonProps {
  onPress: () => void;
  label: string;
}

function BackButton({ onPress, label }: BackButtonProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.backBtn,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <ArrowLeft color={theme.colors.text} size={20} />
      <Text
        style={[
          theme.typography.smallBold,
          { color: theme.colors.text, marginLeft: 4 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ReviewRow — single review with author resolved from Supabase.
// ---------------------------------------------------------------------------

interface ReviewRowProps {
  review: Review;
  isLast: boolean;
}

function ReviewRow({ review, isLast }: ReviewRowProps): React.JSX.Element {
  const { data: author } = useProfileQuery(review.authorId);
  return (
    <>
      <ReviewCard
        authorName={author ? fullName(author) : 'Usuario'}
        authorAvatar={author?.avatarUrl}
        rating={review.rating}
        text={review.comment}
        date={review.createdAt}
        variant="compact"
      />
      {!isLast ? <Divider style={{ marginVertical: 4 }} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeRow: {
    alignItems: 'center',
  },
  sectionTitle: {
    marginTop: 4,
  },
  chargerList: {
    gap: 12,
  },
  chargerItem: {
    marginBottom: 12,
  },
  chargerItemLast: {},
  emptyBox: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
