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
        filled: 'bg-[var(--ios-blue)] text-white',
        tinted: 'bg-[rgba(0,122,255,0.12)] text-[var(--ios-blue)] dark:bg-[rgba(10,132,255,0.15)] dark:text-[#0A84FF]',
        outline: 'border border-[var(--ios-blue)] text-[var(--ios-blue)] dark:border-[#0A84FF] dark:text-[#0A84FF]',
        dot: 'bg-[var(--ios-blue)]',
    },
    green: {
        filled: 'bg-[var(--ios-green)] text-white',
        tinted: 'bg-[rgba(52,199,89,0.12)] text-[var(--ios-green)] dark:bg-[rgba(48,209,88,0.15)] dark:text-[#30D158]',
        outline: 'border border-[var(--ios-green)] text-[var(--ios-green)] dark:border-[#30D158] dark:text-[#30D158]',
        dot: 'bg-[var(--ios-green)]',
    },
    red: {
        filled: 'bg-[var(--ios-red)] text-white',
        tinted: 'bg-[rgba(255,59,48,0.12)] text-[var(--ios-red)] dark:bg-[rgba(255,69,58,0.15)] dark:text-[#FF453A]',
        outline: 'border border-[var(--ios-red)] text-[var(--ios-red)] dark:border-[#FF453A] dark:text-[#FF453A]',
        dot: 'bg-[var(--ios-red)]',
    },
    orange: {
        filled: 'bg-[var(--ios-orange)] text-white',
        tinted: 'bg-[rgba(255,149,0,0.12)] text-[var(--ios-orange)] dark:bg-[rgba(255,159,10,0.15)] dark:text-[#FF9F0A]',
        outline: 'border border-[var(--ios-orange)] text-[var(--ios-orange)] dark:border-[#FF9F0A] dark:text-[#FF9F0A]',
        dot: 'bg-[var(--ios-orange)]',
    },
    purple: {
        filled: 'bg-[var(--ios-purple)] text-white',
        tinted: 'bg-[rgba(175,82,222,0.12)] text-[var(--ios-purple)] dark:bg-[rgba(191,90,242,0.15)] dark:text-[#BF5AF2]',
        outline: 'border border-[var(--ios-purple)] text-[var(--ios-purple)] dark:border-[#BF5AF2] dark:text-[#BF5AF2]',
        dot: 'bg-[var(--ios-purple)]',
    },
    gray: {
        filled: 'bg-[var(--ios-gray)] text-white',
        tinted: 'bg-[var(--fill-quaternary)] text-[var(--label-secondary)]',
        outline: 'border border-[var(--ios-gray3)] text-[var(--label-secondary)]',
        dot: 'bg-[var(--ios-gray)]',
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
