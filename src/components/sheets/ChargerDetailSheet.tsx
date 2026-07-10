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
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Banknote,
  MessageCircle,
  Navigation,
  Star,
  Zap,
} from 'lucide-react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Avatar, Divider } from '@/components/ui';
import type { Charger, ChargerStatus, User } from '@/data/types';
import { STATUS_LABELS } from '@/data/types';
import {
  formatCountdown,
  formatPower,
  formatPrice,
  formatRating,
  formatReviewCount,
} from '@/lib/format';
import { useTheme } from '@/theme';

export interface ChargerDetailSheetHandle {
  show: (charger: Charger, owner: User) => void;
  close: () => void;
}

export interface ChargerDetailSheetProps {
  /** Fired when the user taps "Contactar". Receives owner id. */
  onContact: (ownerId: string) => void;
}

const SNAP_POINTS = ['35%', '60%', '92%'];

export const ChargerDetailSheet = forwardRef<
  ChargerDetailSheetHandle,
  ChargerDetailSheetProps
>(function ChargerDetailSheet({ onContact }, ref) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheet | null>(null);

  const [charger, setCharger] = useState<Charger | null>(null);
  const [owner, setOwner] = useState<User | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      show: (c, o) => {
        setCharger(c);
        setOwner(o);
        sheetRef.current?.snapToIndex(0);
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
      }}
    >
      <BottomSheetView style={styles.content}>
        {charger && owner ? (
          <DetailContent
            charger={charger}
            owner={owner}
            onContact={onContact}
            onDirections={handleDirections}
            onClose={() => sheetRef.current?.close()}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
});

// ---------------------------------------------------------------------------
// Detail content
// ---------------------------------------------------------------------------

interface DetailContentProps {
  charger: Charger;
  owner: User;
  onContact: (ownerId: string) => void;
  onDirections: () => void;
  onClose: () => void;
}

function DetailContent({
  charger,
  owner,
  onContact,
  onDirections,
  onClose,
}: DetailContentProps): React.JSX.Element {
  const theme = useTheme();
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
              {`${formatRating(owner.rating)} (${formatReviewCount(owner.reviewCount)} reseñas)`}
            </Text>
          </View>
        </View>
        <StatusPill status={charger.status} />
      </View>

      <Divider style={styles.divider} />

      {/* Specs: POTENCIA | PRECIO */}
      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Zap color={theme.colors.text} size={20} />
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
                theme.typography.h3,
                { color: theme.colors.text, marginTop: 2 },
              ]}
            >
              {formatPower(charger.powerKw)}
            </Text>
          </View>
        </View>
        <View style={styles.specDivider} />
        <View style={styles.spec}>
          <Banknote color={theme.colors.text} size={20} />
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
                theme.typography.h3,
                { color: theme.colors.text, marginTop: 2 },
              ]}
            >
              {`${formatPrice(charger.pricePerHour)}/h`}
            </Text>
          </View>
        </View>
      </View>

      {/* Countdown for non-available chargers */}
      {charger.status !== 'available' && charger.availableInMinutes ? (
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
            {`Libre en ${formatCountdown(charger.availableInMinutes)}`}
          </Text>
        </View>
      ) : null}

      <Divider style={styles.divider} />

      {/* Actions — Contactar | Cómo llegar */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            onContact(owner.id);
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Contactar al anfitrión"
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonSecondary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MessageCircle color={theme.colors.text} size={18} />
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.text, marginLeft: 8 },
            ]}
          >
            Contactar
          </Text>
        </Pressable>
        <Pressable
          onPress={onDirections}
          accessibilityRole="button"
          accessibilityLabel="Cómo llegar al cargador"
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonPrimary,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Navigation color={theme.colors.textOnPrimary} size={18} />
          <Text
            style={[
              theme.typography.smallBold,
              { color: theme.colors.textOnPrimary, marginLeft: 8 },
            ]}
          >
            Cómo llegar
          </Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
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
    gap: 10,
  },
  specText: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginHorizontal: 16,
  },
  countdownBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  actionButtonPrimary: {
    backgroundColor: '#FF6600',
    borderColor: 'transparent',
  },
});
