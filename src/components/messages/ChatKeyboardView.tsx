/**
 * `<ChatKeyboardView />` — keyboard-aware wrapper for chat screens.
 *
 * Uses explicit Keyboard listeners to measure the real keyboard height
 * and apply it as bottom padding. This is more reliable than
 * `KeyboardAvoidingView` which can double-resize with Android's
 * `adjustResize` or miscalculate with SafeAreaView insets.
 */
import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface ChatKeyboardViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const KEYBOARD_ANIM_DURATION = 250;

export function ChatKeyboardView({
  children,
  style,
}: ChatKeyboardViewProps): React.JSX.Element {
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeight.value = withTiming(
          e.endCoordinates.height,
          { duration: KEYBOARD_ANIM_DURATION },
        );
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.value = withTiming(0, { duration: KEYBOARD_ANIM_DURATION });
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value > 0 ? keyboardHeight.value + 16 : 0,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
