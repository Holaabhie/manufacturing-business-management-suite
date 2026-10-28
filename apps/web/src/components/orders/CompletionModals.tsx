"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { Z } from "@/lib/z-index";

export { InvoicePreviewModal } from "./InvoicePreviewModal";

interface CompletionModalProps {
  open: boolean;
  order: any;
  onCompleteOnly: () => void;
  onCompleteAndInvoice: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CompletionConfirmationModal({
  open,
  order,
  onCompleteOnly,
  onCompleteAndInvoice,
  onCancel,
  isLoading,
}: CompletionModalProps) {
  const t = useTranslations("orders.completion");
  return (
    <MobileSheet
      open={open && !!order}
      onClose={onCancel}
      maxWidth="480px"
      zIndex={Z.MODAL}
    >
      {order && (
        <>
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--overlay-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid var(--overlay-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--overlay-text-primary)",
                    margin: 0,
                  }}
                >
                  {t("title")}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--overlay-text-secondary)",
                    margin: "2px 0 0",
                  }}
                >
                  {t("subtitle", { orderId: order.order_id || order.id?.slice(0, 8) })}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: "var(--overlay-close-btn-bg)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "var(--overlay-text-secondary)",
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Option A: Complete & Generate Invoice */}
            <button
              onClick={onCompleteAndInvoice}
              disabled={isLoading}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "18px 20px",
                borderRadius: 16,
                background: "var(--overlay-card-bg)",
                border: "2px solid #16a34a",
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isLoading ? (
                  <Loader2 size={20} style={{ color: "#16a34a", animation: "spin 1s linear infinite" }} />
                ) : (
                  <FileText size={20} style={{ color: "#16a34a" }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--overlay-text-primary)",
                    margin: 0,
                  }}
                >
                  {t("completeAndInvoice")}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--overlay-text-secondary)",
                    margin: "3px 0 0",
                  }}
                >
                  {t("completeAndInvoiceDesc")}
                </p>
              </div>
            </button>

            {/* Option B: Complete Only */}
            <button
              onClick={onCompleteOnly}
              disabled={isLoading}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "18px 20px",
                borderRadius: 16,
                background: "var(--overlay-card-bg)",
                border: "1px solid var(--overlay-border)",
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(22,163,74,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} style={{ color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--overlay-text-primary)",
                    margin: 0,
                  }}
                >
                  {t("completeOnly")}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--overlay-text-secondary)",
                    margin: "3px 0 0",
                  }}
                >
                  {t("completeOnlyDesc")}
                </p>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--overlay-border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onCancel}
              disabled={isLoading}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "1px solid var(--overlay-border)",
                background: "transparent",
                color: "var(--overlay-text-secondary)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t("cancel")}
            </button>
          </div>
        </>
      )}
    </MobileSheet>
  );
}
