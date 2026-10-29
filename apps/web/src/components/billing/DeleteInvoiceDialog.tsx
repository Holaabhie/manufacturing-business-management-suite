"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DeleteInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string | null;
  onConfirmDelete: (id: string) => void;
}

export function DeleteInvoiceDialog({
  open,
  onOpenChange,
  billId,
  onConfirmDelete,
}: DeleteInvoiceDialogProps) {
  const t = useTranslations("billing");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreenMobile
        className="max-w-[350px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, rgba(239,68,68,0.4), rgba(255,255,255,0.06))",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 className="h-[18px] w-[18px] text-[#f87171]" />
          </div>
          <div>
            <DialogTitle
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#f1f5f9",
                lineHeight: "22px",
                margin: 0,
              }}
            >
              {t("deleteTitle")}
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: "18px",
                margin: "2px 0 0",
              }}
            >
              {t("deleteDescription")}
            </DialogDescription>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, paddingTop: 16 }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("deleteCancel")}
          </button>
          <button
            onClick={() => billId && onConfirmDelete(billId)}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 4px 16px rgba(239,68,68,0.25)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("deleteConfirm")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

