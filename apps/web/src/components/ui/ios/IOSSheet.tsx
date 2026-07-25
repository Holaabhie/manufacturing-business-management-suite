/**
 * IOSSheet — Enterprise modal sheet with drag-to-dismiss
 *
 * Phase 1 Enterprise Design System:
 * - Uses --overlay-* CSS tokens for automatic light/dark mode
 * - No spring physics — cubic-bezier [0.4, 0, 0.2, 1]
 * - Handle pill: 48×5, centered, 16px top margin
 * - Border radius: 32px 32px 0 0
 * - No gradients, no glassmorphism, no neon
 *
 * Delegates all backdrop/animation/scroll-lock to MobileSheet.
 *
 * @example
 * <IOSSheet isOpen={true} onClose={() => {}} title="New Order" size="medium">
 *   <form>...</form>
 * </IOSSheet>
 */
'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MobileSheetProps } from '@/components/ui/MobileSheet';
import dynamic from 'next/dynamic';

const MobileSheet = dynamic<MobileSheetProps>(
    () => import('@/components/ui/MobileSheet').then(mod => mod.MobileSheet),
    { ssr: false }
);

export interface IOSSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    size?: 'small' | 'medium' | 'large' | 'full';
    /** Show close button */
    showClose?: boolean;
    /** Right action button */
    action?: {
        label: string;
        onClick: () => void;
        variant?: 'plain' | 'filled';
        disabled?: boolean;
    };
    children: React.ReactNode;
    className?: string;
}

const sizeMap = {
    small: '40vh',
    medium: '60vh',
    large: '88vh',
    full: '100vh',
};

export function IOSSheet({
    isOpen,
    onClose,
    title,
    subtitle,
    size = 'medium',
    showClose = true,
    action,
    children,
    className,
}: IOSSheetProps) {
    return (
        <MobileSheet
            open={isOpen}
            onClose={onClose}
            maxHeight={sizeMap[size]}
            className={cn(className)}
            showHandle={true}
            dragToClose={true}
        >
            {/* Header */}
            {(title || showClose || action) && (
                <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ borderBottom: '1px solid var(--overlay-border)' }}
                >
                    <div className="w-[70px]">
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center cursor-pointer active:scale-[0.98] transition-transform duration-100"
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--overlay-text-muted)',
                                    transition: 'background 0.15s ease, transform 0.1s ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--overlay-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="text-center flex-1">
                        {title && (
                            <h2
                                style={{
                                    fontSize: 18,
                                    fontWeight: 600,
                                    lineHeight: '22px',
                                    color: 'var(--overlay-text-primary)',
                                    margin: 0,
                                }}
                            >
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p
                                style={{
                                    fontSize: 13,
                                    lineHeight: '18px',
                                    color: 'var(--overlay-text-secondary)',
                                    margin: '2px 0 0',
                                }}
                            >
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <div className="w-[70px] flex justify-end">
                        {action && (
                            <button
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={cn(
                                    'text-[14px] font-medium cursor-pointer active:scale-[0.98] transition-transform duration-100',
                                    action.disabled && 'opacity-45 cursor-not-allowed'
                                )}
                                style={
                                    action.variant === 'filled'
                                        ? {
                                              background: 'var(--overlay-accent)',
                                              color: '#fff',
                                              padding: '6px 16px',
                                              borderRadius: 12,
                                              border: 'none',
                                              height: 36,
                                          }
                                        : {
                                              color: 'var(--overlay-accent)',
                                              background: 'transparent',
                                              border: 'none',
                                          }
                                }
                            >
                                {action.label}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                {children}
            </div>
        </MobileSheet>
    );
}
