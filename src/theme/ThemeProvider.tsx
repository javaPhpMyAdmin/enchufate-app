import React, { createContext, useContext, useMemo } from 'react';

import { colors } from './colors';
import { radii } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
  shadows: typeof shadows;
}

const defaultTheme: Theme = {
  colors,
  spacing,
  typography,
  radii,
  shadows,
};

const ThemeContext = createContext<Theme>(defaultTheme);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Reserved for future dark mode toggle. Defaults to the light palette. */
  value?: Theme;
}

export function ThemeProvider({
  children,
  value,
}: ThemeProviderProps): React.JSX.Element {
  // `value` is exposed so a future dark palette can be injected without
  // changing call sites. We still default to the light theme.
  const theme = useMemo<Theme>(() => value ?? defaultTheme, [value]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
