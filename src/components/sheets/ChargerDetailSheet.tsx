/**
 * ChargerDetailSheet — bottom sheet shown when a charger is selected on
 * the map.
 *
 * Two states driven by the imperative `show(charger, owner)`:
 *   - hidden: index = -1
 *   - visible: snapped to the first snap point so the user immediately
 *     sees the highlight, can pull it up to full height.
 *
 * Layout (matches the brand reference):
 *   ┌────────────────────────────────────────┐
 *   │  ──── (drag handle)                    │
 *   │  [Avatar]  Garaje de Carlos   [● Disp] │
 *   │            ★ 4.9 (128 reseñas)         │
 *   │  ─────────────────────────────────────  │
 *   │  ⚡ POTENCIA      💶 PRECIO           │
 *   │     22 kW            1.50€/h           │
 *   │  ─────────────────────────────────────  │
 *   │  [💬 Contactar]  [📍 Cómo llegar]      │
 *   └────────────────────────────────────────┘
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Banknote,
  Clock,
  MessageCircle,
  Navigation,
  Star,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { AuthPromptModal, Avatar, Divider } from '@/components/ui';
import type { Charger, ChargerStatus, DaySchedule, User } from '@/data/types';
import { CONNECTOR_LABELS, STATUS_LABELS } from '@/data/types';
import { DAY_SHORT_LABELS } from '@/features/publish/types';
import { useAuth } from '@/features/auth';
import { useReviewsForUser } from '@/hooks/useReviewsQuery';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import {
  formatCountdown,
  formatPower,
  formatPrice,
  formatRating,
  formatReviewCount,
} from '@/lib/format';
import { useTheme } from '@/theme';

export interface ChargerDetailSheetHandle {
  show: (charger: Charger, owner: User, loading?: boolean) => void;
  close: () => void;
}

export interface ChargerDetailSheetProps {
  /** Fired when the user taps "Contactar". Receives owner id. */
  onContact: (ownerId: string) => void;
  /** Fired when the user taps "Reseña". Receives owner id + charger id. */
  onReview?: (ownerId: string, chargerId: string) => void;
}

const SNAP_POINTS = ['60%', '78%', '92%'];

export const ChargerDetailSheet = forwardRef<
  ChargerDetailSheetHandle,
  ChargerDetailSheetProps
