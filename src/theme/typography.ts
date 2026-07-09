import type { TextStyle } from 'react-native';

/**
 * Typography scale.
 *
 * Each entry is a `TextStyle` fragment — fonts live in `assets/fonts/` once
 * the brand typeface is decided. For now we use the platform default.
 */
const base: TextStyle = {
  fontSize: 14,
  lineHeight: 20,
  fontWeight: '400',
};

export const typography = {
  display: {
    ...base,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  h1: {
    ...base,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  h2: {
    ...base,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  h3: {
    ...base,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  bodyBold: {
    ...base,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    ...base,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  smallBold: {
    ...base,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  small: {
    ...base,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  micro: {
    ...base,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
