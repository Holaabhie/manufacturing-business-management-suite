/**
 * IOSCard — iOS-style card component
 *
 * Variants: elevated, glass, grouped, inset
 * Features: interactive hover/tap, glassmorphism, dark mode
 *
 * @example
 * <IOSCard variant="glass">
 *   <IOSCardHeader title="Card Title" subtitle="Subtitle" />
 *   <IOSCardContent>Content here</IOSCardContent>
 * </IOSCard>
 */
'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('transition-all duration-300', {
    variants: {
        variant: {
            elevated: [
                'bg-[var(--bg-card)] rounded-[16px]',
                'border border-[var(--border-card)]',
                'shadow-[var(--shadow-card)]',
                'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
            ].join(' '),
            glass: [
                'rounded-[16px]',
                'bg-white/[0.97] dark:bg-[rgba(18,18,24,0.80)]',
                'backdrop-blur-[48px] backdrop-saturate-[220%]',
                'border border-[rgba(60,60,67,0.28)] dark:border-white/[0.07]',
                'shadow-[var(--shadow-sm)]',
            ].join(' '),
            grouped: [
                'bg-[var(--bg-card)] rounded-[10px]',
                'border border-[var(--border-card)]',
            ].join(' '),
            inset: [
                'bg-[var(--fill-quaternary)] rounded-[10px]',
            ].join(' '),
            // Stitch-tier: deep frosted glass with gradient-sheen border
            'stitch-elevated': [
                'rounded-[16px]',
                'bg-[var(--bg-card)] dark:bg-[rgba(14,14,22,0.85)]',
                'backdrop-blur-[48px] backdrop-saturate-[220%]',
                'border border-[rgba(60,60,67,0.28)] dark:border-white/[0.08]',
                'shadow-[0_2px_8px_rgba(0,0,0,0.12),0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_12px_40px_rgba(0,0,0,0.5)]',
                'hover:-translate-y-1 hover:shadow-[0_4px_16px_rgba(0,0,0,0.14),0_24px_60px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.5),0_24px_60px_rgba(0,0,0,0.6)]',
            ].join(' '),
        },
        padding: {
            none: '',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-5',
            xl: 'p-6',
        },
        interactive: {
            true: 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ios-blue)] focus-visible:ring-offset-2',
            false: '',
        },
    },
    defaultVariants: {
        variant: 'elevated',
        padding: 'lg',
        interactive: false,
    },
});

type CardVariantProps = VariantProps<typeof cardVariants>;

export interface IOSCardProps
    extends Omit<HTMLMotionProps<'div'>, 'padding'>,
    CardVariantProps { }

export const IOSCard = React.forwardRef<HTMLDivElement, IOSCardProps>(
    ({ className, variant, padding, interactive, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                className={cn(cardVariants({ variant, padding, interactive, className }))}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                whileHover={
                    interactive
                        ? {
                            scale: 1.01,
                            transition: { type: 'spring', stiffness: 400, damping: 17 },
                        }
                        : undefined
                }
                whileTap={
                    interactive
                        ? {
                            scale: 0.98,
                            transition: { type: 'spring', stiffness: 400, damping: 17 },
                        }
                        : undefined
                }
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

IOSCard.displayName = 'IOSCard';

/* ── Sub-components ───────────────────────────── */

export interface IOSCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function IOSCardHeader({
    title,
    subtitle,
    action,
    className,
    children,
    ...props
}: IOSCardHeaderProps) {
    return (
        <div
            className={cn('flex items-start justify-between mb-4', className)}
            {...props}
        >
            <div className="flex-1 min-w-0">
                {title && (
                    <h3 className="text-[17px] font-semibold text-[var(--label-primary)] leading-[22px] tracking-[-0.2px]">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p className="text-[12px] font-medium text-[var(--label-tertiary)] mt-0.5 leading-[16px] uppercase tracking-[0.06em]">
                        {subtitle}
                    </p>
                )}
                {children}
            </div>
            {action && <div className="ml-3 flex-shrink-0">{action}</div>}
        </div>
    );
}

export function IOSCardContent({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('', className)} {...props}>
            {children}
        </div>
    );
}

export function IOSCardFooter({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'flex items-center mt-4 pt-4 border-t border-[var(--border-card)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
