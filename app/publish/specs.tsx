/**
 * Step 3 — Conector y potencia.
 *
 * `ConnectorPicker` provides the 5 connector chips; the power input is a
 * numeric field with a 3.7–350 kW range. We keep the unit suffix on the
 * input for clarity.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TextField } from '@/components/ui';
import {
  ConnectorPicker,
  PublishGateBanner,
  WizardFooter,
} from '@/components/publish';
import { step3Schema, usePublishDraft } from '@/features/publish';
import type { ConnectorType } from '@/data/types';
import { useTheme } from '@/theme';

const CONNECTORS: ConnectorType[] = [
  'type1',
  'type2',
  'ccs',
  'chademo',
  'tesla',
];

export default function Step3Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update } = usePublishDraft();
  const [connector, setConnector] = useState<ConnectorType | undefined>(
    draft.step3?.connectorType,
  );
  const [power, setPower] = useState<string>(
    draft.step3?.powerKw ? String(draft.step3.powerKw) : '',
  );
  const [showErrors, setShowErrors] = useState<boolean>(false);

  const handleNext = (): void => {
    const parsedPower = Number.parseFloat(power);
    const result = step3Schema.safeParse({
      connectorType: connector,
      powerKw: parsedPower,
    });
    if (!result.success) {
      setShowErrors(true);
      return;
    }
    update(3, {
      connectorType: connector,
      powerKw: Number.isFinite(parsedPower) ? parsedPower : 0,
    });
    router.replace('/publish/photos');
  };

  const parsedPower = Number.parseFloat(power);
  const valid = step3Schema.safeParse({
    connectorType: connector,
    powerKw: Number.isFinite(parsedPower) ? parsedPower : 0,
  }).success;

  const connectorError = showErrors && !connector
    ? 'Elegí un tipo de conector'
    : undefined;
  const powerError = showErrors
    ? getPowerError(parsedPower)
    : undefined;

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
            Conector y potencia
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Especificá qué tipo de conector usás y cuánta potencia entrega tu cargador.
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
            Tipo de conector
          </Text>
          <ConnectorPicker
            value={connector}
            onChange={setConnector}
            error={connectorError}
          />
        </View>

        <View>
          <Text
            style={[
              theme.typography.smallBold,
              styles.label,
              { color: theme.colors.text },
            ]}
          >
            Potencia (kW)
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: theme.colors.surface,
                borderColor: powerError
                  ? theme.colors.danger
                  : theme.colors.border,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <TextInput
              value={power}
              onChangeText={(t) => setPower(t.replace(',', '.'))}
              onBlur={() => {
                const parsed = Number.parseFloat(power);
                update(3, {
                  connectorType: connector,
                  powerKw: Number.isFinite(parsed) ? parsed : 0,
                });
              }}
              keyboardType="numeric"
              placeholder="11"
              placeholderTextColor={theme.colors.textLight}
              style={[
                styles.input,
                theme.typography.body,
                { color: theme.colors.text },
              ]}
              maxLength={6}
            />
            <Text
              style={[
                theme.typography.smallBold,
                { color: theme.colors.textMuted, marginLeft: 8 },
              ]}
            >
              kW
            </Text>
          </View>
          {powerError ? (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.danger, marginTop: 4, marginLeft: 4 },
              ]}
            >
              {powerError}
            </Text>
          ) : (
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.textMuted, marginTop: 4, marginLeft: 4 },
              ]}
            >
              Entre 3.7 y 350 kW.
            </Text>
          )}
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

function getPowerError(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return 'Ingresá la potencia en kW';
  if (value < 3.7) return 'La potencia mínima es 3.7 kW';
  if (value > 350) return 'La potencia máxima es 350 kW';
  return undefined;
}

void CONNECTORS;

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
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
