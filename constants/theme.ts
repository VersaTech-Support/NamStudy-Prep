export const COLORS = {
  // Primary brand
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#A78BFA',
  
  // Accent
  accent: '#3B82F6',
  accentLight: '#93C5FD',
  
  // Free / Success
  green: '#10B981',
  greenDark: '#059669',
  greenLight: '#D1FAE5',
  
  // Premium / Gold
  gold: '#F59E0B',
  goldDark: '#D97706',
  goldLight: '#FEF3C7',
  
  // Danger
  red: '#EF4444',
  redLight: '#FEE2E2',
  
  // Neutrals
  white: '#FFFFFF',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Gradient colors
  gradientStart: '#7C3AED',
  gradientMid: '#3B82F6',
  gradientEnd: '#06B6D4',
};

export const GRADIENTS = {
  primary: ['#7C3AED', '#5B21B6'] as const,
  accent: ['#3B82F6', '#2563EB'] as const,
  gold: ['#F59E0B', '#D97706'] as const,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FONTS = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
};
