/**
 * Color tokens — white + electric orange brand palette.
 *
 * Light theme is the default. Tokens are dark-ready; a future `dark` palette
 * can be added without renaming the keys below.
 */
export const colors = {
  // Brand — electric orange
  primary: '#FF6600',
  primaryDark: '#E55500',
  primaryLight: '#FFD1B0',

  // Accent
  secondary: '#3B82F6',
  secondaryDark: '#1E40AF',

  // Surfaces
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',

  // Borders
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  // Text
  text: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Charger status (mirrored in the marker / badge system)
  // Note: stays green so it doesn't compete with the brand orange.
  chargerAvailable: '#10B981',
  chargerReserved: '#F59E0B',
  chargerBusy: '#94A3B8',

  // Misc
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export type ColorToken = keyof typeof colors;
