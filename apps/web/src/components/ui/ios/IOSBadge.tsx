/**
 * IOSBadge — iOS-style badge component
 *
 * Variants: filled, tinted, outline
 * Colors: blue, green, red, orange, purple, gray
 * Sizes: small, medium
 *
 * @example
 * <IOSBadge color="green" variant="tinted">Active</IOSBadge>
 */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
type BadgeVariant = 'filled' | 'tinted' | 'outline';
type BadgeSize = 'small' | 'medium';

export interface IOSBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    color?: BadgeColor;
    variant?: BadgeVariant;
    size?: BadgeSize;
    /** Dot indicator before text */
    dot?: boolean;
}

const colorMap = {
    blue: {
        filled: 'bg-[var(--primary)] text-white',
        tinted: 'bg-[rgba(0,122,255,0.12)] text-[var(--primary)] dark:bg-[rgba(10,132,255,0.15)] dark:text-[#0A84FF]',
        outline: 'border border-[var(--primary)] text-[var(--primary)] dark:border-[#0A84FF] dark:text-[#0A84FF]',
        dot: 'bg-[var(--primary)]',
    },
    green: {
        filled: 'bg-[var(--erp-success)] text-white',
        tinted: 'bg-[rgba(52,199,89,0.12)] text-[var(--erp-success)] dark:bg-[rgba(48,209,88,0.15)] dark:text-[#30D158]',
        outline: 'border border-[var(--erp-success)] text-[var(--erp-success)] dark:border-[#30D158] dark:text-[#30D158]',
        dot: 'bg-[var(--erp-success)]',
    },
    red: {
        filled: 'bg-[var(--destructive)] text-white',
        tinted: 'bg-[rgba(255,59,48,0.12)] text-[var(--destructive)] dark:bg-[rgba(255,69,58,0.15)] dark:text-[#FF453A]',
        outline: 'border border-[var(--destructive)] text-[var(--destructive)] dark:border-[#FF453A] dark:text-[#FF453A]',
        dot: 'bg-[var(--destructive)]',
    },
    orange: {
        filled: 'bg-[var(--erp-warning)] text-white',
        tinted: 'bg-[rgba(255,149,0,0.12)] text-[var(--erp-warning)] dark:bg-[rgba(255,159,10,0.15)] dark:text-[#FF9F0A]',
        outline: 'border border-[var(--erp-warning)] text-[var(--erp-warning)] dark:border-[#FF9F0A] dark:text-[#FF9F0A]',
        dot: 'bg-[var(--erp-warning)]',
    },
    purple: {
        filled: 'bg-[var(--chart-4)] text-white',
        tinted: 'bg-[rgba(175,82,222,0.12)] text-[var(--chart-4)] dark:bg-[rgba(191,90,242,0.15)] dark:text-[#BF5AF2]',
        outline: 'border border-[var(--chart-4)] text-[var(--chart-4)] dark:border-[#BF5AF2] dark:text-[#BF5AF2]',
        dot: 'bg-[var(--chart-4)]',
    },
    gray: {
        filled: 'bg-muted-foreground text-white',
        tinted: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
        outline: 'border border-[var(--muted-foreground)] text-[var(--muted-foreground)]',
        dot: 'bg-muted-foreground',
    },
};

const sizeMap = {
    small: 'px-2 py-0.5 text-[11px] rounded-[4px]',
    medium: 'px-2.5 py-1 text-[13px] rounded-[6px]',
};

export const IOSBadge = React.forwardRef<HTMLSpanElement, IOSBadgeProps>(
    (
        {
            color = 'blue',
            variant = 'tinted',
            size = 'medium',
            dot = false,
            className,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center gap-1.5 font-medium leading-none whitespace-nowrap',
                    sizeMap[size],
                    colorMap[color][variant],
                    className
                )}
                {...props}
            >
                {dot && (
                    <span
                        className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', colorMap[color].dot)}
                    />
                )}
                {children}
            </span>
        );
    }
);

IOSBadge.displayName = 'IOSBadge';
