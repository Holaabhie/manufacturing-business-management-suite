/**
 * IOSButton — iOS-style button component
 *
 * Variants: filled, gray, tinted, plain, destructive
 * Sizes: small, medium, large, xlarge
 * Features: spring animation on press, loading spinner, icon support
 *
 * @example
 * <IOSButton variant="filled" size="large">
 *   Primary Action
 * </IOSButton>
 *
 * <IOSButton variant="tinted" icon={<Plus />}>
 *   Add Item
 * </IOSButton>
 */
'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    [
        'inline-flex items-center justify-center gap-2 font-semibold',
        'transition-colors duration-200',
        'disabled:opacity-40 disabled:pointer-events-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
        'select-none cursor-pointer',
    ].join(' '),
    {
        variants: {
            variant: {
                filled: [
                    'bg-[var(--primary)] text-white',
                    'shadow-[0_1px_4px_rgba(0,122,255,0.3)]',
                    'hover:bg-[#0066D6]',
                    'dark:bg-[#0A84FF] dark:hover:bg-[#0070E0]',
                ].join(' '),
                gray: [
                    'bg-[var(--accent)] text-[var(--foreground)]',
                    'hover:bg-[var(--fill-primary)]',
                ].join(' '),
                tinted: [
                    'bg-[rgba(0,122,255,0.12)] text-[var(--primary)]',
                    'hover:bg-[rgba(0,122,255,0.18)]',
                    'dark:bg-[rgba(10,132,255,0.15)] dark:text-[#0A84FF]',
                ].join(' '),
                plain: [
                    'bg-transparent text-[var(--primary)]',
                    'hover:bg-[rgba(0,122,255,0.06)]',
                    'dark:text-[#0A84FF]',
                ].join(' '),
                destructive: [
                    'bg-[var(--destructive)] text-white',
                    'shadow-[0_1px_4px_rgba(255,59,48,0.3)]',
                    'hover:bg-[#E5352B]',
                    'dark:bg-[#FF453A] dark:hover:bg-[#E53E33]',
                ].join(' '),
            },
            size: {
                small: 'h-[28px] px-3 text-[13px] rounded-[6px]',
                medium: 'h-[36px] px-4 text-[15px] rounded-[8px]',
                large: 'h-[44px] px-5 text-[17px] rounded-[10px]',
                xlarge: 'h-[50px] px-6 text-[19px] rounded-[12px]',
            },
            fullWidth: {
                true: 'w-full',
            },
        },
        defaultVariants: {
            variant: 'filled',
            size: 'medium',
        },
    }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface IOSButtonProps
    extends Omit<HTMLMotionProps<'button'>, 'size'>,
    ButtonVariantProps {
    /** Left-aligned icon */
    icon?: React.ReactNode;
    /** Right-aligned icon */
    iconRight?: React.ReactNode;
    /** Show loading spinner */
    loading?: boolean;
    /** Loading text (replaces children) */
    loadingText?: string;
}

export const IOSButton = React.forwardRef<HTMLButtonElement, IOSButtonProps>(
    (
        {
            className,
            variant,
            size,
            fullWidth,
            icon,
            iconRight,
            loading = false,
            loadingText,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || loading;

        return (
            <motion.button
                ref={ref}
                className={cn(buttonVariants({ variant, size, fullWidth, className }))}
                disabled={isDisabled}
                whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isDisabled ? 1 : 0.95 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 17,
                }}
                {...props}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" style={{ width: '1em', height: '1em' }} />
                        {loadingText && <span>{loadingText}</span>}
                    </>
                ) : (
                    <>
                        {icon && <span className="flex-shrink-0">{icon}</span>}
                        {children}
                        {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
                    </>
                )}
            </motion.button>
        );
    }
);

IOSButton.displayName = 'IOSButton';
