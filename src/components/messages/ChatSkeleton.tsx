/**
 * `<ChatSkeleton />` — loading placeholder for the chat screen.
 *
 * Renders a static skeleton that mirrors the ChatHeader layout
 * (back button area + avatar circle + name/status bars) plus
 * 4–5 alternating message bubble placeholders. A simple opacity
 * pulse via setInterval gives the appearance of loading without
 * pulling in Reanimated or the Animated API.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const PULSE_INTERVAL_MS = 800;

const BUBBLE_CONFIGS = [
  { width: '50%' as const, align: 'flex-start' as const },
  { width: '70%' as const, align: 'flex-end' as const },
  { width: '40%' as const, align: 'flex-start' as const },
  { width: '60%' as const, align: 'flex-end' as const },
  { width: '45%' as const, align: 'flex-start' as const },
];

export function ChatSkeleton(): React.JSX.Element {
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
      {/* Header skeleton */}
      <View
        style={[
          styles.headerRow,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        {/* Back button placeholder */}
        <View style={styles.backBtnPlaceholder} />
        {/* Avatar circle */}
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: theme.colors.textMuted, opacity },
          ]}
        />
        {/* Name + status bars */}
        <View style={styles.nameBlock}>
          <View
            style={[
              styles.nameBar,
              { backgroundColor: theme.colors.textMuted, opacity },
            ]}
          />
          <View
            style={[
              styles.statusBar,
              { backgroundColor: theme.colors.textMuted, opacity },
            ]}
          />
        </View>
      </View>

      {/* Message skeletons */}
      <View style={styles.messagesArea}>
        {BUBBLE_CONFIGS.map((cfg, i) => (
          <View
            key={i}
            style={[styles.bubbleRow, { justifyContent: cfg.align }]}
          >
            <View
              style={[
                styles.bubble,
                {
                  width: cfg.width,
                  backgroundColor: theme.colors.textMuted,
                  opacity,
                },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nameBlock: {
    flex: 1,
    gap: 6,
  },
  nameBar: {
    height: 14,
    width: 140,
    borderRadius: 4,
  },
  statusBar: {
    height: 10,
    width: 80,
    borderRadius: 4,
  },
  messagesArea: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubble: {
    height: 36,
    borderRadius: 12,
    maxWidth: '80%',
  },
});
