/**
 * Success screen — confirmation after publish or update.
 *
 * Shows a checkmark, a short message that differs for create vs. update,
 * and a single CTA that returns to the owner dashboard.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';

export default function SuccessScreen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const isEdit = mode === 'edit';

  const title = isEdit ? 'Cargador actualizado' : 'Cargador publicado';
  const message = isEdit
    ? 'Los cambios ya están disponibles para los conductores.'
    : 'Tu cargador ya es visible en el mapa. Te avisaremos cuando alguien reserve.';

  const handleGoToList = (): void => {
    router.replace('/(tabs)/profile');
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.background, padding: theme.spacing.xl },
      ]}
    >
      <View style={styles.content}>
        <CheckCircle2 color={theme.colors.primary} size={80} />
        <Text
          style={[
            theme.typography.h1,
            { color: theme.colors.text, marginTop: 16, textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            theme.typography.body,
            {
              color: theme.colors.textMuted,
              marginTop: 8,
              textAlign: 'center',
              maxWidth: 320,
            },
          ]}
        >
          {message}
        </Text>
      </View>
      <Button
        label="Ir a Mis cargadores"
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleGoToList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
