/**
 * `<ProfileSkeleton />` — loading placeholder for the Profile tab.
 *
 * Mirrors the authenticated profile layout: avatar circle + name/joined
 * bars, stats row (3 cells), and a charger card placeholder. Uses the
 * same setInterval opacity pulse as ConversationsListSkeleton and
 * ChatSkeleton to stay consistent across the app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const PULSE_INTERVAL_MS = 800;

export function ProfileSkeleton(): React.JSX.Element {
  const theme = useTheme();
  const [opacity, setOpacity] = useState<number>(0.4);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setOpacity((prev) => (prev === 0.4 ? 0.7 : 0.4));
    }, PULSE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header skeleton: avatar + name + joined */}
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
        <View
          style={[
            styles.nameBar,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
        <View
          style={[
            styles.joinedBar,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
      </View>

      {/* Stats skeleton: 3 stat cells in a row */}
      <View
        style={[
          styles.statsCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statCell}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
            <View
              style={[
                styles.statValue,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
            <View
              style={[
                styles.statLabel,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Charger card skeleton */}
      <View style={styles.chargerSection}>
        <View
          style={[
            styles.chargerCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.chargerRow}>
            <View
              style={[
                styles.chargerAvatar,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
            <View style={styles.chargerTextBlock}>
              <View
                style={[
                  styles.chargerTitle,
                  { backgroundColor: theme.colors.textMuted, opacity },
                ]}
              />
              <View
                style={[
                  styles.chargerSubtitle,
                  { backgroundColor: theme.colors.textMuted, opacity },
                ]}
              />
            </View>
            <View
              style={[
                styles.chargerBadge,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  nameBar: {
    height: 18,
    width: 140,
    borderRadius: 4,
    marginTop: 12,
  },
  joinedBar: {
    height: 12,
    width: 100,
    borderRadius: 4,
    marginTop: 8,
  },
  // Stats
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    flexDirection: 'row',
    paddingVertical: 16,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  statValue: {
    height: 16,
    width: 40,
    borderRadius: 4,
  },
  statLabel: {
    height: 10,
    width: 50,
    borderRadius: 4,
  },
  // Charger card
  chargerSection: {
    marginTop: 24,
  },
  chargerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chargerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chargerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  chargerTextBlock: {
    flex: 1,
    gap: 6,
  },
  chargerTitle: {
    height: 14,
    width: 120,
    borderRadius: 4,
  },
  chargerSubtitle: {
    height: 10,
    width: 80,
    borderRadius: 4,
  },
  chargerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
