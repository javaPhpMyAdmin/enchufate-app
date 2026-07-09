/**
 * ConnectorPicker — chip selector for the 5 supported connector types.
 *
 * Active chip is filled with the primary color. The optional `error` is
 * rendered below the row so the same component can be used with RHF
 * `formState.errors`.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConnectorType } from '@/data/types';
import { CONNECTOR_LABELS } from '@/data/types';
import { useTheme } from '@/theme';

export interface ConnectorPickerProps {
  value: ConnectorType | null | undefined;
  onChange: (next: ConnectorType) => void;
  error?: string;
}

const CONNECTORS: ConnectorType[] = [
  'type1',
  'type2',
  'ccs',
  'chademo',
  'tesla',
];

export function ConnectorPicker({
  value,
  onChange,
  error,
}: ConnectorPickerProps): React.JSX.Element {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.row}>
        {CONNECTORS.map((c) => {
          const active = c === value;
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              accessibilityRole="button"
              accessibilityLabel={`Conector ${CONNECTOR_LABELS[c]}`}
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
                numberOfLines={1}
              >
                {CONNECTOR_LABELS[c]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.danger, marginTop: 6 },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
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
});
