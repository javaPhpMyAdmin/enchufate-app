/**
 * `<ConversationsListSkeleton />` — loading placeholder for the Messages tab.
 *
 * Renders a search bar placeholder plus 4–5 conversation row placeholders,
 * each with an avatar circle, two text bars (name + preview), and a small
 * badge circle on the right. A simple opacity pulse via setInterval gives
 * the appearance of loading without pulling in Reanimated.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const PULSE_INTERVAL_MS = 800;
const ROW_COUNT = 5;

export function ConversationsListSkeleton(): React.JSX.Element {
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
      {/* Search bar placeholder */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
      </View>

      {/* Conversation row placeholders */}
      {Array.from({ length: ROW_COUNT }).map((_, i) => (
        <View key={i} style={styles.row}>
          {/* Avatar circle */}
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.textMuted, opacity },
            ]}
          />
          {/* Name + preview bars */}
          <View style={styles.textBlock}>
            <View
              style={[
                styles.nameBar,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
            <View
              style={[
                styles.previewBar,
                { backgroundColor: theme.colors.textMuted, opacity },
              ]}
            />
          </View>
          {/* Unread badge placeholder */}
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.textMuted, opacity },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchWrap: {
    paddingBottom: 12,
  },
  searchBar: {
    height: 40,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  nameBar: {
    height: 14,
    width: 120,
    borderRadius: 4,
  },
  previewBar: {
    height: 10,
    width: 180,
    borderRadius: 4,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
