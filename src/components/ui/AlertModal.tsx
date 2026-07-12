/**
 * AlertModal — reusable replacement for React Native's Alert.alert().
 *
 * Two modes:
 *   - info:    single "Entendido" button (errors, validation, "próximamente")
 *   - confirm: "Cancelar" + action button (logout, delete, etc.)
 *
 * Uses RN Animated (NOT Reanimated — Expo Go constraint).
 * Consistent with AuthPromptModal and DurationPickerModal styling.
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Animated } from 'react-native';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';

export type AlertModalVariant = 'info' | 'confirm' | 'success' | 'error';

export interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** 'confirm' shows Cancel + Action. Others show a single "Entendido". */
  variant?: AlertModalVariant;
  /** Label for the primary action button in confirm mode. */
  actionLabel?: string;
  /** Called when the user taps the primary action button. */
  onAction?: () => void;
  /** Label for the single dismiss button in info/error/success mode. */
  dismissLabel?: string;
}

export function AlertModal({
  visible,
  onClose,
  title,
  message,
  variant = 'info',
  actionLabel = 'Confirmar',
  onAction,
  dismissLabel = 'Entendido',
}: AlertModalProps): React.JSX.Element {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const cardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const isConfirm = variant === 'confirm';

  const iconMap: Record<AlertModalVariant, React.ReactNode | null> = {
    info: <Info color={theme.colors.primary} size={32} />,
    confirm: <AlertCircle color={theme.colors.warning} size={32} />,
    success: <CheckCircle color={theme.colors.success} size={32} />,
    error: <AlertCircle color={theme.colors.danger} size={32} />,
  };

  const icon = iconMap[variant];

  const handleAction = (): void => {
    onClose();
    onAction?.();
  };

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: '#000', opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.xl,
            },
            theme.shadows.lg,
            { opacity: progress, transform: [{ scale: cardScale }] },
          ]}
        >
          {/* Icon */}
          {icon ? (
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface }]}>
              {icon}
            </View>
          ) : null}

          {/* Title */}
          <Text
            style={[
              theme.typography.h3,
              {
                color: theme.colors.text,
                textAlign: 'center',
                marginTop: icon ? 16 : 0,
                marginBottom: message ? 8 : 20,
              },
            ]}
          >
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text
              style={[
                theme.typography.body,
                {
                  color: theme.colors.textMuted,
                  textAlign: 'center',
                  marginBottom: 24,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}

          {/* Buttons */}
          {isConfirm ? (
            <View style={styles.buttonRow}>
              <Button
                label="Cancelar"
                onPress={onClose}
                variant="secondary"
                style={styles.buttonHalf}
              />
              <Button
                label={actionLabel}
                onPress={handleAction}
                variant="primary"
                style={styles.buttonHalf}
              />
            </View>
          ) : (
            <Button
              label={dismissLabel}
              onPress={onClose}
              fullWidth
            />
          )}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonHalf: {
    flex: 1,
  },
});
