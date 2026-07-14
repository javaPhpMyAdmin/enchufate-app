/**
 * Step 4 — Fotos.
 *
 * Renders the `PhotoPickerGrid` for selecting photos from the device
 * gallery. On "Next", local URIs are uploaded to Supabase Storage and
 * the resulting public URLs are saved to the wizard draft.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PublishGateBanner, PhotoPickerGrid, WizardFooter } from '@/components/publish';
import { useAuth } from '@/features/auth';
import { usePublishDraft } from '@/features/publish';
import { uploadChargerPhotos } from '@/lib/photoUpload';
import { useTheme } from '@/theme';

export default function Step4Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update } = usePublishDraft();
  const { session } = useAuth();

  const [localUris, setLocalUris] = useState<string[]>(
    draft.step4?.photoUrls ?? [],
  );
  const [showError, setShowError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleNext = async (): Promise<void> => {
    if (localUris.length < 1) {
      setShowError(true);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      setShowError(true);
      return;
    }

    setIsUploading(true);
    try {
      // Upload all selected photos to Supabase Storage
      const photoUrls = await uploadChargerPhotos(localUris, userId);
      update(4, { photoUrls });
      router.replace('/publish/pricing');
    } catch (err) {
      console.error('[photos] upload failed:', err);
      setShowError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const valid = localUris.length >= 1;

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
          selected={localUris}
          onChange={(uris) => {
            setLocalUris(uris);
            setShowError(false);
          }}
        />
        {showError && localUris.length < 1 ? (
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.danger, marginTop: -4 },
            ]}
          >
            Elegí al menos una foto para continuar.
          </Text>
        ) : null}
        {showError && localUris.length >= 1 && !session?.user?.id ? (
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.danger, marginTop: -4 },
            ]}
          >
            Necesitás estar logueado para subir fotos.
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
        {isUploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={[
                theme.typography.body,
                { color: theme.colors.textMuted, marginLeft: 8 },
              ]}
            >
              Subiendo fotos...
            </Text>
          </View>
        ) : (
          <WizardFooter
            canGoBack
            canGoNext={valid}
            onBack={() => router.back()}
            onNext={handleNext}
            isSubmitting={false}
          />
        )}
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
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
