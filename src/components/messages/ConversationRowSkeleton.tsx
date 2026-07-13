/**
 * `<ConversationRowSkeleton />` — single-row loading placeholder for the
 * conversations list. Mirrors the `ConversationListItem` layout: avatar
 * circle + name bar + preview bar + small badge circle.
 *
 * Uses the same opacity-pulse pattern as the existing skeletons.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const PULSE_INTERVAL_MS = 800;

export function ConversationRowSkeleton(): React.JSX.Element {
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
    <View style={styles.row}>
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
      {/* Timestamp + badge placeholder */}
      <View style={styles.endBlock}>
        <View
          style={[
            styles.timeBar,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  endBlock: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeBar: {
    height: 10,
    width: 40,
    borderRadius: 4,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
