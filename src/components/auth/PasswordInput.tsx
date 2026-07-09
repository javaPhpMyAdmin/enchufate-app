/**
 * PasswordInput — themed text input with a show/hide toggle.
 *
 * Reuses the same visual language as the basic `TextField` (surface
 * background, bordered, error message below) but exposes only the props
 * relevant to a password field. The eye/eye-off affordance is required by
 * REQ-3.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  autoComplete?: 'current-password' | 'new-password';
  editable?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go' | 'send';
  testID?: string;
}

export function PasswordInput({
  value,
  onChangeText,
  onBlur,
  placeholder = 'Contraseña',
  error,
  autoComplete = 'current-password',
  editable = true,
  onSubmitEditing,
  returnKeyType,
  testID,
}: PasswordInputProps): React.JSX.Element {
  const theme = useTheme();
  const [hidden, setHidden] = useState(true);
  const hasError = !!error;

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
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={[
            styles.input,
            theme.typography.body,
            { color: theme.colors.text },
          ]}
        />
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
        >
          {hidden ? (
            <Eye color={theme.colors.textMuted} size={20} />
          ) : (
            <EyeOff color={theme.colors.textMuted} size={20} />
          )}
        </Pressable>
      </View>
      {hasError ? (
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
    marginLeft: 4,
  },
});
