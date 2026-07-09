/**
 * AuthHeader — brand mark + title for login / register screens.
 *
 * Renders the EV bolt inside a circular bubble (so the brand mark is
 * consistent across auth flows) and centers the title and an optional
 * subtitle beneath it.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Zap } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuthHeader({
  title,
  subtitle,
}: AuthHeaderProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.logoBubble,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Zap
          color={theme.colors.primary}
          size={28}
          fill={theme.colors.primary}
        />
      </View>
      <Text
        style={[
          theme.typography.h1,
          {
            color: theme.colors.text,
            marginTop: theme.spacing.md,
            textAlign: 'center',
          },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            theme.typography.body,
            {
              color: theme.colors.textMuted,
              marginTop: theme.spacing.xs,
              textAlign: 'center',
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
