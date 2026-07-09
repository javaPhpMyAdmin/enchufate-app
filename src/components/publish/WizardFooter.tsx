/**
 * WizardFooter — bottom-of-screen Back/Next controls shared by every step.
 *
 * On the last step the Next label switches to "Publicar" / "Guardar" so
 * the same footer can drive both create and edit flows. The component is
 * dumb — all state lives in the publish provider / step page.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui';

export interface WizardFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  canGoBack?: boolean;
  canGoNext?: boolean;
  isSubmitting?: boolean;
}

export function WizardFooter({
  onBack,
  onNext,
  nextLabel = 'Siguiente',
  backLabel = 'Atrás',
  canGoBack = true,
  canGoNext = true,
  isSubmitting = false,
}: WizardFooterProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.backWrap}>
        {canGoBack ? (
          <Button
            label={backLabel}
            variant="ghost"
            size="md"
            onPress={onBack}
            disabled={isSubmitting}
            fullWidth
          />
        ) : null}
      </View>
      <View style={styles.nextWrap}>
        <Button
          label={nextLabel}
          variant="primary"
          size="md"
          onPress={onNext}
          loading={isSubmitting}
          disabled={!canGoNext || isSubmitting}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  backWrap: {
    flex: 1,
  },
  nextWrap: {
    flex: 2,
  },
});
