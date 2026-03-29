export const colors = {
  // Backgrounds
  background:  '#0A0A0A',
  surface:     '#1C1C1E',
  surface2:    '#2C2C2E',
  border:      '#3A3A3C',

  // Text
  textPrimary:   '#F5F5F5',
  textSecondary: '#A1A1AA',
  textMuted:     '#71717A',

  // Brand
  accent:      '#C9A84C',
  accentDark:  '#A8863A',
  accentLight: '#E8C86A',

  // Status
  success: '#10B981',
  danger:  '#EF4444',
  warning: '#F59E0B',
  purple:  '#8B5CF6',

  // Asset types
  needs:   '#C9A84C',
  wants:   '#8B5CF6',
  savings: '#10B981',
} as const

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const fontSize = {
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  '2xl': 24,
  '3xl': 30,
} as const

export const fontWeight = {
  normal:   '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
}
