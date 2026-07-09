/**
 * OwnerChargerCard — charger card used in the "Mis cargadores" list.
 *
 * Compared to the public `ChargerCard`, this view:
 *   - shows the host's own charger (no owner row, no rating row),
 *   - shows a status badge in the header,
 *   - exposes an overflow menu (Editar / Eliminar) via the `...` button.
 *
 * Tapping the card body still triggers `onPress`, which the dashboard
 * uses to show the same detail sheet as the map.
 */
import React, { useState } from 'react';
import {
  Image,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Edit3,
  MoreVertical,
  Trash2,
  Zap,
} from 'lucide-react-native';

import { Card } from '@/components/ui';
import type { Charger } from '@/data/types';
import { CONNECTOR_LABELS } from '@/data/types';
import { formatPower, formatPrice } from '@/lib/format';
import { useTheme } from '@/theme';

import { ChargerStatusBadge } from './ChargerStatusBadge';

export interface OwnerChargerCardProps {
  charger: Charger;
  onPress: (chargerId: string) => void;
  onEdit: (chargerId: string) => void;
  onDelete: (chargerId: string) => void;
}

export function OwnerChargerCard({
  charger,
  onPress,
  onEdit,
  onDelete,
}: OwnerChargerCardProps): React.JSX.Element {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const photo = charger.photos?.[0];

  return (
    <Pressable
      onPress={() => onPress(charger.id)}
      android_ripple={{ color: theme.colors.surfaceAlt }}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Cargador ${charger.title}`}
    >
      <Card variant="elevated" padded={false}>
        <View style={styles.row}>
          <View
            style={[
              styles.cover,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <Zap color={theme.colors.textLight} size={28} />
            )}
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  theme.typography.bodyBold,
                  styles.title,
                  { color: theme.colors.text },
                ]}
                numberOfLines={1}
              >
                {charger.title}
              </Text>
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={8}
                accessibilityLabel="Más opciones"
                accessibilityRole="button"
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <MoreVertical color={theme.colors.textMuted} size={20} />
              </Pressable>
            </View>
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {charger.neighborhood}
            </Text>
            <View style={styles.specsRow}>
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
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textMuted },
                ]}
              >
                {CONNECTOR_LABELS[charger.type]}
              </Text>
            </View>
            <View style={styles.footer}>
              <Text
                style={[theme.typography.bodyBold, { color: theme.colors.primary }]}
              >
                {formatPrice(charger.pricePerHour)}
              </Text>
              <ChargerStatusBadge status={charger.status} />
            </View>
          </View>
        </View>
      </Card>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            key: 'edit',
            label: 'Editar',
            icon: <Edit3 color={theme.colors.text} size={18} />,
            onPress: () => {
              setMenuOpen(false);
              onEdit(charger.id);
            },
          },
          {
            key: 'delete',
            label: 'Eliminar',
            icon: <Trash2 color={theme.colors.danger} size={18} />,
            destructive: true,
            onPress: () => {
              setMenuOpen(false);
              onDelete(charger.id);
            },
          },
        ]}
      />
    </Pressable>
  );
}

interface ActionSheetAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

function ActionSheet({
  visible,
  onClose,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  actions: ActionSheetAction[];
}): React.JSX.Element {
  const theme = useTheme();
  return (
    <RNModal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.sheetBackdrop, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityLabel="Cerrar menú"
        accessibilityRole="button"
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheetCard,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.lg,
            },
            theme.shadows.lg,
          ]}
        >
          {actions.map((a, idx) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              style={({ pressed }) => [
                styles.sheetItem,
                {
                  borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.border,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              {a.icon}
              <Text
                style={[
                  theme.typography.body,
                  {
                    color: a.destructive
                      ? theme.colors.danger
                      : theme.colors.text,
                    marginLeft: 12,
                  },
                ]}
              >
                {a.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  cover: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sheetBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 48,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: 4,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
