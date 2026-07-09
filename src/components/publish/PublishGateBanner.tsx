/**
 * PublishGateBanner — informational banner shown at the top of the wizard.
 *
 * Phase 7 will swap the body of `useCanPublish` for a real entitlement
 * check; the banner copy adapts to the reason returned. v1 is always
 * "free during beta".
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { useCanPublish } from '@/features/publish';
import { useTheme } from '@/theme';

export interface PublishGateBannerProps {
  /** Optional override — if not provided, the hook drives the copy. */
  reason?: 'beta' | 'subscription_active' | 'subscription_required';
}

const COPY: Record<string, string> = {
  beta: 'Publicar es gratis durante la beta. La suscripción de USD 10/mes llega pronto.',
  subscription_active: 'Tu suscripción está activa. Podés publicar todos los cargadores que quieras.',
  subscription_required:
    'Necesitás una suscripción activa para publicar. La beta termina pronto.',
};

export function PublishGateBanner({
  reason,
}: PublishGateBannerProps): React.JSX.Element | null {
  const theme = useTheme();
  const result = useCanPublish();
  const resolved = reason ?? result.reason;
  if (resolved === 'unauthenticated') return null;
  const copy = COPY[resolved] ?? COPY.beta!;
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#E0F2FE',
          borderColor: theme.colors.secondary,
          borderRadius: theme.radii.md,
        },
      ]}
      accessibilityRole="text"
    >
      <Sparkles color={theme.colors.secondary} size={18} />
      <Text
        style={[
          theme.typography.small,
          styles.text,
          { color: theme.colors.secondaryDark },
        ]}
      >
        {copy}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
});
