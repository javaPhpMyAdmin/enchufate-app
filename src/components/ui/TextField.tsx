import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

export type TextFieldAutoComplete =
  | 'email'
  | 'password'
  | 'username'
  | 'name'
  | 'tel'
  | 'postal-address'
  | 'off';

export type TextFieldReturnKeyType =
  | 'done'
  | 'go'
  | 'next'
  | 'search'
  | 'send';

export interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoComplete?: TextFieldAutoComplete;
  editable?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  returnKeyType?: TextFieldReturnKeyType;
  onSubmitEditing?: () => void;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  helper,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoComplete = 'off',
  editable = true,
  secureTextEntry = false,
  multiline = false,
  numberOfLines,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  leftAdornment,
  rightAdornment,
  containerStyle,
  inputStyle,
  testID,
}: TextFieldProps): React.JSX.Element {
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={[
            theme.typography.smallBold,
            styles.label,
            { color: theme.colors.text },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: hasError ? theme.colors.danger : theme.colors.border,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {leftAdornment ? (
          <View style={styles.adornment}>{leftAdornment}</View>
        ) : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          editable={editable}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={[
            styles.input,
            theme.typography.body,
            { color: theme.colors.text },
            inputStyle,
          ]}
        />
        {rightAdornment ? (
          <View style={styles.adornment}>{rightAdornment}</View>
        ) : null}
      </View>
      {hasError ? (
        <Text
          style={[
            styles.message,
            { color: theme.colors.danger },
          ]}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text
          style={[
            theme.typography.caption,
            styles.message,
            { color: theme.colors.textMuted },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  wrap: {
    flexDirection: 'row',
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
  adornment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 4,
    marginLeft: 4,
  },
});
