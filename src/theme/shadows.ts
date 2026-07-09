import { Platform, type ViewStyle } from 'react-native';

/**
 * Soft, EV-tinted shadows. iOS uses `shadow*` props, Android uses `elevation`.
 */
function shadow(
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(1, 2, 0.06, 1),
  md: shadow(2, 8, 0.08, 3),
  lg: shadow(6, 18, 0.12, 8),
} as const;

export type ShadowToken = keyof typeof shadows;