>(function ChargerDetailSheet({ onContact, onReview }, ref) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheet | null>(null);

  const [charger, setCharger] = useState<Charger | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  // Delay mounting BottomSheet until first show() — prevents the backdrop
  // from flashing on screen mount (gorhom/bottom-sheet v5 renders on mount).
  const [mounted, setMounted] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      show: (c, o, loading = false) => {
        setMounted(true);
        setCharger(c);
        setOwner(o);
        setOwnerLoading(loading);
        // Small delay to ensure BottomSheet is mounted before snapping.
        requestAnimationFrame(() => {
          sheetRef.current?.snapToIndex(0);
        });
      },
      close: () => {
        sheetRef.current?.close();
      },
    }),
    [],
  );

  const handleDirections = useCallback(async () => {
    if (!charger) return;
    const { latitude, longitude } = charger.location;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(charger.title)})`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web Google Maps.
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        );
      }
    } catch (err) {
      console.warn('[charger-detail] failed to open maps', err);
    }
  }, [charger]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!mounted) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.borderStrong,
        width: 40,
      }}
      backgroundStyle={{ backgroundColor: theme.colors.background }}
      onClose={() => {
        setCharger(null);
        setOwner(null);
        setOwnerLoading(false);
      }}
    >
      <BottomSheetView style={styles.content}>
        {charger && ownerLoading ? (
          <SheetSkeleton charger={charger} />
        ) : charger && owner ? (
          <DetailContent
            charger={charger}
            owner={owner}
            onContact={onContact}
            onReview={onReview}
            onDirections={handleDirections}
            onClose={() => sheetRef.current?.close()}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
});

// ---------------------------------------------------------------------------
// Skeleton shown while the owner profile is loading
// ---------------------------------------------------------------------------

function SheetSkeleton({ charger }: { charger: Charger }): React.JSX.Element {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const bg = theme.colors.surfaceAlt;

  return (
    <>
      {/* Header skeleton — avatar + name + status pill */}
      <View style={styles.header}>
        <Animated.View
          style={[styles.skeletonAvatar, { backgroundColor: bg, opacity: pulseAnim }]}
        />
        <View style={styles.headerText}>
          <Animated.View
            style={[styles.skeletonLine, { width: '70%', height: 18, backgroundColor: bg, opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.skeletonLine, { width: '50%', height: 14, marginTop: 8, backgroundColor: bg, opacity: pulseAnim }]}
          />
        </View>
        <Animated.View
          style={[styles.skeletonPill, { backgroundColor: bg, opacity: pulseAnim }]}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Specs skeleton */}
      <View style={styles.specsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.spec}>
            <Animated.View
              style={[styles.skeletonSquare, { backgroundColor: bg, opacity: pulseAnim }]}
            />
            <View style={styles.specText}>
              <Animated.View
                style={[styles.skeletonLine, { width: '80%', height: 10, backgroundColor: bg, opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.skeletonLine, { width: '60%', height: 16, marginTop: 4, backgroundColor: bg, opacity: pulseAnim }]}
              />
            </View>
          </View>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Actions skeleton */}
      <View style={styles.actions}>
        {[1, 2, 3].map((i) => (
          <Animated.View
            key={i}
            style={[styles.skeletonButton, { backgroundColor: bg, opacity: pulseAnim }]}
          />
        ))}
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail content
// ---------------------------------------------------------------------------

interface DetailContentProps {
  charger: Charger;
  owner: User;
  onContact: (ownerId: string) => void;
  onReview?: (ownerId: string, chargerId: string) => void;
  onDirections: () => void;
  onClose: () => void;
}

function DetailContent({
  charger,
  owner,
  onContact,
  onReview,
  onDirections,
  onClose,
}: DetailContentProps): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;
  const isLoggedIn = !!currentUserId;
  const isOwnCharger = currentUserId === owner.id;
  const { data: ownerReviews } = useReviewsForUser(owner.id);

  // Auth prompt modal state
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'contactar' | 'reseñar'>('contactar');

  const showAuthPrompt = (action: 'contactar' | 'reseñar') => {
    setAuthModalAction(action);
    setAuthModalVisible(true);
  };

  const hasReviews = owner.reviewCount > 0;
  const displayRating = hasReviews ? formatRating(owner.rating) : null;
  const displayReviewCount = hasReviews ? formatReviewCount(owner.reviewCount) : null;

  // Live countdown timer — ticks every second when busy.
  const countdown = useCountdownTimer(
    charger.busySince ?? null,
    charger.estimatedDurationMinutes ?? null,
  );

  // Determine if the charger is "effectively available" — either status is
  // available, or the countdown has expired.
  const isEffectivelyAvailable =
    charger.status === 'available' || countdown.isExpired;

  return (
    <>
      {/* Header — avatar + owner name + rating + status pill */}
      <View style={styles.header}>
        <Avatar source={owner.avatarUrl} name={owner.name} size="lg" />
        <View style={styles.headerText}>
          <Text
            style={[
              theme.typography.h2,
              { color: theme.colors.text, marginBottom: 4 },
            ]}
            numberOfLines={1}
          >
            {owner.name}
          </Text>
          {displayRating ? (
            <View style={styles.ratingRow}>
              <Star
                color={theme.colors.warning}
                fill={theme.colors.warning}
                size={14}
              />
              <Text
                style={[
                  theme.typography.small,
                  { color: theme.colors.textMuted, marginLeft: 6 },
                ]}
              >
                {`${displayRating} (${displayReviewCount} reseñas)`}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                theme.typography.small,
                { color: theme.colors.textMuted },
              ]}
            >
              Sin reseñas aún
            </Text>
          )}
        </View>
        <StatusPill status={charger.status} />
      </View>

      <Divider style={styles.divider} />

      {/* Specs: POTENCIA | CONECTOR | PRECIO */}
      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Zap color={theme.colors.text} size={16} />
          <View style={styles.specText}>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted },
              ]}
            >
              POTENCIA
            </Text>
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.text, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {formatPower(charger.powerKw)}
            </Text>
          </View>
        </View>
        <View style={styles.specDivider} />
        <View style={styles.spec}>
          <Zap color={theme.colors.text} size={16} />
          <View style={styles.specText}>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted },
              ]}
            >
              CONECTOR
            </Text>
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.text, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {CONNECTOR_LABELS[charger.type]}
            </Text>
          </View>
        </View>
        <View style={styles.specDivider} />
        <View style={styles.spec}>
          <Banknote color={theme.colors.text} size={16} />
          <View style={styles.specText}>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted },
              ]}
            >
              PRECIO
            </Text>
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.text, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {formatPrice(charger.pricePerHour)}
            </Text>
          </View>
        </View>
      </View>

      {/* Charger description — only shown if the host wrote one */}
      {charger.description ? (
        <View style={styles.descriptionBlock}>
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginBottom: 4 },
            ]}
          >
            DESCRIPCIÓN
          </Text>
          <Text
            style={[theme.typography.body, { color: theme.colors.text }]}
          >
            {charger.description}
          </Text>
        </View>
      ) : null}

      {/* Countdown for non-available chargers — live ticking */}
      {!isEffectivelyAvailable ? (
        <View
          style={[
            styles.countdownBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[theme.typography.smallBold, { color: theme.colors.text }]}
          >
            {charger.status === 'reserved' ? 'Reservado' : 'Ocupado'}
          </Text>
          <Text
            style={[
              theme.typography.bodyBold,
              { color: theme.colors.warning, marginTop: 2 },
            ]}
          >
            {`Libre en ${countdown.display}`}
          </Text>
        </View>
      ) : null}

      <AvailabilitySection schedule={charger.schedule} />

      <Divider style={styles.divider} />

      {/* Actions — Contactar | Reseña | Cómo llegar (hidden for own charger) */}
      {!isOwnCharger && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              if (!isLoggedIn) {
                showAuthPrompt('contactar');
                return;
              }
              onContact(owner.id);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Contactar al anfitrión"
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
          <MessageCircle color={theme.colors.text} size={16} />
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.text, marginLeft: 6 },
            ]}
          >
            Contactar
          </Text>
          </Pressable>
          {onReview ? (
            <Pressable
              onPress={() => {
                if (!isLoggedIn) {
                  showAuthPrompt('reseñar');
                  return;
                }
                onReview(owner.id, charger.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dejar una reseña"
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSecondary,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Star color={theme.colors.warning} size={16} />
              <Text
                style={[
                  theme.typography.smallBold,
                  { color: theme.colors.text, marginLeft: 6 },
                ]}
              >
                Reseña
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={onDirections}
            accessibilityRole="button"
            accessibilityLabel="Cómo llegar al cargador"
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonPrimary,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Navigation color={theme.colors.textOnPrimary} size={16} />
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.textOnPrimary, marginLeft: 6 },
              ]}
            >
              Cómo llegar
            </Text>
          </Pressable>
        </View>
      )}

      <AuthPromptModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onLogin={() => {
          setAuthModalVisible(false);
          onClose();
          router.push('/(public)/login');
        }}
        action={authModalAction}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Availability section — weekly schedule display
// ---------------------------------------------------------------------------

function AvailabilitySection({ schedule }: { schedule?: DaySchedule[] }) {
  const theme = useTheme();
  if (!schedule || schedule.length === 0) return null;

  const enabledDays = schedule.filter((d) => d.enabled);
  if (enabledDays.length === 0) return null;

  const groups = groupByTime(enabledDays);

  return (
    <>
      <Divider style={styles.divider} />
      <View style={styles.availabilitySection}>
        <View style={styles.availabilityHeader}>
          <Clock color={theme.colors.textMuted} size={14} />
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.textMuted, marginLeft: 6 },
            ]}
          >
            DISPONIBILIDAD
          </Text>
        </View>
        {groups.map((group, idx) => (
          <View key={idx} style={styles.availabilityRow}>
            <Text
              style={[theme.typography.small, { color: theme.colors.text, flex: 1 }]}
            >
              {group.days}
            </Text>
            <Text
              style={[theme.typography.small, { color: theme.colors.textMuted }]}
            >
              {group.startTime}–{group.endTime}
            </Text>
          </View>
        ))}
        {enabledDays.length < 7 && (() => {
          const closed = getClosedDays(schedule);
          return closed ? (
            <View style={styles.availabilityRow}>
              <Text
                style={[theme.typography.small, { color: theme.colors.text, flex: 1 }]}
              >
                {closed}
              </Text>
              <Text
                style={[theme.typography.small, { color: theme.colors.danger }]}
              >
                Cerrado
              </Text>
            </View>
          ) : null;
        })()}
      </View>
    </>
  );
}

function groupByTime(days: DaySchedule[]): { days: string; startTime: string; endTime: string }[] {
  const map = new Map<string, number[]>();
  for (const d of days) {
    const key = `${d.startTime}–${d.endTime}`;
    const arr = map.get(key) ?? [];
    arr.push(d.day);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([time, dayIndices]) => {
    const parts = time.split('–');
    const startTime = parts[0]!;
    const endTime = parts[1]!;
    return { days: formatDayRange(dayIndices), startTime, endTime };
  });
}

function formatDayRange(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const labels = sorted.map((d) => DAY_SHORT_LABELS[d as keyof typeof DAY_SHORT_LABELS]);
  if (labels.length <= 2) return labels.join(' y ');
  return `${labels[0]}–${labels[labels.length - 1]}`;
}

function getClosedDays(schedule: DaySchedule[]): string {
  const closed = schedule
    .filter((d) => !d.enabled)
    .map((d) => DAY_SHORT_LABELS[d.day as keyof typeof DAY_SHORT_LABELS]);
  if (closed.length === 0) return '';
  if (closed.length <= 2) return closed.join(' y ');
  return `${closed[0]}–${closed[closed.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------

function StatusPill({
  status,
}: {
  status: ChargerStatus;
}): React.JSX.Element {
  const theme = useTheme();
  const tone: Record<ChargerStatus, { fg: string; bg: string }> = {
    available: { fg: theme.colors.success, bg: '#10B98122' },
    reserved: { fg: theme.colors.warning, bg: '#F59E0B22' },
    busy: { fg: theme.colors.textMuted, bg: '#94A3B822' },
  };
  const { fg, bg } = tone[status];
  return (
    <View
      style={[styles.statusPill, { backgroundColor: bg }]}
      accessibilityLabel={`Estado: ${STATUS_LABELS[status]}`}
    >
      <View style={[styles.statusDot, { backgroundColor: fg }]} />
      <Text
        style={[
          theme.typography.small,
          { color: fg, marginLeft: 6, fontWeight: '600' },
        ]}
      >
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    marginVertical: 16,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  spec: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specText: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginHorizontal: 10,
  },
  countdownBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    borderWidth: 1,
  },
  actionButtonPrimary: {
    borderColor: 'transparent',
  },
  skeletonAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  skeletonLine: {
    borderRadius: 4,
  },
  skeletonPill: {
    width: 72,
    height: 28,
    borderRadius: 9999,
    marginLeft: 8,
  },
  skeletonSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  skeletonButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
  },
  availabilitySection: {
    gap: 6,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionBlock: {
    marginTop: 8,
  },
});
