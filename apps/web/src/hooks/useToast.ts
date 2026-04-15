'use client';

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

// ─── Store ───────────────────────────────────────────────
let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = `toast-${++toastId}`;
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));

        // Auto-dismiss after duration (default 5s)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },

    clearAll: () => set({ toasts: [] }),
}));

// ─── Convenience Hook ────────────────────────────────────
export function useToast() {
    const { addToast, removeToast, clearAll, toasts } = useToastStore();

    return {
        toasts,
        toast: addToast,
        dismiss: removeToast,
        clearAll,
        success: (title: string, message?: string) =>
            addToast({ type: 'success', title, message }),
        error: (title: string, message?: string) =>
            addToast({ type: 'error', title, message }),
        info: (title: string, message?: string) =>
            addToast({ type: 'info', title, message }),
        warning: (title: string, message?: string) =>
            addToast({ type: 'warning', title, message }),
    };
}
