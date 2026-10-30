import { useTranslations } from "next-intl";
import { FileText, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import type { PurchaseOrder } from "./types";
import { STATUS_CONFIG } from "./types";

interface PODetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  dateLocale: string;
}

export function PODetailModal({
  isOpen,
  onClose,
  order,
  dateLocale,
}: PODetailModalProps) {
  const tOrderDetail = useTranslations("purchasing.orderDetail");

  if (!order) return null;

  const formatCurrency = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        fullScreenMobile
        className="max-w-md md:max-w-lg p-0 overflow-hidden rounded-[24px] border-[var(--glass-border)] glass-dialog md:max-h-[85dvh] flex flex-col"
      >
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-4">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingBottom: 12,
                marginBottom: 12,
                borderBottom: "1px solid var(--glass-border)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(255,255,255,0.06))",
                  border: "1px solid var(--glass-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText className="h-[18px] w-[18px] text-[#c084fc]" />
              </div>
              <div>
                <DialogTitle
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--g-text-primary)",
                    lineHeight: "22px",
                    margin: 0,
                  }}
                >
                  {order.poNumber}
                </DialogTitle>
                <DialogDescription
                  style={{
                    fontSize: 13,
                    color: "var(--g-text-secondary)",
                    lineHeight: "18px",
                    margin: "2px 0 0",
                  }}
                >
                  {tOrderDetail("lblVendor")} {order.vendorName}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <IOSBadge
                color={STATUS_CONFIG[order.status].color}
                variant="tinted"
                size="medium"
              >
                {order.status}
              </IOSBadge>
              <span className="text-[13px] text-[var(--muted-foreground)]">
                {tOrderDetail("lblCreated")}{" "}
                {new Date(order.createdAt).toLocaleDateString(dateLocale)}
              </span>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                {tOrderDetail("lblMaterials")}
              </h4>
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--muted)]"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <span className="text-[14px] font-medium text-[var(--foreground)] block">
                        {item.materialName}
                      </span>
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[14px] font-semibold text-[var(--foreground)]">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="p-3 rounded-[12px] bg-[var(--muted)] space-y-1">
              <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                <span>{tOrderDetail("lblSubtotal")}</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                <span>{tOrderDetail("lblTax")}</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-[17px] font-bold text-[var(--foreground)] pt-2 border-t border-[var(--border)]">
                <span>{tOrderDetail("lblTotal")}</span>
                <span className="text-[var(--primary)]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="text-[13px] text-[var(--muted-foreground)]">
                <span className="font-medium">{tOrderDetail("lblNotes")}</span>{" "}
                {order.notes}
              </div>
            )}

            {order.orderedAt && (
              <div className="text-[13px] text-[var(--muted-foreground)]">
                {tOrderDetail("lblOrdered")}{" "}
                {new Date(order.orderedAt).toLocaleDateString(dateLocale)}
              </div>
            )}
            {order.receivedAt && (
              <div className="text-[13px] text-[var(--erp-success)] font-medium">
                {tOrderDetail("lblReceived")}{" "}
                {new Date(order.receivedAt).toLocaleDateString(dateLocale)}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
