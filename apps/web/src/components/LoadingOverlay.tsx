"use client";

/**
 * LoadingOverlay — Global Loading Overlay
 * ─────────────────────────────────────────
 * Shows a full-screen semi-transparent overlay with a spinner
 * for slow operations. Prevents interaction while loading.
 * Portaled to document.body for z-index safety.
 *
 * Usage:
 *   <LoadingOverlay visible={isProcessing} message="Generating invoice..." />
 */

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    /** Show/hide the overlay */
    visible: boolean;
    /** Optional message below the spinner */
    message?: string;
    /** Optional className override */
    className?: string;
}

export function LoadingOverlay({
    visible,
    message = "Processing...",
    className,
}: LoadingOverlayProps) {
    const [mounted, setMounted] = useState(false);

    // Ensure portal only after client mount
    useEffect(() => { setMounted(true); }, []);

    if (!visible || !mounted) return null;

    const overlayJSX = (
        <>
            {/* ── Full-screen backdrop ── */}
            <div
                className={cn("transition-opacity duration-300", className)}
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
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                role="alertdialog"
                aria-modal="true"
                aria-label={message}
            >
                {/* ── Spinner Card ── */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1001,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '32px',
                        background: 'linear-gradient(160deg, rgba(14, 22, 44, 0.97) 0%, rgba(8, 16, 36, 0.99) 100%)',
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.10)',
                        boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                        borderRadius: '20px',
                        fontFamily: 'var(--font-glass)',
                    }}
                >
                    <div className="relative">
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(99,210,255,0.2)' }} />
                        {/* Spinner */}
                        <Loader2 className="h-10 w-10 animate-spin relative" style={{ color: 'var(--g-accent-blue)' }} />
                    </div>

                    {message && (
                        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--g-text-secondary)', fontFamily: 'var(--font-glass)' }}>
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </>
    );

    return createPortal(overlayJSX, document.body);
}
