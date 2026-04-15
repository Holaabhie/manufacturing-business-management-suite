"use client";

/**
 * LoadingButton — Reusable Anti-Duplicate Submit Button
 * ───────────────────────────────────────────────────────
 * Drop-in replacement for <Button> with built-in:
 *   1. Instant disable on first click (prevents double-click)
 *   2. Animated spinner while loading
 *   3. Request lock mechanism (state-based guard)
 *   4. Auto re-enable on success or error
 *   5. Configurable success/error toasts
 *   6. Optional cool-down period after submit
 *
 * Usage:
 *   <LoadingButton
 *     onClick={handleSubmit}
 *     loadingText="Creating Invoice..."
 *     successText="Invoice Created!"
 *   >
 *     Create Invoice
 *   </LoadingButton>
 */

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { VariantProps } from "class-variance-authority";

// ── Types ─────────────────────────────────────────────────

type ButtonStatus = "idle" | "loading" | "success" | "error";

interface LoadingButtonProps
    extends Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
    /**
     * Async click handler. The button stays disabled until
     * this promise resolves or rejects.
     */
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;

    /** Text shown while loading (replaces children) */
    loadingText?: string;

    /** Success toast message (shown after onClick resolves) */
    successText?: string;

    /** Error toast message prefix (appended with error details) */
    errorText?: string;

    /** Show toast notifications on success/error. Default: true */
    showToasts?: boolean;

    /**
     * Cool-down period in ms after a successful submit.
     * Button stays disabled during this period.
     * Default: 1000ms (1 second)
     */
    cooldownMs?: number;

    /** Show a check icon briefly on success. Default: true */
    showSuccessState?: boolean;

    /** Custom spinner size class. Default: "h-4 w-4" */
    spinnerClassName?: string;

    /** Use Radix Slot for composition */
    asChild?: boolean;
}

// ── Component ─────────────────────────────────────────────

export function LoadingButton({
    onClick,
    children,
    loadingText,
    successText,
    errorText = "Something went wrong",
    showToasts = true,
    cooldownMs = 1000,
    showSuccessState = true,
    spinnerClassName = "h-4 w-4",
    disabled,
    className,
    variant,
    size,
    ...props
}: LoadingButtonProps) {
    const [status, setStatus] = useState<ButtonStatus>("idle");
    const lockRef = useRef(false);

    const handleClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            // ── Guard: Prevent duplicate clicks ───────────────
            if (lockRef.current || status === "loading") {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            lockRef.current = true;
            setStatus("loading");

            try {
                await onClick(event);

                // ── Success state ─────────────────────────────
                if (showSuccessState) {
                    setStatus("success");
                    if (showToasts && successText) {
                        toast.success(successText);
                    }

                    // Cool-down: keep button disabled briefly
                    await new Promise((resolve) => setTimeout(resolve, cooldownMs));
                } else {
                    if (showToasts && successText) {
                        toast.success(successText);
                    }
                }

                setStatus("idle");
            } catch (err: any) {
                setStatus("error");

                // ── Error handling ────────────────────────────
                if (err?.isDuplicate) {
                    // Duplicate request — show specific message
                    toast.warning("Request already submitted. Please wait for the response.");
                } else if (showToasts) {
                    const message = err?.response?.data?.message || err?.message || "Please try again.";
                    toast.error(`${errorText}: ${message}`);
                }

                // Re-enable after short delay on error
                setTimeout(() => setStatus("idle"), 800);
            } finally {
                lockRef.current = false;
            }
        },
        [onClick, status, showToasts, successText, errorText, cooldownMs, showSuccessState]
    );

    // ── Determine visual state ──────────────────────────────
    const isDisabled = disabled || status === "loading" || status === "success";

    const renderIcon = () => {
        switch (status) {
            case "loading":
                return <Loader2 className={cn("animate-spin", spinnerClassName)} />;
            case "success":
                return <Check className={cn("text-green-500", spinnerClassName)} />;
            case "error":
                return <AlertCircle className={cn("text-red-400", spinnerClassName)} />;
            default:
                return null;
        }
    };

    const renderContent = () => {
        switch (status) {
            case "loading":
                return loadingText || children;
            case "success":
                return successText || children;
            default:
                return children;
        }
    };

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={isDisabled}
            onClick={handleClick}
            className={cn(
                "relative transition-all duration-200",
                status === "loading" && "cursor-wait opacity-80",
                status === "success" && "bg-green-600 hover:bg-green-600 text-white",
                className,
            )}
            {...props}
        >
            {renderIcon()}
            <span className={cn(status === "loading" && "ml-1")}>
                {renderContent()}
            </span>
        </Button>
    );
}

// ═══════════════════════════════════════════════════════════
// HOOK: useSubmitGuard
// ═══════════════════════════════════════════════════════════

/**
 * A standalone hook for guarding any async submission logic.
 *
 * Usage:
 *   const { isSubmitting, guard } = useSubmitGuard();
 *   const handleSubmit = guard(async () => { ... });
 *
 *   <button disabled={isSubmitting} onClick={handleSubmit}>Submit</button>
 */
export function useSubmitGuard() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lockRef = useRef(false);

    const guard = useCallback(
        <T extends (...args: any[]) => Promise<any>>(fn: T) => {
            return async (...args: Parameters<T>) => {
                if (lockRef.current) {
                    console.warn("[useSubmitGuard] Duplicate submission blocked");
                    return;
                }

                lockRef.current = true;
                setIsSubmitting(true);

                try {
                    return await fn(...args);
                } finally {
                    lockRef.current = false;
                    setIsSubmitting(false);
                }
            };
        },
        []
    );

    return { isSubmitting, guard };
}
