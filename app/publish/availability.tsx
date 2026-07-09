/**
 * Step 6 — Disponibilidad.
 *
 * Renders the 7-day `ScheduleEditor`. Days can be toggled off; enabled
 * days have a start/end time range. The wizard defaults to 09:00–18:00
 * for every day.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PublishGateBanner, ScheduleEditor, WizardFooter } from '@/components/publish';
import {
  buildDefaultSchedule,
  usePublishDraft,
  type WeeklySchedule,
} from '@/features/publish';
import { useTheme } from '@/theme';

export default function Step6Screen(): React.JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { draft, update, isStepValid } = usePublishDraft();
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    draft.step6?.schedule ?? buildDefaultSchedule(),
  );

  useEffect(() => {
    update(6, { schedule });
  }, [schedule, update]);

  const handleNext = (): void => {
    router.push('/publish/rules');
  };

  const valid = isStepValid(6);

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
            ¿Cuándo está disponible?
          </Text>
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, marginTop: 6 },
            ]}
          >
            Activá los días en los que los conductores pueden reservar y
            definí el horario de cada uno.
          </Text>
        </View>

        <ScheduleEditor value={schedule} onChange={setSchedule} />
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
