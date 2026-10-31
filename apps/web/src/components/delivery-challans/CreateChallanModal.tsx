"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  X,
  Plus,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Info,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SearchableSelectPanel } from "@/components/ui/SearchableSelectPanel";
import { getOrderDisplayNumber } from "@/lib/order-utils";
import type { DeliveryChallan, ChallanItem, ChallanPurpose } from "@/modules/delivery-challans/domain/types";

interface CreateChallanModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  orders: any[];
  challanToEdit?: DeliveryChallan | null;
}

const inputClasses = `
  bg-white/60 dark:bg-[rgba(15,17,25,0.6)]
  border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]
  rounded-[7px] px-3 py-[6px] text-[12px]
  text-[#0F172A] dark:text-[#F1F5F9]
  placeholder:text-[#94A3B8]/50
  focus:border-blue-500/50 focus:bg-blue-500/[0.04]
  focus:ring-0 focus:outline-none
  transition-all duration-150 w-full
  h-[36px] md:h-[36px]
`;

const labelClasses = "text-[10px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-[3px] block";

function SectionCard({
  num,
  title,
  children,
  className,
  headerRight,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-white/40 dark:bg-black/40 border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-4 mb-3 hover:-translate-y-[1px] transition-transform duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-[18px] h-[18px] rounded-[5px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <span className="text-[10px] text-blue-400 font-bold">{num}</span>
          </div>
          <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.07em]">
            {title}
          </span>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

export function CreateChallanModal({
  open,
  onClose,
  onSuccess,
  clients,
  orders,
  challanToEdit,
}: CreateChallanModalProps) {
  const t = useTranslations("challans");
  const tCommon = useTranslations("common");

  const [portalMounted, setPortalMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [orderSummary, setOrderSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const actionIdempotencyKeyRef = useRef<string>(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "key-" + Date.now());

  useEffect(() => {
    if (open) {
      actionIdempotencyKeyRef.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "key-" + Date.now();
    }
  }, [open]);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLFormElement>(null);

  const getToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const [formData, setFormData] = useState({
    challan_number: "",
    challan_date: getToday(),
    purpose: "Sale" as ChallanPurpose,
    client_id: "" as string | null,
    consignee: {
      name: "",
      address: "",
      phone: "",
      gstin: "",
    },
    ship_to_address: "",
    order_id: "" as string | null,
    items: [
      {
        description: "",
        qty: 1,
        unit: "pcs",
        remarks: "",
      },
    ] as ChallanItem[],
    transporter_name: "",
    vehicle_no: "",
    lr_number: "",
    eway_bill_no: "",
    dispatch_date: "" as string | null,
    expected_delivery_date: "" as string | null,
    notes: "",
  });

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);



  // Fetch order summary if order_id changes
  const fetchOrderSummary = useCallback(async (orderId: string) => {
    if (!orderId) {
      setOrderSummary(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/delivery-challans/order-summary?order_id=${encodeURIComponent(orderId)}`);
      if (res.ok) {
        const data = await res.json();
        setOrderSummary(data);
      } else {
        setOrderSummary(null);
      }
    } catch {
      setOrderSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // Populate data when editing or opening
  useEffect(() => {
    if (challanToEdit) {
      setFormData({
        challan_number: challanToEdit.challan_number || "",
        challan_date: challanToEdit.challan_date ? challanToEdit.challan_date.split("T")[0] : getToday(),
        purpose: challanToEdit.purpose || "Sale",
        client_id: challanToEdit.client_id || null,
        consignee: {
          name: challanToEdit.consignee?.name || "",
          address: challanToEdit.consignee?.address || "",
          phone: challanToEdit.consignee?.phone || "",
          gstin: challanToEdit.consignee?.gstin || "",
        },
        ship_to_address: challanToEdit.ship_to_address || "",
        order_id: challanToEdit.order_id || null,
        items: challanToEdit.items && challanToEdit.items.length > 0
          ? challanToEdit.items.map((it) => ({
              description: it.description || "",
              qty: it.qty || 1,
              unit: it.unit || "pcs",
              remarks: it.remarks || "",
            }))
          : [{ description: "", qty: 1, unit: "pcs", remarks: "" }],
        transporter_name: challanToEdit.transporter_name || "",
        vehicle_no: challanToEdit.vehicle_no || "",
        lr_number: challanToEdit.lr_number || "",
        eway_bill_no: challanToEdit.eway_bill_no || "",
        dispatch_date: challanToEdit.dispatch_date ? challanToEdit.dispatch_date.split("T")[0] : null,
        expected_delivery_date: challanToEdit.expected_delivery_date ? challanToEdit.expected_delivery_date.split("T")[0] : null,
        notes: challanToEdit.notes || "",
      });

      if (challanToEdit.order_id) {
        fetchOrderSummary(challanToEdit.order_id);
      }
    } else {
      setFormData({
        challan_number: "",
        challan_date: getToday(),
        purpose: "Sale",
        client_id: null,
        consignee: { name: "", address: "", phone: "", gstin: "" },
        ship_to_address: "",
        order_id: null,
        items: [{ description: "", qty: 1, unit: "pcs", remarks: "" }],
        transporter_name: "",
        vehicle_no: "",
        lr_number: "",
        eway_bill_no: "",
        dispatch_date: null,
        expected_delivery_date: null,
        notes: "",
      });
      setOrderSummary(null);
    }
  }, [challanToEdit, fetchOrderSummary]);

  // Client non-sample orders
  const availableOrders = useMemo(() => {
    if (!formData.client_id) return [];
    return orders.filter((o) => {
      const cId = o.client_id ? String(o.client_id) : (o.clients?.id ? String(o.clients.id) : (o.clients?._id ? String(o.clients._id) : ""));
      const isTargetClient = cId === String(formData.client_id);
      const isNonSample = !o.is_sample;
      return isTargetClient && isNonSample;
    });
  }, [orders, formData.client_id]);

  const handleSelectClient = (client: any) => {
    const clientId = client.id || client._id ? String(client.id || client._id) : null;
    const clientAddress = [
      client.address_line_1,
      client.address_line_2,
      client.city,
      client.state,
      client.pincode,
    ].filter(Boolean).join(", ") || client.address || "";

    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      consignee: {
        name: client.name || "",
        address: clientAddress,
        phone: client.phone || client.mobile || "",
        gstin: client.gstin || client.tax_id || "",
      },
      ship_to_address: prev.ship_to_address || clientAddress,
      order_id: null, // Reset order on client change
    }));
    setOrderSummary(null);
    setClientDropdownOpen(false);
  };

  const handleSelectOrder = async (order: any) => {
    const orderId = order.id || order._id ? String(order.id || order._id) : null;
    setFormData((prev) => ({
      ...prev,
      order_id: orderId,
    }));
    setOrderDropdownOpen(false);

    if (orderId) {
      setLoadingSummary(true);
      try {
        const res = await fetch(`/api/delivery-challans/order-summary?order_id=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const summary = await res.json();
          setOrderSummary(summary);

          // Prefill first item line with order details & remaining qty
          const orderProductName = summary.product_name || order.product_name || "Product";
          const orderUnit = summary.unit || order.unit || "pcs";
          const fillQty = summary.remaining_qty > 0 ? summary.remaining_qty : summary.order_qty;

          setFormData((prev) => {
            const newItems = [...prev.items];
            newItems[0] = {
              description: orderProductName,
              qty: fillQty,
              unit: orderUnit,
              remarks: newItems[0]?.remarks || "",
            };
            return {
              ...prev,
              items: newItems,
            };
          });
        }
      } catch (err) {
        console.error("Failed to load order summary:", err);
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  // Item helpers
  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          qty: 1,
          unit: prev.items[0]?.unit || "pcs",
          remarks: "",
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof ChallanItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Over-dispatch warning check
  const overDispatchWarning = useMemo(() => {
    if (!orderSummary || !formData.order_id) return null;
    const currentItemSum = formData.items.reduce((s, it) => s + (it.qty || 0), 0);
    const totalDispatched = (orderSummary.dispatched_qty || 0) + currentItemSum;
    if (totalDispatched > orderSummary.order_qty) {
      return `Total dispatched quantity (${totalDispatched}) exceeds order quantity (${orderSummary.order_qty})`;
    }
    return null;
  }, [orderSummary, formData.order_id, formData.items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.consignee.name.trim()) {
      toast.error(t("toastSelectClient") || "Please select a client or enter consignee name");
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].description.trim()) {
      toast.error(t("toastAddItem") || "Please add at least one item");
      return;
    }

    setSubmitting(true);
    try {
      const url = challanToEdit
        ? `/api/delivery-challans/${challanToEdit.id}`
        : "/api/delivery-challans";
      const method = challanToEdit ? "PATCH" : "POST";

      const payload = {
        ...formData,
        ship_to_address: formData.ship_to_address || formData.consignee.address || "",
        dispatch_date: formData.dispatch_date || null,
        expected_delivery_date: formData.expected_delivery_date || null,
      };

      const reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (!challanToEdit) {
        reqHeaders["Idempotency-Key"] = actionIdempotencyKeyRef.current;
      }

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save delivery challan");
      }

      const resData = await res.json();
      if (resData.warnings && resData.warnings.length > 0) {
        toast.warning(resData.warnings[0]);
      } else {
        toast.success(
          challanToEdit ? t("toastUpdated") : t("toastCreated")
        );
      }

      actionIdempotencyKeyRef.current = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "key-" + Date.now();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery challan");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !portalMounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[var(--background)] border-t sm:border border-[var(--border)] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--card)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                  {challanToEdit ? t("modalEditTitle") : t("modalCreateTitle")}
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("modalSubtitle")}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scroll Area */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            ref={formScrollRef}
          >
            {/* Section 1: Consignee & Shipping Details */}
            <SectionCard num={1} title={t("secConsigneeInfo")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Client Picker */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className={labelClasses}>{t("clientSelect")} *</label>
                  <button
                    type="button"
                    onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                    className={cn(
                      inputClasses,
                      "flex items-center justify-between text-left"
                    )}
                  >
                    <span className={formData.consignee.name ? "text-[var(--foreground)] font-medium" : "text-[var(--muted-foreground)]"}>
                      {formData.consignee.name || t("clientPlaceholder")}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>

                  <SearchableSelectPanel
                    open={clientDropdownOpen}
                    onClose={() => setClientDropdownOpen(false)}
                    triggerRef={clientDropdownRef}
                  >
                    <div className="p-1.5 border-b border-[var(--surface-popover-border)] sticky top-0 bg-[var(--surface-popover)] z-10">
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder={t("clientSearch")}
                        className="w-full px-2.5 py-1 text-xs rounded-md bg-[var(--muted)] border-none focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="py-1">
                      {clients
                        .filter((c) =>
                          c.name?.toLowerCase().includes(clientSearch.toLowerCase())
                        )
                        .map((client) => (
                          <button
                            key={client.id || client._id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--muted)] transition-colors flex flex-col"
                          >
                            <span className="font-semibold text-[var(--foreground)]">
                              {client.name}
                            </span>
                            {client.gstin && (
                              <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                                GSTIN: {client.gstin}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </SearchableSelectPanel>
                </div>

                {/* Optional Order Link Picker */}
                <div className="relative" ref={orderDropdownRef}>
                  <label className={labelClasses}>{t("linkOrder")}</label>
                  <button
                    type="button"
                    disabled={!formData.client_id}
                    onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
                    className={cn(
                      inputClasses,
                      "flex items-center justify-between text-left",
                      !formData.client_id && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className={formData.order_id ? "text-[var(--foreground)] font-medium" : "text-[var(--muted-foreground)]"}>
                      {formData.order_id
                        ? (orderSummary?.order_number ? `Order #${orderSummary.order_number}` : `Order #${getOrderDisplayNumber(formData.order_id)}`)
                        : (formData.client_id ? t("linkOrderPlaceholder") : "Select a client first")}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>

                  <SearchableSelectPanel
                    open={orderDropdownOpen}
                    onClose={() => setOrderDropdownOpen(false)}
                    triggerRef={orderDropdownRef}
                  >
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, order_id: null }));
                          setOrderSummary(null);
                          setOrderDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        (No order link)
                      </button>
                      {availableOrders.map((ord) => (
                        <button
                          key={ord.id || ord._id}
                          type="button"
                          onClick={() => handleSelectOrder(ord)}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--muted)] transition-colors flex flex-col"
                        >
                          <span className="font-semibold text-[var(--foreground)]">
                            #{getOrderDisplayNumber(ord)} — {ord.product_name}
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            Qty: {ord.quantity} {ord.unit || "pcs"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </SearchableSelectPanel>
                </div>

                {/* Consignee Address */}
                <div className="md:col-span-2">
                  <label className={labelClasses}>{t("consigneeAddress")} *</label>
                  <input
                    type="text"
                    value={formData.consignee.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        consignee: { ...prev.consignee, address: e.target.value },
                        ship_to_address: prev.ship_to_address || e.target.value,
                      }))
                    }
                    placeholder="Factory / Delivery Address"
                    className={inputClasses}
                    required
                  />
                </div>

                {/* Ship to address (if different) */}
                <div className="md:col-span-2">
                  <label className={labelClasses}>{t("shipToAddress")}</label>
                  <input
                    type="text"
                    value={formData.ship_to_address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ship_to_address: e.target.value }))
                    }
                    placeholder={t("shipToPlaceholder")}
                    className={inputClasses}
                  />
                </div>

                {/* Phone & GSTIN */}
                <div>
                  <label className={labelClasses}>{t("consigneePhone")}</label>
                  <input
                    type="text"
                    value={formData.consignee.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        consignee: { ...prev.consignee, phone: e.target.value },
                      }))
                    }
                    placeholder="+91 98765 43210"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("consigneeGstin")}</label>
                  <input
                    type="text"
                    value={formData.consignee.gstin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        consignee: { ...prev.consignee, gstin: e.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="27ABCDE1234F1Z5"
                    className={cn(inputClasses, "font-mono uppercase")}
                  />
                </div>
              </div>

              {/* Order dispatch summary info banner */}
              {orderSummary && (
                <div className="mt-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <Package className="w-4 h-4" />
                    <span>{t("orderSummaryTitle")}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)]">
                    {orderSummary.product_name} — Order Qty: <strong className="text-[var(--foreground)]">{orderSummary.order_qty} {orderSummary.unit}</strong> | Already Dispatched: <strong className="text-[var(--foreground)]">{orderSummary.dispatched_qty}</strong> | Remaining: <strong className="text-[var(--foreground)]">{orderSummary.remaining_qty}</strong>
                  </div>
                </div>
              )}

              {/* Over-dispatch warning banner */}
              {overDispatchWarning && (
                <div className="mt-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{overDispatchWarning}</span>
                </div>
              )}
            </SectionCard>

            {/* Section 2: Challan & Transport Details */}
            <SectionCard num={2} title={t("secChallanDetails")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelClasses}>{t("challanDate")} *</label>
                  <input
                    type="date"
                    value={formData.challan_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, challan_date: e.target.value }))
                    }
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("purposeLabel")} *</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, purpose: e.target.value as ChallanPurpose }))
                    }
                    className={inputClasses}
                    required
                  >
                    <option value="Sale">{t("purposeSale")}</option>
                    <option value="Job Work">{t("purposeJobWork")}</option>
                    <option value="Sample">{t("purposeSample")}</option>
                    <option value="Other">{t("purposeOther")}</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>{t("transporterName")}</label>
                  <input
                    type="text"
                    value={formData.transporter_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, transporter_name: e.target.value }))
                    }
                    placeholder="VRL / SafeExpress / Self"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("vehicleNo")}</label>
                  <input
                    type="text"
                    value={formData.vehicle_no}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vehicle_no: e.target.value.toUpperCase() }))
                    }
                    placeholder="MH-12-AB-1234"
                    className={cn(inputClasses, "font-mono uppercase")}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("lrNumber")}</label>
                  <input
                    type="text"
                    value={formData.lr_number}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lr_number: e.target.value }))
                    }
                    placeholder="LR-987654"
                    className={cn(inputClasses, "font-mono")}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("ewayBillNo")}</label>
                  <input
                    type="text"
                    value={formData.eway_bill_no}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, eway_bill_no: e.target.value }))
                    }
                    placeholder="241001234567"
                    className={cn(inputClasses, "font-mono")}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("dispatchDate")}</label>
                  <input
                    type="date"
                    value={formData.dispatch_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dispatch_date: e.target.value || null }))
                    }
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("expectedDeliveryDate")}</label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, expected_delivery_date: e.target.value || null }))
                    }
                    className={inputClasses}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 3: Items & Goods (NO PRICES, NO RATES, NO AMOUNTS) */}
            <SectionCard
              num={3}
              title={t("secItems")}
              headerRight={
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addItem")}
                </button>
              }
            >
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                        #{index + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-400 hover:text-red-500 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <label className={labelClasses}>{t("colItem")} *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder={t("itemPlaceholder")}
                          className={inputClasses}
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className={labelClasses}>{t("colQty")} *</label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, "qty", parseFloat(e.target.value) || 0)
                          }
                          className={inputClasses}
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className={labelClasses}>{t("colUnit")} *</label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          placeholder="pcs / kg / m"
                          className={inputClasses}
                          required
                        />
                      </div>

                      <div className="sm:col-span-12">
                        <label className={labelClasses}>{t("colRemarks")}</label>
                        <input
                          type="text"
                          value={item.remarks || ""}
                          onChange={(e) => updateItem(index, "remarks", e.target.value)}
                          placeholder="Batch #, bundle count, markings..."
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Section 4: Notes & Instructions */}
            <SectionCard num={4} title={t("secNotes")}>
              <div>
                <label className={labelClasses}>{t("notesLabel")}</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t("notesPlaceholder")}
                  className={cn(inputClasses, "h-auto py-2")}
                />
              </div>
            </SectionCard>

            {/* Footer Buttons */}
            <div className="pt-2 pb-6 sm:pb-2 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {submitting ? t("saving") : challanToEdit ? t("btnUpdateChallan") : t("btnSaveChallan")}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
