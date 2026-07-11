/**
 * Step 7 — Reglas del propietario.
 *
 * Optional free-form text (max 300 chars). The "Publicar" button here
 * validates the full draft, dispatches to the store, clears the draft
 * and routes to the success screen.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PublishGateBanner, WizardFooter } from '@/components/publish';
import { TextField } from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  fullDraftSchema,
  usePublishDraft,
} from '@/features/publish';
import { chargerStore } from '@/data/chargerStore';
import { useTheme } from '@/theme';

export default function Step7Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { draft, update, reset, isStepValid, editingId } = usePublishDraft();
  const [rules, setRules] = useState<string>(draft.step7?.rules ?? '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    update(7, { rules });
  }, [rules, update]);

  const valid = isStepValid(7);
  const nextLabel = editingId ? 'Guardar cambios' : 'Publicar';

  const handleSubmit = async (): Promise<void> => {
    if (!session) {
      Alert.alert(
        'Iniciá sesión',
        'Necesitás iniciar sesión para publicar un cargador.',
      );
      router.replace('/(public)/login');
      return;
    }
    setSubmitting(true);
    try {
      const fullDraft = {
        step1: draft.step1!,
        step2: draft.step2!,
        step3: draft.step3!,
        step4: draft.step4!,
        step5: draft.step5!,
        step6: draft.step6!,
        step7: { rules: rules || undefined },
      };
      const parsed = fullDraftSchema.parse(fullDraft);
      const ownerId = session.user.id;

      if (editingId) {
        await chargerStore.update(editingId, {
          title: parsed.step1.title,
          description: parsed.step1.description,
          type: parsed.step3.connectorType,
          powerKw: parsed.step3.powerKw,
          location: parsed.step2.location,
          address: parsed.step2.address,
          pricePerHour: parsed.step5.pricePerHour,
          photos: parsed.step4.photoUrls,
        });
      } else {
        await chargerStore.add({
          ownerId,
          title: parsed.step1.title,
          description: parsed.step1.description,
          type: parsed.step3.connectorType,
          powerKw: parsed.step3.powerKw,
          location: parsed.step2.location,
          address: parsed.step2.address,
          neighborhood: deriveNeighborhood(parsed.step2.address),
          city: 'Montevideo',
          pricePerHour: parsed.step5.pricePerHour,
          photos: parsed.step4.photoUrls,
          status: 'available',
        });
      }

      await reset();
      router.replace({
        pathname: '/publish/success',
        params: { mode: editingId ? 'edit' : 'create' },
      });
    } catch (err) {
      console.warn('[publish-step7] submit failed', err);
      const message =
        err instanceof Error
          ? err.message
          : 'No pudimos publicar tu cargador. Probá de nuevo.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

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
            Reglas del propietario
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Opcional. Contale a los conductores cualquier detalle útil
            (cómo acceder al cargador, restricciones, horarios, etc.).
          </Text>
        </View>

        <View>
          <Text
            style={[
              theme.typography.smallBold,
              styles.label,
              { color: theme.colors.text },
            ]}
          >
            Reglas (opcional)
          </Text>
          <Step7Input
            value={rules}
            onChange={setRules}
            maxLength={300}
            placeholder="Ej: Pedí el chip de acceso por mensaje antes de llegar."
          />
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textMuted, marginTop: 4, marginLeft: 4 },
            ]}
          >
            {`${rules.length} / 300`}
          </Text>
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
          canGoBack
          canGoNext={valid}
          onBack={() => router.back()}
          onNext={() => void handleSubmit()}
          isSubmitting={submitting}
          nextLabel={nextLabel}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Local input — kept as a sub-component so the styles stay co-located.
// ---------------------------------------------------------------------------

function Step7Input({
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder: string;
}): React.JSX.Element {
  return (
    <TextField
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      multiline
      numberOfLines={5}
      maxLength={maxLength}
      inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
    />
  );
}

/**
 * Naive neighborhood extractor: take the last comma-separated token from
 * the typed address. The host can edit the field after publish if it's
 * wrong. v1 only — Phase 7 will plug in a real geocoder.
 */
function deriveNeighborhood(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'CABA';
  return parts[parts.length - 1]!;
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
