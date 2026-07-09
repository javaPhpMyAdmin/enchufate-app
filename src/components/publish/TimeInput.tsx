/**
 * TimeInput — minimal `HH:mm` text field with structural validation.
 *
 * We avoid `@react-native-community/datetimepicker` for v1 because the
 * platform pickers are noisy and inconsistent across iOS/Android. Plain
 * text keeps the keyboard compact and makes the schedule editor feel
 * like a real form. Validation runs on blur and on every keystroke once
 * the field has been touched, surfacing the error in the same style as
 * the other inputs.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface TimeInputProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  testID?: string;
}

/**
 * Sanitize the raw text so the user can type `"9:0"` or `"0900"` without
 * the field rejecting every intermediate state. We accept any 1-4 digits
 * (and an optional colon) and reformat to `HH:mm` when we have enough.
 */
function sanitize(input: string): string {
  const digitsOnly = input.replace(/[^\d]/g, '').slice(0, 4);
  if (digitsOnly.length <= 2) return digitsOnly;
  return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
}

export function TimeInput({
  value,
  onChange,
  onBlur,
  placeholder = 'HH:mm',
  error,
  testID,
}: TimeInputProps): React.JSX.Element {
  const theme = useTheme();
  const hasError = !!error;

  const handleChange = useCallback(
    (raw: string) => {
      onChange(sanitize(raw));
    },
    [onChange],
  );

  return (
    <View>
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: hasError ? theme.colors.danger : theme.colors.border,
          },
        ]}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          keyboardType="numeric"
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={5}
          style={[
            styles.input,
            theme.typography.bodyBold,
            { color: theme.colors.text },
          ]}
        />
      </View>
      {hasError ? (
        <Text
          style={[
            theme.typography.caption,
            { color: theme.colors.danger, marginTop: 4 },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Pure helper used by the schedule editor. */
export function isValidTimeString(value: string): boolean {
  return TIME_REGEX.test(value);
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  input: {
    paddingVertical: 0,
    minWidth: 64,
    textAlign: 'center',
  },
});
