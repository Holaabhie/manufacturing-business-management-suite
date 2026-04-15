/**
 * Framer Motion Animation Variants
 * iOS-inspired spring physics and easing curves
 */
import type { Variants, Transition } from 'framer-motion';

// ─── Spring Configurations ───────────────────────────────
export const spring = {
    gentle: { type: 'spring', stiffness: 200, damping: 20 } as Transition,
    snappy: { type: 'spring', stiffness: 400, damping: 17 } as Transition,
    bouncy: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
    stiff: { type: 'spring', stiffness: 700, damping: 30 } as Transition,
    smooth: { type: 'spring', stiffness: 150, damping: 25 } as Transition,
};

// ─── iOS Easing ──────────────────────────────────────────
export const iosEase = [0.16, 1, 0.3, 1] as const;

// ─── Page Transition ─────────────────────────────────────
export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 1, 1],
        },
    },
};

// ─── Staggered Children ──────────────────────────────────
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem: Variants = {
    initial: {
        opacity: 0,
        y: 16,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

// ─── Card Hover ──────────────────────────────────────────
export const cardHover: Variants = {
    initial: {
        scale: 1,
    },
    hover: {
        scale: 1.01,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
        },
    },
    tap: {
        scale: 0.98,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
        },
    },
};

// ─── Button Press ────────────────────────────────────────
export const buttonPress: Variants = {
    idle: {
        scale: 1,
    },
    hover: {
        scale: 1.02,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
        },
    },
    tap: {
        scale: 0.95,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
            duration: 0.1,
        },
    },
};

// ─── List Item ───────────────────────────────────────────
export const listItemVariant: Variants = {
    initial: {
        opacity: 0,
        x: -8,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
        },
    },
    tap: {
        scale: 0.98,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
            duration: 0.15,
        },
    },
};

// ─── Modal / Sheet ───────────────────────────────────────
export const modalBackdrop: Variants = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.15,
            ease: 'easeIn',
        },
    },
};

export const sheetSlideUp: Variants = {
    initial: {
        y: '100%',
    },
    animate: {
        y: 0,
        transition: {
            type: 'spring',
            damping: 30,
            stiffness: 300,
        },
    },
    exit: {
        y: '100%',
        transition: {
            type: 'spring',
            damping: 30,
            stiffness: 300,
        },
    },
};

export const modalScale: Variants = {
    initial: {
        opacity: 0,
        scale: 0.95,
    },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            damping: 30,
            stiffness: 300,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: {
            duration: 0.15,
            ease: 'easeIn',
        },
    },
};

// ─── Toast ───────────────────────────────────────────────
export const toastSlideIn: Variants = {
    initial: {
        opacity: 0,
        y: -20,
        scale: 0.95,
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            damping: 25,
            stiffness: 300,
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        transition: {
            duration: 0.15,
            ease: 'easeIn',
        },
    },
};

// ─── Switch Toggle ───────────────────────────────────────
export const switchKnob = {
    off: {
        x: 2,
        transition: {
            type: 'spring',
            stiffness: 700,
            damping: 30,
        },
    },
    on: {
        x: 22,
        transition: {
            type: 'spring',
            stiffness: 700,
            damping: 30,
        },
    },
};

// ─── Fade In ─────────────────────────────────────────────
export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.2, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15, ease: 'easeIn' },
    },
};

// ─── Scale Fade ──────────────────────────────────────────
export const scaleFade: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.15 },
    },
};

// ─── Skeleton Shimmer (CSS Keyframes reference) ──────────
export const shimmerStyle = {
    backgroundImage:
        'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.04) 60%, transparent 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
} as const;

// ─── Stat Counter ────────────────────────────────────────
export const counterVariant: Variants = {
    initial: { opacity: 0, y: 8 },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};
