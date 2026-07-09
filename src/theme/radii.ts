/**
 * Border radius scale.
 */
export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
