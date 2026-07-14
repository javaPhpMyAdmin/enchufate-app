/**
 * AuthPromptModal — shown when a non-authenticated user tries to
 * Contactar or leave a Reseña. Encourages login with brand styling.
 *
 * Uses RN Animated (not Reanimated) to avoid Expo Go crashes.
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Animated } from 'react-native';
import { LogIn, Star, X, Zap } from 'lucide-react-native';

import { Button } from './Button';
import { useTheme } from '@/theme';

export interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  /** What action triggered this prompt. Shows in the subtitle. */
  action?: 'contactar' | 'reseñar';
  contentStyle?: StyleProp<ViewStyle>;
}

export function AuthPromptModal({
  visible,
  onClose,
  onLogin,
  action = 'contactar',
  contentStyle,
}: AuthPromptModalProps): React.JSX.Element {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const cardScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const cardOpacity = progress;

  const actionLabel = action === 'reseñar' ? 'dejar una reseña' : 'contactar al anfitrión';
  const actionIcon = action === 'reseñar'
    ? <Star color={theme.colors.warning} size={32} />
    : <Zap color={theme.colors.primary} size={32} />;

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Backdrop */}
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

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.radii.xl,
            },
            theme.shadows.lg,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
            contentStyle,
          ]}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Cerrar"
          >
            <X color={theme.colors.textMuted} size={20} />
          </Pressable>

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface }]}>
            {actionIcon}
          </View>

          {/* Title */}
          <Text
            style={[
              theme.typography.h2,
              { color: theme.colors.text, textAlign: 'center', marginTop: 16 },
            ]}
          >
            Iniciá sesión
          </Text>

          {/* Subtitle */}
          <Text
            style={[
              theme.typography.body,
              { color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
            ]}
          >
            {`Necesitás iniciar sesión para ${actionLabel}.`}
          </Text>

          {/* Buttons */}
          <Button
            label="Iniciar sesión"
            onPress={onLogin}
            leftIcon={<LogIn color={theme.colors.textOnPrimary} size={18} />}
            fullWidth
          />
          <Button
            label="Cancelar"
            onPress={onClose}
            variant="ghost"
            fullWidth
            style={{ marginTop: 8 }}
          />
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
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
