/**
 * `<ChatInput />` — the message composer at the bottom of the chat.
 *
 * Layout: a rounded text field with a primary send button on the
 * right. The send button is disabled when the input is empty or
 * whitespace-only. We use a controlled `value` from the parent so
 * clearing after send is a one-liner.
 *
 * The TextInput is multiline-aware up to ~5 lines so the input grows
 * with the message but doesn't take over the screen. Pressing return
 * on an empty/single-line input triggers send; with `multiline` set
 * we let the user break lines explicitly.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Send } from 'lucide-react-native';

import { useTheme } from '@/theme';

export interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const MAX_HEIGHT = 120;

export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Escribí un mensaje',
  style,
  disabled = false,
}: ChatInputProps): React.JSX.Element {
  const theme = useTheme();
  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          multiline
          editable={!disabled}
          maxLength={1000}
          style={[
            styles.input,
            theme.typography.body,
            { color: theme.colors.text, maxHeight: MAX_HEIGHT },
          ]}
          // Send on return unless the user is in multiline mode
          // (Shift+Enter on web; on mobile, return = newline).
          onSubmitEditing={() => {
            if (canSend) onSend();
          }}
          blurOnSubmit={false}
          returnKeyType="default"
        />
      </View>
      <Pressable
        onPress={() => {
          if (canSend) onSend();
        }}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
        style={({ pressed }) => [
          styles.sendBtn,
          {
            backgroundColor: '#FF6600',
            opacity: canSend ? (pressed ? 0.85 : 1) : 0.4,
          },
        ]}
      >
        <Send
          color="#FFFFFF"
          size={20}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
