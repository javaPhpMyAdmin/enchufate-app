import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  /**
   * Body content. Optional so a `Screen` can be used as a safe-area shell
   * for an early-return loading / auth-gated placeholder (see the messages
   * tab while `useAuth` is still resolving).
   */
  children?: React.ReactNode;
  /** When true, content scrolls. Defaults to true. */
  scroll?: boolean;
  /** Apply safe-area padding to specific edges. Defaults to all. */
  edges?: ReadonlyArray<Edge>;
  /** Optional padding override around the scroll/view content. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Status bar style. */
  statusBarStyle?: 'light' | 'dark' | 'auto';
  /** Background color override; otherwise theme.colors.background. */
  background?: string;
  /** Optional fixed header rendered above scrollable content. */
  header?: React.ReactNode;
  /** Optional fixed footer rendered below scrollable content. */
  footer?: React.ReactNode;
}

export function Screen({
  children,
  scroll = true,
  edges = ['top', 'left', 'right', 'bottom'],
  contentStyle,
  statusBarStyle = 'auto',
  background,
  header,
  footer,
}: ScreenProps): React.JSX.Element {
  const theme = useTheme();
  const bg = background ?? theme.colors.background;

  const resolvedBarStyle =
    statusBarStyle === 'auto'
      ? 'dark'
      : statusBarStyle;

  return (
    <SafeAreaView
      edges={edges as Edge[]}
      style={[styles.flex, { backgroundColor: bg }]}
    >
      <StatusBar
        barStyle={resolvedBarStyle === 'light' ? 'light-content' : 'dark-content'}
        backgroundColor={bg}
      />
      {header}
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          style={styles.flex}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
