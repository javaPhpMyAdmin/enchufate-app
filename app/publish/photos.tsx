/**
 * Step 4 — Fotos.
 *
 * Renders the `PhotoPickerGrid` against the user's selection. v1 ships a
 * fixed pool of placeholder images; a real picker lands in a later phase.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PublishGateBanner, PhotoPickerGrid, WizardFooter } from '@/components/publish';
import { usePublishDraft } from '@/features/publish';
import { useTheme } from '@/theme';

export default function Step4Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update } = usePublishDraft();
  const [photoUrls, setPhotoUrls] = useState<string[]>(
    draft.step4?.photoUrls ?? [],
  );
  const [showError, setShowError] = useState<boolean>(false);

  const handleNext = (): void => {
    if (photoUrls.length < 1) {
      setShowError(true);
      return;
    }
    update(4, { photoUrls });
    router.replace('/publish/pricing');
  };

  const valid = photoUrls.length >= 1;

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PublishGateBanner />

        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            Elegí hasta 5 fotos
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Las fotos ayudan a que los conductores se hagan una idea del
            lugar antes de reservar.
          </Text>
        </View>

        <PhotoPickerGrid
          selected={photoUrls}
          onChange={(urls) => {
            setPhotoUrls(urls);
            setShowError(false);
          }}
        />
        {showError && photoUrls.length < 1 ? (
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.danger, marginTop: -4 },
            ]}
          >
            Elegí al menos una foto para continuar.
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.footerBar,
          {
            borderTopColor: theme.colors.border,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <WizardFooter
          canGoBack
          canGoNext={valid}
          onBack={() => router.back()}
          onNext={handleNext}
          isSubmitting={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
