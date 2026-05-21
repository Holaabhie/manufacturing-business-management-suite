/**
 * IOSList — iOS Settings-style grouped list
 *
 * Components: IOSList, IOSListItem, IOSListSection
 * Features: 44px min height, chevron, dividers, section headers
 *
 * @example
 * <IOSList>
 *   <IOSListSection title="General">
 *     <IOSListItem title="Notifications" chevron onClick={() => {}} />
 *     <IOSListItem title="Dark Mode" rightContent={<IOSSwitch />} />
 *   </IOSListSection>
 * </IOSList>
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── IOSList ──────────────────────────────────── */
export interface IOSListProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Inset grouped style (like iOS Settings) */
    inset?: boolean;
}

export function IOSList({
    inset = true,
    className,
    children,
    ...props
}: IOSListProps) {
    return (
        <div className={cn('space-y-6', className)} {...props}>
            {children}
        </div>
    );
}

/* ── IOSListSection ───────────────────────────── */
export interface IOSListSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    footer?: string;
}

export function IOSListSection({
    title,
    footer,
    className,
    children,
    ...props
}: IOSListSectionProps) {
    return (
        <div className={cn('', className)} {...props}>
            {title && (
                <h3 className="text-[13px] font-normal text-[var(--muted-foreground)] uppercase tracking-wide px-4 mb-1.5 leading-[18px]">
                    {title}
                </h3>
            )}
            <div className="bg-[var(--card)] rounded-[10px] border border-[var(--border)] overflow-hidden divide-y divide-[rgba(60,60,67,0.08)] dark:divide-[rgba(84,84,88,0.2)]">
                {children}
            </div>
            {footer && (
                <p className="text-[13px] text-[var(--muted-foreground)] px-4 mt-1.5 leading-[18px]">
                    {footer}
                </p>
            )}
        </div>
    );
}

/* ── IOSListItem ──────────────────────────────── */
export interface IOSListItemProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    subtitle?: string;
    /** Icon or avatar on the left */
    leftIcon?: React.ReactNode;
    /** Content on the right (badge, switch, value text) */
    rightContent?: React.ReactNode;
    /** Show disclosure chevron */
    chevron?: boolean;
    /** Value text displayed on the right (before chevron) */
    value?: string;
    /** Destructive red text */
    destructive?: boolean;
}

export function IOSListItem({
    title,
    subtitle,
    leftIcon,
    rightContent,
    chevron = false,
    value,
    destructive = false,
    className,
    onClick,
    ...props
}: IOSListItemProps) {
    const Comp = onClick ? motion.button : motion.div;

    return (
        <Comp
            className={cn(
                'w-full flex items-center gap-3',
                'min-h-[44px] px-4 py-2.5',
                'text-left',
                onClick && 'cursor-pointer active:bg-[rgba(0,0,0,0.04)] dark:active:bg-[rgba(255,255,255,0.04)]',
                'transition-colors duration-150',
                className
            )}
            onClick={onClick as () => void}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            {...(props as Record<string, unknown>)}
        >
            {leftIcon && (
                <span className="flex-shrink-0 flex items-center justify-center w-[28px] h-[28px]">
                    {leftIcon}
                </span>
            )}

            <div className="flex-1 min-w-0">
                <span
                    className={cn(
                        'text-[17px] leading-[22px] block truncate',
                        destructive
                            ? 'text-[var(--destructive)]'
                            : 'text-[var(--foreground)]'
                    )}
                >
                    {title}
                </span>
                {subtitle && (
                    <span className="text-[13px] text-[var(--muted-foreground)] leading-[18px] block truncate">
                        {subtitle}
                    </span>
                )}
            </div>

            {value && (
                <span className="text-[17px] text-[var(--muted-foreground)] flex-shrink-0">
                    {value}
                </span>
            )}

            {rightContent && (
                <span className="flex-shrink-0">{rightContent}</span>
            )}

            {chevron && (
                <ChevronRight
                    size={20}
                    className="text-[var(--muted-foreground)] flex-shrink-0"
                />
            )}
        </Comp>
    );
}
