/**
 * IOSNavigationBar — iOS-style sticky navigation bar
 *
 * Features: standard (44px) and large title (96px) modes,
 * glassmorphism background, back button, subtitle
 *
 * @example
 * <IOSNavigationBar
 *   title="Inventory"
 *   subtitle="248 items"
 *   backButton
 *   onBack={() => router.back()}
 *   rightButton={{ label: "Add", onClick: () => {} }}
 * />
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IOSNavigationBarProps {
    title: string;
    subtitle?: string;
    /** Show back button */
    backButton?: boolean;
    onBack?: () => void;
    backLabel?: string;
    /** Right-side action button */
    rightButton?: {
        label: string;
        onClick: () => void;
        variant?: 'plain' | 'filled';
        icon?: React.ReactNode;
    };
    /** Right-side custom content */
    rightContent?: React.ReactNode;
    /** Large title mode */
    large?: boolean;
    /** Transparent background (no glass) */
    transparent?: boolean;
    className?: string;
}

export function IOSNavigationBar({
    title,
    subtitle,
    backButton = false,
    onBack,
    backLabel = 'Back',
    rightButton,
    rightContent,
    large = false,
    transparent = false,
    className,
}: IOSNavigationBarProps) {
    return (
        <div
            className={cn(
                'sticky top-0 z-40',
                !transparent && 'glass-header',
                transparent && 'bg-transparent',
                className
            )}
        >
            {/* Standard Bar */}
            <div className="flex items-center justify-between h-[44px] px-4">
                {/* Left */}
                <div className="flex items-center gap-1 min-w-[80px]">
                    {backButton && (
                        <motion.button
                            onClick={onBack}
                            className="flex items-center gap-0.5 text-[var(--primary)] cursor-pointer"
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <ChevronLeft size={28} strokeWidth={2.5} />
                            <span className="text-[17px]">{backLabel}</span>
                        </motion.button>
                    )}
                </div>

                {/* Center Title (standard mode) */}
                {!large && (
                    <div className="absolute left-1/2 -translate-x-1/2 text-center">
                        <h1 className="text-[17px] font-semibold text-[var(--foreground)] leading-[22px] tracking-[-0.41px]">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-[11px] text-[var(--muted-foreground)] leading-[13px]">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}

                {/* Right */}
                <div className="flex items-center gap-2 min-w-[80px] justify-end">
                    {rightButton && (
                        <motion.button
                            onClick={rightButton.onClick}
                            className={cn(
                                'flex items-center gap-1.5 cursor-pointer',
                                rightButton.variant === 'filled'
                                    ? 'bg-[var(--primary)] text-white px-3 py-1.5 rounded-[8px] text-[15px] font-semibold'
                                    : 'text-[var(--primary)] text-[17px]'
                            )}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            {rightButton.icon}
                            {rightButton.label}
                        </motion.button>
                    )}
                    {rightContent}
                </div>
            </div>

            {/* Large Title */}
            {large && (
                <div className="px-4 pb-2">
                    <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[15px] text-[var(--muted-foreground)] mt-0.5 leading-[20px]">
                            {subtitle}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
