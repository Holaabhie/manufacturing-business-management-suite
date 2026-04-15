/**
 * Apple Design Tokens
 * iOS-inspired design system constants for the Manufacturing OS
 * 
 * Based on Apple's Human Interface Guidelines:
 * - SF Pro typography scale (Dynamic Type)
 * - iOS system colors (light + dark)
 * - 8pt grid spacing system
 * - Continuous corner radius
 * - Glassmorphism blur values
 */

// ─── System Colors (Light Mode) ──────────────────────────
export const iosColors = {
    // Primary system colors
    blue: '#007AFF',
    green: '#34C759',
    red: '#FF3B30',
    orange: '#FF9500',
    yellow: '#FFCC00',
    purple: '#AF52DE',
    pink: '#FF2D55',
    teal: '#5AC8FA',
    indigo: '#5856D6',
    mint: '#00C7BE',
    cyan: '#32ADE6',
    brown: '#A2845E',

    // Background layers
    backgroundPrimary: '#FFFFFF',
    backgroundSecondary: '#F2F2F7',
    backgroundTertiary: '#FFFFFF',
    backgroundGrouped: '#F2F2F7',
    backgroundGroupedSecondary: '#FFFFFF',

    // Label hierarchy
    labelPrimary: 'rgba(0, 0, 0, 0.85)',
    labelSecondary: 'rgba(60, 60, 67, 0.6)',
    labelTertiary: 'rgba(60, 60, 67, 0.3)',
    labelQuaternary: 'rgba(60, 60, 67, 0.18)',

    // Fill colors
    fillPrimary: 'rgba(120, 120, 128, 0.2)',
    fillSecondary: 'rgba(120, 120, 128, 0.16)',
    fillTertiary: 'rgba(120, 120, 128, 0.12)',
    fillQuaternary: 'rgba(120, 120, 128, 0.08)',

    // Separator
    separator: 'rgba(60, 60, 67, 0.29)',
    separatorOpaque: '#C6C6C8',

    // System grays
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
} as const;

// ─── Dark Mode Colors ────────────────────────────────────
export const iosDarkColors = {
    // Primary system colors (adjusted for dark)
    blue: '#0A84FF',
    green: '#30D158',
    red: '#FF453A',
    orange: '#FF9F0A',
    yellow: '#FFD60A',
    purple: '#BF5AF2',
    pink: '#FF375F',
    teal: '#64D2FF',
    indigo: '#5E5CE6',
    mint: '#63E6E2',
    cyan: '#70D7FF',
    brown: '#AC8E68',

    // Background layers
    backgroundPrimary: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',
    backgroundGrouped: '#000000',
    backgroundGroupedSecondary: '#1C1C1E',

    // Elevated surfaces
    backgroundElevatedPrimary: '#1C1C1E',
    backgroundElevatedSecondary: '#2C2C2E',
    backgroundElevatedTertiary: '#3A3A3C',

    // Label hierarchy
    labelPrimary: 'rgba(255, 255, 255, 0.85)',
    labelSecondary: 'rgba(235, 235, 245, 0.6)',
    labelTertiary: 'rgba(235, 235, 245, 0.3)',
    labelQuaternary: 'rgba(235, 235, 245, 0.18)',

    // Fill colors
    fillPrimary: 'rgba(120, 120, 128, 0.36)',
    fillSecondary: 'rgba(120, 120, 128, 0.32)',
    fillTertiary: 'rgba(120, 120, 128, 0.24)',
    fillQuaternary: 'rgba(120, 120, 128, 0.18)',

    // Separator
    separator: 'rgba(84, 84, 88, 0.65)',
    separatorOpaque: '#38383A',

    // System grays
    gray: '#8E8E93',
    gray2: '#636366',
    gray3: '#48484A',
    gray4: '#3A3A3C',
    gray5: '#2C2C2E',
    gray6: '#1C1C1E',
} as const;

