// Design tokens — values match ChildShield AI Screens.dc.html exactly.

export const palette = {
  teal: '#009C9C',
  ink: '#054240',
  lightTeal: '#3CC0C0',
  amber: '#FC9C24',
  warmBg: '#FBF6EE',
  officerBg: '#F4F0E6',
  white: '#FFFFFF',

  // Dark theme
  darkSurface: '#0E2B29',
  darkCard: '#163B38',
  darkCardAlt: '#1D4744',
  darkAccent: '#4FD1CB',
  darkText: '#E8F2F0',
  darkTextMuted: '#9CC4C1',
  darkFaint: '#5E8683',
  darkDot: '#2E6360',

  // Text
  textMuted: '#6B8B89',
  textFaint: '#9AA5A0',
  inkSoft: '#3F6664',
  disabledText: '#A9ABA0',
  amberInk: '#7A5310',

  // Surfaces / tints
  tealTint: '#EAF3F2',
  tealTintAlt: '#E9F5F4',
  amberTint: '#FFF6E8',
  track: '#E4DED0',
  officerChipBg: '#F4F0E6',
  skeletonA: '#E9E4D8',
  skeletonB: '#EFEBE1',
  cream: '#FBF9F4',
  caretFaint: '#C9C2B2',

  // Severity (officer views ONLY — never in child flows)
  critical: '#C23B3B',
  criticalBg: '#FFE3E3',
  criticalBgSoft: '#FFEDED',
  criticalInk: '#8A3030',
  criticalPanel: '#FFF5F5',
  high: '#D9731C',
  highBg: '#FCE7D3',
  highBadge: '#E8823C',
  medium: '#A6801D',
  mediumDot: '#C79A2E',
  mediumBg: '#F5EBC8',
  low: '#5B8C86',
  lowBg: '#DEEAE9',
} as const;

export const hairline = 'rgba(5,66,64,0.08)';
export const hairlineStrong = 'rgba(5,66,64,0.14)';

export const radius = {
  tile: 12,
  tileLg: 16,
  input: 15,
  button: 17,
  card: 19,
  cardLg: 22,
  hero: 26,
  pill: 999,
} as const;

export const font = {
  heading: 'Baloo2_700Bold',
  headingX: 'Baloo2_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtra: 'Manrope_800ExtraBold',
} as const;

export interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  heading: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  border: string;
  track: string;
  tileBg: string;
  amberTint: string;
}

export const lightColors: ThemeColors = {
  bg: palette.warmBg,
  card: palette.white,
  cardAlt: palette.tealTint,
  heading: palette.ink,
  text: palette.ink,
  muted: palette.textMuted,
  faint: palette.textFaint,
  accent: palette.teal,
  border: hairlineStrong,
  track: palette.track,
  tileBg: palette.tealTint,
  amberTint: palette.amberTint,
};

export const darkColors: ThemeColors = {
  bg: palette.darkSurface,
  card: palette.darkCard,
  cardAlt: palette.darkCardAlt,
  heading: palette.darkText,
  text: palette.darkText,
  muted: palette.darkTextMuted,
  faint: palette.darkFaint,
  accent: palette.darkAccent,
  border: palette.darkCard,
  track: palette.darkCardAlt,
  tileBg: palette.darkCard,
  amberTint: palette.darkCardAlt,
};

export const severityColor = {
  CRITICAL: { fg: palette.critical, bg: palette.criticalBg, tile: palette.criticalBgSoft },
  HIGH: { fg: palette.high, bg: palette.highBg, tile: palette.highBg },
  MEDIUM: { fg: palette.medium, bg: palette.mediumBg, tile: palette.mediumBg },
  LOW: { fg: palette.low, bg: palette.lowBg, tile: palette.lowBg },
} as const;
