/**
 * IOSToast — iOS-style toast notification system
 *
 * Types: success, error, info, warning
 * Features: glass background, auto-dismiss, animated entry/exit
 * Uses useToast Zustand store for state management
 *
 * @example
 * // In layout: <IOSToastContainer />
 * // In component:
 * const { success, error } = useToast();
 * success('Order Created', 'Order #1234 has been placed');
 */
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type ToastType } from '@/hooks/useToast';

const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={20} className="text-[var(--erp-success)]" />,
    error: <XCircle size={20} className="text-[var(--destructive)]" />,
    info: <Info size={20} className="text-[var(--primary)]" />,
    warning: <AlertTriangle size={20} className="text-[var(--erp-warning)]" />,
};

const borderColorMap: Record<ToastType, string> = {
    success: 'border-l-[var(--erp-success)]',
    error: 'border-l-[var(--destructive)]',
    info: 'border-l-[var(--primary)]',
    warning: 'border-l-[var(--erp-warning)]',
};

/**
 * Place this once in your root layout to display toasts
 */
export function IOSToastContainer() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed top-4 right-4 z-[1080] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                        }}
                        className={cn(
                            'pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)]',
                            'rounded-[16px] overflow-hidden',
                            'bg-white/80 dark:bg-[rgba(44,44,46,0.85)]',
                            'backdrop-blur-[40px] backdrop-saturate-[180%]',
                            'border border-white/20 dark:border-white/8',
                            'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
                            'dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
                            'border-l-[3px]',
                            borderColorMap[toast.type]
                        )}
                    >
                        <div className="flex items-start gap-3 p-4">
                            <span className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</span>

                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-[var(--foreground)] leading-[20px]">
                                    {toast.title}
                                </p>
                                {toast.message && (
                                    <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5 leading-[18px]">
                                        {toast.message}
                                    </p>
                                )}
                            </div>

                            <motion.button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-[var(--muted)] cursor-pointer transition-colors"
                                whileTap={{ scale: 0.85 }}
                            >
                                <X size={14} className="text-[var(--muted-foreground)]" />
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
