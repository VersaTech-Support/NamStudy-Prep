import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SemanticColors {
  // Surfaces
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textWhite: string;
  textOnPrimary: string;

  // Borders
  border: string;
  borderLight: string;
  divider: string;

  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentLight: string;

  // Status
  green: string;
  greenDark: string;
  greenLight: string;
  gold: string;
  goldDark: string;
  goldLight: string;
  red: string;
  redLight: string;

  // White (for overlays, badges, etc.)
  white: string;

  // Gradients (start, mid, end)
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;

  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
}

// ─── Light Colors (matches current COLORS) ──────────────────────────────────

const LIGHT_COLORS: SemanticColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  accent: '#3B82F6',
  accentLight: '#93C5FD',

  green: '#10B981',
  greenDark: '#059669',
  greenLight: '#D1FAE5',
  gold: '#F59E0B',
  goldDark: '#D97706',
  goldLight: '#FEF3C7',
  red: '#EF4444',
  redLight: '#FEE2E2',

  white: '#FFFFFF',

  gradientStart: '#7C3AED',
  gradientMid: '#3B82F6',
  gradientEnd: '#06B6D4',

  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#F1F5F9',
};

// ─── Dark Colors ────────────────────────────────────────────────────────────

const DARK_COLORS: SemanticColors = {
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceAlt: '#16162A',
  surfaceElevated: '#222240',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textWhite: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  border: '#2A2A40',
  borderLight: '#1E1E35',
  divider: '#2A2A40',

  primary: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryLight: '#C4B5FD',
  accent: '#60A5FA',
  accentLight: '#3B82F6',

  green: '#34D399',
  greenDark: '#10B981',
  greenLight: '#064E3B',
  gold: '#FBBF24',
  goldDark: '#F59E0B',
  goldLight: '#78350F',
  red: '#F87171',
  redLight: '#7F1D1D',

  white: '#FFFFFF',

  gradientStart: '#7C3AED',
  gradientMid: '#3B82F6',
  gradientEnd: '#06B6D4',

  tabBarBackground: '#0F0F1A',
  tabBarBorder: '#1E1E35',
};

// ─── Context ────────────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = '@namstudy_theme_mode';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: SemanticColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: LIGHT_COLORS,
  setMode: () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const isDark = useMemo(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [mode, systemColorScheme]);

  const colors = useMemo(() => (isDark ? DARK_COLORS : LIGHT_COLORS), [isDark]);

  const value = useMemo(
    () => ({ mode, isDark, colors, setMode }),
    [mode, isDark, colors]
  );

  // Don't render until we've loaded the persisted preference to prevent flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export { LIGHT_COLORS, DARK_COLORS };
