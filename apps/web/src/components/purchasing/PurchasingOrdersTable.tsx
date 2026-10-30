import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Eye,
  Wallet,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { MobileTableCards } from "@/components/ui/MobileTableCards";
import type { PurchaseOrder } from "./types";
import { STATUS_CONFIG } from "./types";

interface PurchasingOrdersTableProps {
  orders: PurchaseOrder[];
  ordersLoading: boolean;
  isAdmin: boolean;
  dateLocale: string;
  onOpenNewPO: () => void;
  onViewDetails: (order: PurchaseOrder) => void;
  onRecordPayment: (order: PurchaseOrder) => void;
  onStatusChange: (orderId: string, newStatus: "Received") => void;
  onDeleteOrder: (order: PurchaseOrder) => void;
}

export function PurchasingOrdersTable({
  orders,
  ordersLoading,
  isAdmin,
  dateLocale,
  onOpenNewPO,
  onViewDetails,
  onRecordPayment,
  onStatusChange,
  onDeleteOrder,
}: PurchasingOrdersTableProps) {
  const t = useTranslations("purchasing.page");
  const tStatus = useTranslations("purchasing.statuses");

  const getStatusLabel = (status: "Pending" | "Ordered" | "Received") => {
    switch (status) {
      case "Pending":
        return tStatus("pending");
      case "Ordered":
        return tStatus("ordered");
      case "Received":
        return tStatus("received");
    }
  };

  const formatCurrency = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <>
      {/* ── Mobile Card View ── */}
      {!ordersLoading && orders.length > 0 && (
        <MobileTableCards
          data={orders}
          className="md:hidden"
          fields={[
            {
              key: "poNumber",
              label: "PO #",
              primary: true,
              render: (_v, o) => (
                <span className="text-[var(--primary)] font-bold">
                  {o.poNumber}{" "}
                  <span className="text-[var(--muted-foreground)] font-normal">
                    — {o.vendorName}
                  </span>
                </span>
              ),
            },
            {
              key: "items",
              label: t("thItems"),
              render: (_v, o) => t("itemsCount", { count: o.items.length }),
            },
            {
              key: "totalAmount",
              label: "Amount",
              render: (_v, o) => (
                <span className="font-semibold">
                  {formatCurrency(o.totalAmount)}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (_v, o) => (
                <div className="flex items-center justify-between w-full">
                  <IOSBadge
                    color={STATUS_CONFIG[o.status].color}
                    variant="tinted"
                    dot
                    size="medium"
                  >
                    {getStatusLabel(o.status)}
                  </IOSBadge>
                  {(o.status === "Pending" || o.status === "Ordered") && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(o.id, "Received");
                      }}
                      className="text-[12px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-[10px] py-[6px] rounded-[8px] active:bg-[var(--primary)]/15 cursor-pointer"
                    >
                      {t("btnMarkReceived")}
                    </motion.button>
                  )}
                </div>
              ),
            },
            {
              key: "createdAt",
              label: t("thDate"),
              render: (_v, o) =>
                new Date(o.createdAt).toLocaleDateString(dateLocale, {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                }),
            },
          ]}
          emptyMessage={t("emptyOrdersTitle")}
          actionsTrigger={(order) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-[32px] w-[32px] rounded-[10px] flex items-center justify-center bg-[rgba(15,23,42,0.04)] active:bg-[rgba(15,23,42,0.08)] cursor-pointer"
                >
                  <MoreVertical className="h-[16px] w-[16px] text-[var(--muted-foreground)]" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-[12px] w-[180px]">
                <DropdownMenuItem
                  onClick={() => onViewDetails(order)}
                  className="rounded-[8px]"
                >
                  <Eye className="mr-2 h-4 w-4" /> {t("actionViewDetails")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRecordPayment(order)}
                  className="rounded-[8px]"
                >
                  <Wallet className="mr-2 h-4 w-4" /> {t("actionRecordPayment")}
                </DropdownMenuItem>
                {order.status !== "Received" && isAdmin && (
                  <DropdownMenuItem
                    className="text-[var(--destructive)] rounded-[8px]"
                    onClick={() => onDeleteOrder(order)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> {t("actionDelete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* ── Desktop Table ── */}
      <IOSCard
        variant="elevated"
        padding="none"
        className="overflow-hidden glass-premium !rounded-[20px] hidden md:block"
      >
        <Table>
          <TableHeader>
            <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                {t("thPONumberVendor")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {t("thItems")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {t("thAmount")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {t("thStatus")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {t("thDate")}
              </TableHead>
              <TableHead className="w-[100px] py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-20 rounded-[6px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-16 rounded-[6px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 rounded-full bg-[var(--muted)] shimmer ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-[17px] font-medium text-[var(--muted-foreground)]">
                      {t("emptyOrdersTitle")}
                    </p>
                    <p className="text-[13px] text-[var(--muted-foreground)]">
                      {t("emptyOrdersSubtitle")}
                    </p>
                    <IOSButton
                      variant="filled"
                      size="small"
                      onClick={onOpenNewPO}
                      icon={<Plus className="h-3.5 w-3.5" />}
                    >
                      {t("btnNewPO")}
                    </IOSButton>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => {
                const statusConfig = STATUS_CONFIG[order.status];
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.03,
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                  >
                    <TableCell className="py-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-[40px] h-[40px] rounded-[10px] bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                        </div>
                        <div>
                          <span className="text-[15px] font-bold text-[var(--primary)] block leading-[20px]">
                            {order.poNumber}
                          </span>
                          <span className="text-[13px] text-[var(--muted-foreground)] mt-0.5 block">
                            {order.vendorName}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="text-[15px] font-medium text-[var(--foreground)]">
                        {t("itemsCount", { count: order.items.length })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="text-[15px] font-semibold text-[var(--foreground)]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)] block">
                        {t("taxLabel")} {formatCurrency(order.taxAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <IOSBadge
                        color={statusConfig.color}
                        variant="tinted"
                        dot
                        size="medium"
                      >
                        {getStatusLabel(order.status)}
                      </IOSBadge>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <span className="text-[13px] text-[var(--muted-foreground)]">
                        {new Date(order.createdAt).toLocaleDateString(dateLocale, {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                          </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-[12px]">
                          <DropdownMenuItem
                            onClick={() => onViewDetails(order)}
                            className="rounded-[8px]"
                          >
                            <Eye className="mr-2 h-4 w-4" /> {t("actionViewDetails")}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => onRecordPayment(order)}
                            className="rounded-[8px]"
                          >
                            <Wallet className="mr-2 h-4 w-4" /> {t("actionRecordPayment")}
                          </DropdownMenuItem>

                          {(order.status === "Pending" || order.status === "Ordered") && (
                            <DropdownMenuItem
                              onClick={() => onStatusChange(order.id, "Received")}
                              className="rounded-[8px] text-[var(--erp-success)]"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> {t("actionMarkReceived")}
                            </DropdownMenuItem>
                          )}
                          {order.status !== "Received" && isAdmin && (
                            <DropdownMenuItem
                              className="text-[var(--destructive)] rounded-[8px]"
                              onClick={() => onDeleteOrder(order)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> {t("actionDelete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </IOSCard>
    </>
  );
}