// ─── Typography Scale (iOS Dynamic Type) ─────────────────
export const iosTypography = {
    largeTitle: {
        fontSize: '34px',
        fontWeight: 700,
        lineHeight: '41px',
        letterSpacing: '0.37px',
    },
    title1: {
        fontSize: '28px',
        fontWeight: 700,
        lineHeight: '34px',
        letterSpacing: '0.36px',
    },
    title2: {
        fontSize: '22px',
        fontWeight: 700,
        lineHeight: '28px',
        letterSpacing: '0.35px',
    },
    title3: {
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '25px',
        letterSpacing: '0.38px',
    },
    headline: {
        fontSize: '17px',
        fontWeight: 600,
        lineHeight: '22px',
        letterSpacing: '-0.41px',
    },
    body: {
        fontSize: '17px',
        fontWeight: 400,
        lineHeight: '22px',
        letterSpacing: '-0.41px',
    },
    callout: {
        fontSize: '16px',
        fontWeight: 400,
        lineHeight: '21px',
        letterSpacing: '-0.32px',
    },
    subheadline: {
        fontSize: '15px',
        fontWeight: 400,
        lineHeight: '20px',
        letterSpacing: '-0.24px',
    },
    footnote: {
        fontSize: '13px',
        fontWeight: 400,
        lineHeight: '18px',
        letterSpacing: '-0.08px',
    },
    caption1: {
        fontSize: '12px',
        fontWeight: 400,
        lineHeight: '16px',
        letterSpacing: '0px',
    },
    caption2: {
        fontSize: '11px',
        fontWeight: 400,
        lineHeight: '13px',
        letterSpacing: '0.07px',
    },
} as const;

// ─── Spacing (8pt Grid) ──────────────────────────────────
export const iosSpacing = {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
} as const;

// ─── Border Radius (Continuous/Squircle) ─────────────────
export const iosRadius = {
    xs: '6px',
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
} as const;

// ─── Blur Values ─────────────────────────────────────────
export const iosBlur = {
    light: '20px',
    regular: '40px',
    heavy: '80px',
    ultraThin: '10px',
} as const;

// ─── Shadows ─────────────────────────────────────────────
export const iosShadows = {
    xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.06)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.16)',
    card: '0 2px 8px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.06)',
    cardHover: '0 8px 24px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.08)',
    button: '0 1px 4px rgba(0, 122, 255, 0.3)',
    floating: '0 12px 40px rgba(0, 0, 0, 0.15)',
} as const;

// ─── Spring Animation Configs ────────────────────────────
export const iosSpring = {
    /** Gentle bounce for cards and hover effects */
    gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
    /** Snappy for button presses */
    snappy: { type: 'spring' as const, stiffness: 400, damping: 17 },
    /** Bouncy for modal/sheet entries */
    bouncy: { type: 'spring' as const, stiffness: 300, damping: 30 },
    /** Stiff for switch toggles */
    stiff: { type: 'spring' as const, stiffness: 700, damping: 30 },
    /** Smooth for page transitions */
    smooth: { type: 'spring' as const, stiffness: 150, damping: 25 },
} as const;

// ─── Easing Curves ───────────────────────────────────────
export const iosEasing = {
    /** iOS default ease — smooth deceleration */
    default: [0.16, 1, 0.3, 1] as const,
    /** For entering elements */
    easeOut: [0, 0, 0.2, 1] as const,
    /** For exiting elements */
    easeIn: [0.4, 0, 1, 1] as const,
    /** Emphasized ease for important transitions */
    emphasized: [0.2, 0, 0, 1] as const,
} as const;

// ─── Font Family Stack ───────────────────────────────────
export const iosFontFamily = {
    sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"SF Pro Display"',
        '"SF Pro Text"',
        '"Inter"',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
    ].join(', '),
    mono: [
        '"SF Mono"',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        '"Liberation Mono"',
        '"Courier New"',
        'monospace',
    ].join(', '),
} as const;

// ─── Z-Index Scale ───────────────────────────────────────
export const iosZIndex = {
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
export const iosBreakpoints = {
    mobile: 375,
    tablet: 768,
    desktop: 1024,
    largeDesktop: 1440,
} as const;
