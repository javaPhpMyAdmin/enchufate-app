/**
 * Step 1 — Nombre y descripción.
 *
 * Two text fields. Validation runs through `step1Schema`; the user can
 * only advance once the form is valid. The provider is the source of
 * truth for the current values so navigating away and back keeps the
 * input populated.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TextField } from '@/components/ui';
import {
  PublishGateBanner,
  WizardFooter,
} from '@/components/publish';
import {
  step1Schema,
  usePublishDraft,
} from '@/features/publish';
import { useTheme } from '@/theme';

export default function Step1Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update, isStepValid } = usePublishDraft();
  // We only keep local "error" / "showErrors" state — the values
  // themselves live in the provider so navigating back to the step
  // restores them.
  const [showErrors, setShowErrors] = useState<boolean>(false);

  const title = draft.step1?.title ?? '';
  const description = draft.step1?.description ?? '';

  const handleTitleChange = (next: string): void => {
    update(1, { title: next, description });
  };
  const handleDescriptionChange = (next: string): void => {
    update(1, { title, description: next });
  };

  const handleNext = (): void => {
    const result = step1Schema.safeParse({ title, description });
    if (!result.success) {
      setShowErrors(true);
      return;
    }
    router.push('/publish/location');
  };

  const titleError = showErrors ? getTitleError(title) : undefined;
  const descriptionError = showErrors
    ? getDescriptionError(description)
    : undefined;

  const valid = isStepValid(1);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { padding: theme.spacing.md, gap: theme.spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PublishGateBanner />

        <View>
          <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
            Contanos sobre tu cargador
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Un buen título y descripción ayudan a que los conductores elijan tu cargador.
          </Text>
        </View>

        <TextField
          label="Título"
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Ej: Cargador rápido en Palermo Soho"
          maxLength={60}
          error={titleError}
          autoCapitalize="sentences"
        />

        <View>
          <Text
            style={[
              theme.typography.smallBold,
              styles.label,
              { color: theme.colors.text },
            ]}
          >
            Descripción
          </Text>
          <TextField
            value={description}
            onChangeText={handleDescriptionChange}
            placeholder="Cargador tipo 2 de 11 kW en cochera cubierta..."
            multiline
            numberOfLines={5}
            maxLength={500}
            error={descriptionError}
            inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          {!descriptionError ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted, marginTop: 4, marginLeft: 4 },
              ]}
            >
              {`${description.length} / 500`}
            </Text>
          ) : null}
        </View>
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
          canGoBack={false}
          canGoNext={valid}
          onNext={handleNext}
          isSubmitting={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function getTitleError(value: string): string | undefined {
  if (!value) return 'Ingresá un título';
  if (value.length < 4) return 'El título debe tener al menos 4 caracteres';
  if (value.length > 60) return 'Máximo 60 caracteres';
  return undefined;
}

function getDescriptionError(value: string): string | undefined {
  if (!value) return 'Ingresá una descripción';
  if (value.length < 10) {
    return 'La descripción debe tener al menos 10 caracteres';
  }
  if (value.length > 500) return 'Máximo 500 caracteres';
  return undefined;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  label: {
    marginBottom: 6,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
