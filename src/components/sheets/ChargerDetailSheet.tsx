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
import { Star, Zap, MapPin, MessageCircle, User as UserIcon, Navigation } from 'lucide-react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Avatar, Badge, Divider } from '@/components/ui';
import type { Charger, ChargerStatus, User } from '@/data/types';
import { CONNECTOR_LABELS, STATUS_LABELS } from '@/data/types';
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
  /** Stub fired when the user taps "Contactar". Receives owner id. */
  onContact: (ownerId: string) => void;
  /** Stub fired when the user taps "Ver perfil". Receives owner id. */
  onViewProfile: (ownerId: string) => void;
}

const SNAP_POINTS = ['18%', '55%', '92%'];

export const ChargerDetailSheet = forwardRef<
  ChargerDetailSheetHandle,
  ChargerDetailSheetProps
>(function ChargerDetailSheet({ onContact, onViewProfile }, ref) {
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
        // Snap to peek so the user sees the highlight immediately.
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
            onViewProfile={onViewProfile}
            onDirections={handleDirections}
            onClose={() => sheetRef.current?.close()}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
});

interface DetailContentProps {
  charger: Charger;
  owner: User;
  onContact: (ownerId: string) => void;
  onViewProfile: (ownerId: string) => void;
  onDirections: () => void;
  onClose: () => void;
}

function DetailContent({
  charger,
  owner,
  onContact,
  onViewProfile,
  onDirections,
  onClose,
}: DetailContentProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <>
        {/* Header — owner */}
        <View style={styles.header}>
          <Avatar source={owner.avatarUrl} name={owner.name} size="lg" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
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
                  { color: theme.colors.textMuted, marginLeft: 4 },
                ]}
              >
                {formatRating(owner.rating)} · {formatReviewCount(owner.reviewCount)}
              </Text>
            </View>
          </View>
          <StatusChip status={charger.status} />
        </View>

        <Text
          style={[
            theme.typography.h3,
            { color: theme.colors.text, marginTop: 16 },
          ]}
        >
          {charger.title}
        </Text>

        <View style={[styles.specsRow, { marginTop: 12 }]}>
          <Spec
            icon={<Zap color={theme.colors.primary} size={18} />}
            label="Conector"
            value={CONNECTOR_LABELS[charger.type]}
          />
          <Spec
            icon={<MapPin color={theme.colors.textMuted} size={18} />}
            label="Potencia"
            value={formatPower(charger.powerKw)}
          />
        </View>
        <View style={styles.specsRow}>
          <Spec
            icon={<Navigation color={theme.colors.textMuted} size={18} />}
            label="Precio"
            value={formatPrice(charger.pricePerHour)}
          />
          <Spec
            icon={<Star color={theme.colors.textMuted} size={18} />}
            label="Rating"
            value={formatRating(charger.rating)}
          />
        </View>

        {/* Status / countdown */}
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
            <Text style={[theme.typography.smallBold, { color: theme.colors.text }]}>
              {charger.status === 'reserved' ? 'Reservado' : 'Ocupado'}
            </Text>
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.warning, marginTop: 2 },
              ]}
            >
              Libre en {formatCountdown(charger.availableInMinutes)}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 12 }}>
          <Text style={[theme.typography.small, { color: theme.colors.textMuted }]}>
            {charger.address} · {charger.neighborhood}
          </Text>
        </View>

        <Divider style={{ marginVertical: 12 }} />

        <Text style={[theme.typography.body, { color: theme.colors.text }]}>
          {charger.description}
        </Text>

        {charger.amenities && charger.amenities.length > 0 ? (
          <View style={styles.amenitiesRow}>
            {charger.amenities.map((a) => (
              <View
                key={a}
                style={[
                  styles.amenityChip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {a}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <ActionButton
            icon={<MessageCircle color={theme.colors.textOnPrimary} size={18} />}
            label="Contactar"
            variant="primary"
            onPress={() => {
              onContact(owner.id);
              onClose();
            }}
          />
          <ActionButton
            icon={<UserIcon color={theme.colors.text} size={18} />}
            label="Ver perfil"
            variant="secondary"
            onPress={() => {
              onViewProfile(owner.id);
              onClose();
            }}
          />
          <ActionButton
            icon={<Navigation color={theme.colors.text} size={18} />}
            label="Cómo llegar"
            variant="secondary"
            onPress={onDirections}
          />
        </View>
    </>
  );
}

function StatusChip({ status }: { status: ChargerStatus }): React.JSX.Element {
  const statusToTone: Record<ChargerStatus, 'available' | 'reserved' | 'busy'> = {
    available: 'available',
    reserved: 'reserved',
    busy: 'busy',
  };
  return (
    <Badge status={statusToTone[status]} tone="solid" label={STATUS_LABELS[status]} />
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.spec}>
      <View style={styles.specHeader}>
        {icon}
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.textMuted, marginLeft: 6 },
          ]}
        >
          {label}
        </Text>
      </View>
      <Text style={[theme.typography.bodyBold, { color: theme.colors.text, marginTop: 4 }]}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  variant,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isPrimary
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: isPrimary ? 'transparent' : theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={[
          theme.typography.smallBold,
          {
            color: isPrimary ? theme.colors.textOnPrimary : theme.colors.text,
            marginLeft: 6,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  specsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  spec: {
    flex: 1,
    paddingVertical: 8,
  },
  specHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  amenityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
