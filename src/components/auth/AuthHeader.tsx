/**
 * AuthHeader — brand logo + title for login / register screens.
 *
 * Renders the real `assets/icon.png` as the brand mark so the logo
 * the user just placed in the project is what people see across the
 * auth flow. Below it sits the screen title and an optional subtitle.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

const BRAND_LOGO = require('../../../assets/icon.png');

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
      <Image
        source={BRAND_LOGO}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Enchufate"
      />
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
  logo: {
    width: 72,
    height: 72,
  },
});
