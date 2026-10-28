"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { IndianRupee, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { NumericInput } from "@/components/ui/numeric-input";
import { useRecordPayment } from "@/lib/hooks/use-orders";
import { useTranslations } from "next-intl";
import type { OrderItem } from "./types";

interface RecordPaymentDialogProps {
  open: boolean;
  order: OrderItem | null;
  onClose: () => void;
}

export function RecordPaymentDialog({
  open,
  order,
  onClose,
}: RecordPaymentDialogProps) {
  const t = useTranslations("orders");
  const recordPayment = useRecordPayment();

  const [prevOrderId, setPrevOrderId] = useState<string | null>(order?.id ?? null);
  const [formData, setFormData] = useState(() => {
    const balance = Number(order?.totalAmount || 0) - Number(order?.totalPaid || 0);
    return {
      amount: String(balance > 0 ? balance : 0),
      payment_mode: "Bank Transfer",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_ref: "",
      tds_applicable: false,
      tds_rate: "",
      notes: "",
    };
  });

  if (order && order.id !== prevOrderId) {
    setPrevOrderId(order.id);
    const balance = Number(order.totalAmount || 0) - Number(order.totalPaid || 0);
    setFormData({
      amount: String(balance > 0 ? balance : 0),
      payment_mode: "Bank Transfer",
      payment_date: new Date().toISOString().split("T")[0],
      transaction_ref: "",
      tds_applicable: false,
      tds_rate: "",
      notes: "",
    });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    recordPayment.mutate(
      {
        reference_type: "SalesOrder",
        reference_id: order.id,
        party_type: "Customer",
        party_id: order.clientId || (order.client as { id?: string })?.id || "",
        amount: Number(formData.amount),
        payment_mode: formData.payment_mode,
        payment_date: formData.payment_date,
        transaction_ref: formData.transaction_ref,
        tds_applicable: formData.tds_applicable,
        tds_rate: Number(formData.tds_rate) || 0,
        notes: formData.notes,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent fullScreenMobile className="max-w-[480px]" showCloseButton={false}>
        {/* Premium Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IndianRupee className="h-[18px] w-[18px] text-[#4ade80]" />
            </div>
            <div style={{ minWidth: 0 }}>
              <DialogTitle
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  lineHeight: "22px",
                  margin: 0,
                }}
              >
                {t("payment.title")}
              </DialogTitle>
              <DialogDescription
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  lineHeight: "18px",
                  margin: "2px 0 0",
                }}
              >
                {order?.productName || order?.product_name} (
                {(order?.client as { name?: string })?.name || "Client"})
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#94a3b8",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <X size={16} />
            </motion.button>
          </DialogClose>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                {t("payment.amount")}
              </label>
              <NumericInput
                value={formData.amount}
                onValueChange={(v: string) => setFormData((prev) => ({ ...prev, amount: v }))}
                className="h-[44px] font-bold text-[17px]"
                allowDecimal={true}
                min={0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                {t("payment.mode")}
              </label>
              <Select
                value={formData.payment_mode}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, payment_mode: v }))}
              >
                <SelectTrigger className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[12px]">
                  <SelectItem value="Cash" className="rounded-[8px]">
                    {t("payment.modes.cash")}
                  </SelectItem>
                  <SelectItem value="Bank Transfer" className="rounded-[8px]">
                    {t("payment.modes.bankTransfer")}
                  </SelectItem>
                  <SelectItem value="UPI" className="rounded-[8px]">
                    {t("payment.modes.upi")}
                  </SelectItem>
                  <SelectItem value="Cheque" className="rounded-[8px]">
                    {t("payment.modes.cheque")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                {t("payment.date")}
              </label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, payment_date: e.target.value }))
                }
                className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium tracking-[0.07em] text-[var(--muted-foreground)] uppercase block mb-1.5">
                {t("payment.ref")}
              </label>
              <Input
                value={formData.transaction_ref}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, transaction_ref: e.target.value }))
                }
                className="h-[44px] rounded-[10px] bg-[var(--muted)] border-none"
                placeholder={t("payment.refPlaceholder")}
              />
            </div>
            {/* Action buttons -- inline at end of form */}
            <div
              style={{
                paddingTop: 24,
                paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))",
              }}
            >
              <div className="flex gap-2">
                <IOSButton
                  type="button"
                  variant="gray"
                  size="large"
                  onClick={onClose}
                  fullWidth
                >
                  {t("payment.cancel")}
                </IOSButton>
                <button
                  type="submit"
                  disabled={recordPayment.isPending}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--erp-success)] text-white text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
                >
                  {recordPayment.isPending ? t("payment.recording") : t("payment.save")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
