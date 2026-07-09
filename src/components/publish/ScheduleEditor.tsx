/**
 * ScheduleEditor — 7-day weekly availability grid.
 *
 * Each row has a day label, an on/off toggle, and (when enabled) two
 * `TimeInput`s for the start and end of the available window. We expose
 * the full schedule as a single `WeeklySchedule` value so the parent can
 * keep one source of truth.
 */
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import {
  DAY_LABELS,
  type DayIndex,
  type DaySchedule,
  type WeeklySchedule,
} from '@/features/publish';
import { TimeInput, isValidTimeString } from './TimeInput';

export interface ScheduleEditorProps {
  value: WeeklySchedule;
  onChange: (next: WeeklySchedule) => void;
  /** Optional error message for the whole schedule. */
  error?: string;
}

export function ScheduleEditor({
  value,
  onChange,
  error,
}: ScheduleEditorProps): React.JSX.Element {
  const theme = useTheme();
  const setDay = (day: DayIndex, patch: Partial<DaySchedule>): void => {
    const next = value.map((entry) =>
      entry.day === day ? { ...entry, ...patch } : entry,
    ) as unknown as WeeklySchedule;
    onChange(next);
  };

  return (
    <View>
      {value.map((day) => (
        <View
          key={day.day}
          style={[
            styles.row,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              opacity: day.enabled ? 1 : 0.7,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text
                style={[theme.typography.smallBold, { color: theme.colors.text }]}
              >
                {DAY_LABELS[day.day]}
              </Text>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.textMuted, marginTop: 2 },
                ]}
              >
                {day.enabled ? 'Disponible' : 'Cerrado'}
              </Text>
            </View>
            <Switch
              value={day.enabled}
              onValueChange={(v) => setDay(day.day, { enabled: v })}
              trackColor={{
                true: theme.colors.primary,
                false: theme.colors.borderStrong,
              }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Activar ${DAY_LABELS[day.day]}`}
            />
          </View>
          {day.enabled ? (
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted, marginBottom: 4 },
                  ]}
                >
                  Desde
                </Text>
                <TimeInput
                  value={day.startTime}
                  onChange={(v) => setDay(day.day, { startTime: v })}
                  error={
                    day.startTime && !isValidTimeString(day.startTime)
                      ? 'Formato HH:mm'
                      : undefined
                  }
                />
              </View>
              <View style={styles.timeField}>
                <Text
                  style={[
                    theme.typography.caption,
                    { color: theme.colors.textMuted, marginBottom: 4 },
                  ]}
                >
                  Hasta
                </Text>
                <TimeInput
                  value={day.endTime}
                  onChange={(v) => setDay(day.day, { endTime: v })}
                  error={
                    day.endTime && !isValidTimeString(day.endTime)
                      ? 'Formato HH:mm'
                      : undefined
                  }
                />
              </View>
            </View>
          ) : null}
        </View>
      ))}
      {error ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.danger, marginTop: 8 },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// Pressable would be used for future row-level interactions (tap-to-expand, etc.).
// Kept as a comment so future devs know it's an option.

const styles = StyleSheet.create({
  row: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
  },
});
