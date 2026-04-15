/**
 * IOSSheet — iOS-style modal sheet with drag-to-dismiss
 *
 * Features: backdrop blur, drag handle pill, spring animation,
 * 4 sizes (small/medium/large/full), body scroll lock,
 * portaled to document.body for z-index safety
 *
 * @example
 * <IOSSheet isOpen={true} onClose={() => {}} title="New Order" size="medium">
 *   <form>...</form>
 * </IOSSheet>
 */
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    large: '80vh',
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
    const dragControls = useDragControls();
    const [mounted, setMounted] = useState(false);

    // Ensure portal only after client mount
    useEffect(() => { setMounted(true); }, []);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 300) {
            onClose();
        }
    };

    if (!mounted) return null;

    const sheetJSX = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Backdrop overlay ── */}
                    <motion.div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 1000,
                            background: 'rgba(0, 0, 0, 0.70)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* ── Sheet container ── */}
                    <motion.div
                        className={cn(className)}
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: sizeMap[size],
                            background: 'linear-gradient(160deg, rgba(14, 22, 44, 0.97) 0%, rgba(8, 16, 36, 0.99) 100%)',
                            backdropFilter: 'blur(24px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                            border: '1px solid rgba(255, 255, 255, 0.10)',
                            borderBottom: 'none',
                            boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                            borderRadius: '28px 28px 0 0',
                            fontFamily: 'var(--font-glass)',
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 300,
                        }}
                        drag="y"
                        dragControls={dragControls}
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Drag Handle */}
                        <div
                            className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div
                                className="w-[36px] h-[5px] rounded-full"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                            />
                        </div>

                        {/* Header */}
                        {(title || showClose || action) && (
                            <div
                                className="flex items-center justify-between px-4 py-2"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <div className="w-[70px]">
                                    {showClose && (
                                        <motion.button
                                            onClick={onClose}
                                            className="flex items-center justify-center cursor-pointer"
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid var(--glass-border)',
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,80,80,0.2)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                        >
                                            <X size={16} style={{ color: 'var(--g-text-primary)' }} />
                                        </motion.button>
                                    )}
                                </div>

                                <div className="text-center flex-1">
                                    {title && (
                                        <h2
                                            className="text-[17px] font-semibold leading-[22px]"
                                            style={{ color: 'var(--g-text-primary)', fontFamily: 'var(--font-glass)' }}
                                        >
                                            {title}
                                        </h2>
                                    )}
                                    {subtitle && (
                                        <p
                                            className="text-[13px] leading-[18px]"
                                            style={{ color: 'var(--g-text-secondary)' }}
                                        >
                                            {subtitle}
                                        </p>
                                    )}
                                </div>

                                <div className="w-[70px] flex justify-end">
                                    {action && (
                                        <motion.button
                                            onClick={action.onClick}
                                            disabled={action.disabled}
                                            className={cn(
                                                'text-[17px] font-semibold cursor-pointer',
                                                action.disabled && 'opacity-40'
                                            )}
                                            style={
                                                action.variant === 'filled'
                                                    ? {
                                                          background: 'linear-gradient(135deg, rgba(99,210,255,0.9), rgba(0,160,255,0.8), rgba(0,100,220,0.85))',
                                                          color: '#fff',
                                                          padding: '4px 12px',
                                                          borderRadius: 'var(--glass-radius-btn)',
                                                          border: 'none',
                                                          boxShadow: '0 4px 16px var(--g-accent-blue-glow)',
                                                      }
                                                    : {
                                                          color: 'var(--g-accent-blue)',
                                                          background: 'transparent',
                                                          border: 'none',
                                                      }
                                            }
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {action.label}
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(sheetJSX, document.body);
}
