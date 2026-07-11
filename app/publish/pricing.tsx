/**
 * Step 5 — Precio y tiempo mínimo.
 *
 * Price is a free-form numeric input (1–50 USD/hr); min-rental time is a
 * 5-chip selector. The chips are exposed by the publish feature as
 * `MIN_RENTAL_OPTIONS`.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PublishGateBanner, WizardFooter } from '@/components/publish';
import { MIN_RENTAL_OPTIONS, usePublishDraft } from '@/features/publish';
import { useTheme } from '@/theme';

export default function Step5Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update, isStepValid } = usePublishDraft();
  const [price, setPrice] = useState<string>(
    draft.step5?.pricePerHour ? String(draft.step5.pricePerHour) : '',
  );
  const [minMinutes, setMinMinutes] = useState<number | null>(
    draft.step5?.minRentalMinutes ?? null,
  );
  const [showErrors, setShowErrors] = useState<boolean>(false);

  useEffect(() => {
    const parsedPrice = Number.parseFloat(price);
    update(5, {
      pricePerHour: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      minRentalMinutes: minMinutes ?? 0,
    });
  }, [price, minMinutes, update]);

  const parsedPrice = Number.parseFloat(price);
  const priceError = showErrors ? getPriceError(parsedPrice) : undefined;
  const minutesError =
    showErrors && !minMinutes ? 'Elegí un tiempo mínimo' : undefined;

  const handleNext = (): void => {
    if (
      getPriceError(parsedPrice) ||
      !minMinutes
    ) {
      setShowErrors(true);
      return;
    }
    router.replace('/publish/availability');
  };

  const valid = isStepValid(5);

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
            Precio y tiempo mínimo
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Definí cuánto cobrás por hora de carga y el tiempo mínimo de reserva.
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
            Precio por hora (USD)
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: priceError
                  ? theme.colors.danger
                  : theme.colors.border,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <Text
              style={[
                theme.typography.bodyBold,
                { color: theme.colors.textMuted, marginRight: 6 },
              ]}
            >
              USD
            </Text>
            <TextInput
              value={price}
              onChangeText={(t) => setPrice(t.replace(',', '.'))}
              keyboardType="numeric"
              placeholder="6"
              placeholderTextColor={theme.colors.textLight}
              style={[
                styles.input,
                theme.typography.body,
                { color: theme.colors.text },
              ]}
              maxLength={5}
            />
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.textMuted, marginLeft: 6 },
              ]}
            >
              / hora
            </Text>
          </View>
          {priceError ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.danger, marginTop: 4, marginLeft: 4 },
              ]}
            >
              {priceError}
            </Text>
          ) : null}
        </View>

        <View>
          <Text
            style={[
              theme.typography.smallBold,
              styles.label,
              { color: theme.colors.text },
            ]}
          >
            Tiempo mínimo de reserva
          </Text>
          <View style={styles.chipRow}>
            {MIN_RENTAL_OPTIONS.map((opt) => {
              const active = opt.minutes === minMinutes;
              return (
                <Pressable
                  key={opt.minutes}
                  onPress={() => setMinMinutes(opt.minutes)}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} mínimo`}
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderColor: active
                        ? theme.colors.primary
                        : theme.colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      theme.typography.smallBold,
                      {
                        color: active
                          ? theme.colors.textOnPrimary
                          : theme.colors.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {minutesError ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.danger, marginTop: 6 },
              ]}
            >
              {minutesError}
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
          canGoBack
          canGoNext={valid}
          onBack={() => router.back()}
          onNext={handleNext}
          isSubmitting={false}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function getPriceError(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return 'Ingresá un precio por hora';
  if (value < 1) return 'El precio mínimo es USD 1';
  if (value > 50) return 'El precio máximo es USD 50';
  return undefined;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
