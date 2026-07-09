/**
 * Modal primitive — a centered overlay with a backdrop and an animated
 * entrance (scale + fade). Used by `DeleteConfirmModal` and reserved for
 * upcoming flows that need a blocking confirm (e.g. discard changes,
 * cancel a booking in progress).
 *
 * This wraps the platform `<Modal>` so it can be nested inside any screen
 * without us having to wire up a separate `ModalProvider` portal.
 */
import React, { useEffect } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export interface ModalProps {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** Optional override for the centered content card. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Disable the backdrop tap-to-dismiss behavior. */
  disableBackdropDismiss?: boolean;
  /** Test ID forwarded to the root animated view. */
  testID?: string;
}

export function Modal({
  visible,
  onRequestClose,
  children,
  contentStyle,
  disableBackdropDismiss = false,
  testID,
}: ModalProps): React.JSX.Element {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + 0.06 * progress.value },
      { translateY: (1 - progress.value) * 12 },
    ],
  }));

  const handleBackdropPress = (): void => {
    if (!disableBackdropDismiss) onRequestClose();
  };

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.root} testID={testID}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: theme.colors.overlay },
            backdropStyle,
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
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
            cardStyle,
            contentStyle,
          ]}
        >
          {children}
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
});
