"use client";

/**
 * PremiumModal — Enterprise modal wrapper
 *
 * Phase 1 Enterprise Design System:
 * - Uses --overlay-* CSS tokens for automatic light/dark mode
 * - No spring physics — 250ms cubic-bezier enter/exit
 * - No gradients, no glassmorphism, no neon
 * - Border radius: 24px (centered), 32px 32px 0 0 (bottom sheet)
 * - Max font-weight: 600
 *
 * Delegates all backdrop/animation/scroll-lock to MobileSheet.
 *
 * @example
 * <PremiumModal open={true} onClose={fn} title="Edit Item">
 *   <form>...</form>
 * </PremiumModal>
 */

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";

export interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  /** Icon component to display in the header */
  icon?: React.ReactNode;
  /** Accent color for the icon container */
  iconAccent?: string;
  title?: string;
  subtitle?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Max width on desktop */
  maxWidth?: string;
  /** Full screen mode (for mobile modals) */
  fullScreen?: boolean;
  children: React.ReactNode;
  className?: string;
  /** z-index override */
  zIndex?: number;
}

export function PremiumModal({
  open,
  onClose,
  icon,
  iconAccent = "var(--overlay-accent)",
  title,
  subtitle,
  footer,
  maxWidth = "480px",
  fullScreen = false,
  children,
  className = "",
  zIndex = 1001,
}: PremiumModalProps) {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      maxHeight={fullScreen ? "100dvh" : "88dvh"}
      zIndex={zIndex - 1}
      className={className}
      showHandle={!fullScreen}
      dragToClose={!fullScreen}
    >
      {/* Header */}
      {(title || icon) && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: fullScreen ? "14px 16px 12px" : "12px 20px 12px",
            borderBottom: "1px solid var(--overlay-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            {icon && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${iconAccent} 12%, transparent)`,
                  border: "1px solid var(--overlay-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: iconAccent,
                }}
              >
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              {title && (
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--overlay-text-primary)",
                    lineHeight: "22px",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--overlay-text-secondary)",
                    lineHeight: "18px",
                    margin: "2px 0 0",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Close button — ghost circular */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              color: "var(--overlay-text-muted)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--overlay-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={16} />
          </motion.button>
        </div>
      )}

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: fullScreen ? "16px" : "16px 20px",
          overscrollBehavior: "contain",
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            flexShrink: 0,
            padding: "12px 20px 20px",
            borderTop: "1px solid var(--overlay-border)",
          }}
        >
          {footer}
        </div>
      )}
    </MobileSheet>
  );
}

/** Enterprise-styled button for modal footers */
export function PremiumButton({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
  form,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  form?: string;
}) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "#2563EB",
      color: "#fff",
      border: "none",
    },
    secondary: {
      background: "transparent",
      color: "var(--overlay-text-secondary)",
      border: "1px solid rgba(15, 23, 42, 0.12)",
    },
    destructive: {
      background: "#DC2626",
      color: "#fff",
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: "var(--overlay-text-secondary)",
      border: "none",
    },
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type={type}
      disabled={disabled || loading}
      form={form}
      style={{
        height: 44,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.45 : 1,
        transition: "all 0.15s ease",
        width: fullWidth ? "100%" : "auto",
        flex: fullWidth ? 1 : "none",
        padding: "0 24px",
        ...variantStyles[variant],
      }}
    >
      {loading ? "Processing..." : children}
    </motion.button>
  );
}
