/**
 * Enterprise Design Tokens
 * IND Manager — Premium Enterprise ERP Design System
 *
 * Design Principles:
 * - Operational Clarity: Data-first, low visual fatigue
 * - Consistent Hierarchy: Predictable, scannable layouts
 * - Enterprise-grade: Inter typography, tabular-nums, dense data tables
 * - WCAG 2.1 AA compliant contrast ratios
 */

// ─── Enterprise Color Palette (Light Mode) ───────────────
export const erpColors = {
  // Primary
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: 'rgba(37, 99, 235, 0.08)',

  // Semantic
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#0EA5E9',

  // Backgrounds
  background: '#F3F5F9',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  muted: '#F1F5F9',

  // Text hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders
  border: 'rgba(15, 23, 42, 0.06)',
  borderStrong: 'rgba(15, 23, 42, 0.12)',
  borderSubtle: 'rgba(15, 23, 42, 0.04)',

  // Neutrals
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
} as const;

// ─── Dark Mode Colors ────────────────────────────────────
export const erpDarkColors = {
  // Primary
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryLight: 'rgba(59, 130, 246, 0.12)',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',

  // Backgrounds
  background: '#0F1117',
  surface: 'rgba(255, 255, 255, 0.04)',
  elevated: 'rgba(255, 255, 255, 0.06)',
  muted: '#1E293B',

  // Text hierarchy
  textPrimary: '#F1F5F9',
  textSecondary: 'rgba(241, 245, 249, 0.6)',
  textTertiary: 'rgba(241, 245, 249, 0.35)',
  textInverse: '#0F172A',

  // Borders
  border: 'rgba(241, 245, 249, 0.08)',
  borderStrong: 'rgba(241, 245, 249, 0.12)',
  borderSubtle: 'rgba(241, 245, 249, 0.04)',
} as const;

// ─── Typography Scale (Inter, 14px base) ─────────────────
export const erpTypography = {
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '1.2',
    letterSpacing: '-0.025em',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '1.3',
    letterSpacing: '-0.02em',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '1.4',
    letterSpacing: '-0.01em',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.4',
  },
  body: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  small: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '1.4',
  },
  overline: {
    fontSize: '11px',
    fontWeight: 600,
    lineHeight: '1.3',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  tabularNums: {
    fontVariantNumeric: 'tabular-nums',
  },
} as const;

// ─── Spacing (4px base) ──────────────────────────────────
export const erpSpacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// ─── Border Radius ───────────────────────────────────────
export const erpRadius = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// ─── Shadows ─────────────────────────────────────────────
export const erpShadows = {
  soft: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
  medium: '0 4px 12px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
  large: '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
  overlay: '0 16px 40px rgba(15, 23, 42, 0.12)',
} as const;

// ─── Transitions (simple ease, no spring) ────────────────
export const erpTransitions = {
  fast: '120ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const;

// ─── Font Family Stack ───────────────────────────────────
export const erpFontFamily = {
  sans: [
    'var(--font-inter, "Inter")',
    '"Noto Sans Devanagari"',
    '"Noto Sans Gujarati"',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'sans-serif',
  ].join(', '),
  mono: [
    '"SF Mono"',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'monospace',
  ].join(', '),
} as const;

// ─── Z-Index Scale ───────────────────────────────────────
export const erpZIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// ─── Breakpoints ─────────────────────────────────────────
export const erpBreakpoints = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
} as const;
