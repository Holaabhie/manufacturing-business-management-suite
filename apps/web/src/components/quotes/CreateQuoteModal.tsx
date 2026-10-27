"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SearchableSelectPanel } from "@/components/ui/SearchableSelectPanel";
import type { Quotation, QuoteItem } from "@/modules/quotes/domain/types";

interface CompanyInfo {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  state?: string;
}

interface CreateQuoteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  companyInfo?: CompanyInfo | null;
  quoteToEdit?: Quotation | null;
}

const GST_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
];

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

export function CreateQuoteModal({
  open,
  onClose,
  onSuccess,
  clients,
  companyInfo,
  quoteToEdit,
}: CreateQuoteModalProps) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");

  const [formData, setFormData] = useState({
    clientId: "",
    clientName: "",
    clientAddress: "",
    clientGSTIN: "",
    clientPhone: "",
    clientEmail: "",
    quotation_date: new Date().toISOString().split("T")[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    terms: t("defaultTerms"),
    items: [] as QuoteItem[],
    is_igst: false,
  });

  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLFormElement>(null);

  // Lock body scroll while open
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

  // SSR-safe portal mount guard
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => setPortalMounted(true), []);

  // Populate when editing or reset when opening fresh
  useEffect(() => {
    if (open) {
      if (quoteToEdit) {
        setFormData({
          clientId: quoteToEdit.clientId || quoteToEdit.customer?.id || "",
          clientName: quoteToEdit.clientName || quoteToEdit.customer?.name || "",
          clientAddress: quoteToEdit.clientAddress || quoteToEdit.customer?.address || "",
          clientGSTIN: quoteToEdit.clientGSTIN || quoteToEdit.customer?.gstin || "",
          clientPhone: quoteToEdit.clientPhone || quoteToEdit.customer?.phone || "",
          clientEmail: quoteToEdit.clientEmail || quoteToEdit.customer?.email || "",
          quotation_date: quoteToEdit.quotation_date || new Date().toISOString().split("T")[0],
          valid_until: quoteToEdit.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          notes: quoteToEdit.notes || "",
          terms: quoteToEdit.terms || t("defaultTerms"),
          items: quoteToEdit.items && quoteToEdit.items.length > 0 ? quoteToEdit.items : [],
          is_igst: Boolean(quoteToEdit.is_igst),
        });
      } else {
        const today = new Date().toISOString().split("T")[0];
        const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        setFormData({
          clientId: "",
          clientName: "",
          clientAddress: "",
          clientGSTIN: "",
          clientPhone: "",
          clientEmail: "",
          quotation_date: today,
          valid_until: thirtyDays,
          notes: "",
          terms: t("defaultTerms"),
          items: [
            {
              item_id: "1",
              description: "",
              hsn_sac: "",
              qty: 1,
              unit: "pcs",
              rate: 0,
              discount: 0,
              gst_rate: 18,
              cgst: 0,
              sgst: 0,
              igst: 0,
              line_total: 0,
            },
          ],
          is_igst: false,
        });
      }
    }
  }, [open, quoteToEdit, t]);

  const selectedClient = useMemo(
    () => clients.find((c) => (c.id || c._id) === formData.clientId),
    [clients, formData.clientId]
  );

  // Auto GST Type Detection based on state matching
  useEffect(() => {
    if (!selectedClient || !companyInfo) return;
    const clientState = (selectedClient.state || selectedClient.address || "").toLowerCase();
    const companyState = (companyInfo.state || companyInfo.address || "").toLowerCase();
    if (clientState && companyState) {
      const sameState = clientState.includes(companyState) || companyState.includes(clientState);
      setFormData((prev) => ({ ...prev, is_igst: !sameState }));
    }
  }, [selectedClient, companyInfo]);



  // Line item manipulation
  const addItem = () => {
    const newItem: QuoteItem = {
      item_id: Date.now().toString(),
      description: "",
      hsn_sac: "",
      qty: 1,
      unit: "pcs",
      rate: 0,
      discount: 0,
      gst_rate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      line_total: 0,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      const item = { ...nextItems[index], [field]: value };

      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const discount = Number(item.discount || 0);
      const gstRate = Number(item.gst_rate || 0);

      const taxable = Math.max(0, qty * rate - discount);
      const taxAmount = (taxable * gstRate) / 100;

      if (prev.is_igst) {
        item.igst = Math.round(taxAmount * 100) / 100;
        item.cgst = 0;
        item.sgst = 0;
      } else {
        item.cgst = Math.round((taxAmount / 2) * 100) / 100;
        item.sgst = Math.round((taxAmount / 2) * 100) / 100;
        item.igst = 0;
      }

      item.line_total = Math.round((taxable + taxAmount) * 100) / 100;
      nextItems[index] = item;
      return { ...prev, items: nextItems };
    });
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Recompute line taxes when is_igst toggles
  const handleToggleIgst = (isIGST: boolean) => {
    setFormData((prev) => {
      const nextItems = prev.items.map((item) => {
        const taxable = Math.max(0, (item.qty || 0) * (item.rate || 0) - (item.discount || 0));
        const taxAmount = (taxable * (item.gst_rate || 0)) / 100;
        let cgst = 0,
          sgst = 0,
          igst = 0;

        if (isIGST) {
          igst = Math.round(taxAmount * 100) / 100;
        } else {
          cgst = Math.round((taxAmount / 2) * 100) / 100;
          sgst = Math.round((taxAmount / 2) * 100) / 100;
        }

        return {
          ...item,
          cgst,
          sgst,
          igst,
          line_total: Math.round((taxable + taxAmount) * 100) / 100,
        };
      });

      return {
        ...prev,
        is_igst: isIGST,
        items: nextItems,
      };
    });
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    formData.items.forEach((item) => {
      const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
      const disc = Number(item.discount) || 0;
      const taxable = Math.max(0, gross - disc);
      const gstRate = Number(item.gst_rate) || 0;
      const tax = (taxable * gstRate) / 100;

      subtotal += gross;
      totalDiscount += disc;

      if (formData.is_igst) {
        totalIgst += tax;
      } else {
        totalCgst += tax / 2;
        totalSgst += tax / 2;
      }
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const grandTotal = Math.round(subtotal - totalDiscount + totalTax);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      grandTotal,
    };
  }, [formData.items, formData.is_igst]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      return toast.error(t("toastSelectClient"));
    }
    if (formData.items.length === 0) {
      return toast.error(t("toastAddItem"));
    }

    setSubmitting(true);

    try {
      const payload = {
        quotation_date: formData.quotation_date,
        valid_until: formData.valid_until,
        customer: {
          id: formData.clientId || null,
          name: formData.clientName,
          address: formData.clientAddress,
          gstin: formData.clientGSTIN,
          phone: formData.clientPhone,
          email: formData.clientEmail,
        },
        clientId: formData.clientId || null,
        clientName: formData.clientName,
        clientAddress: formData.clientAddress,
        clientGSTIN: formData.clientGSTIN,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        items: formData.items,
        subtotal: calculations.subtotal,
        total_discount: calculations.totalDiscount,
        total_tax: calculations.totalTax,
        grand_total: calculations.grandTotal,
        cgst_amount: calculations.totalCgst,
        sgst_amount: calculations.totalSgst,
        igst_amount: calculations.totalIgst,
        is_igst: formData.is_igst,
        terms: formData.terms,
        notes: formData.notes,
        status: quoteToEdit ? quoteToEdit.status : "Draft",
      };

      const url = quoteToEdit ? `/api/quotes/${quoteToEdit.id}` : "/api/quotes";
      const method = quoteToEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save quotation");
      }

      toast.success(quoteToEdit ? t("toastUpdated") : t("toastCreated"));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save quotation");
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

        {/* Modal Sheet Window */}
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
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                  {quoteToEdit ? t("modalEditTitle") : t("modalCreateTitle")}
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
            {/* Section 1: Customer Details */}
            <SectionCard num={1} title={t("secClientInfo")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <span className={formData.clientName ? "text-[var(--foreground)] font-medium" : "text-[var(--muted-foreground)]"}>
                      {formData.clientName || t("clientPlaceholder")}
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
                          c.name.toLowerCase().includes(clientSearch.toLowerCase())
                        )
                        .map((client) => (
                          <button
                            key={client.id || client._id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                clientId: client.id || client._id,
                                clientName: client.name,
                                clientAddress: client.address || "",
                                clientGSTIN: client.gstin || "",
                                clientPhone: client.phone || "",
                                clientEmail: client.email || "",
                              }));
                              setClientDropdownOpen(false);
                              setClientSearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-colors flex items-center justify-between"
                          >
                            <span className="font-semibold">{client.name}</span>
                            {client.gstin && (
                              <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                                {client.gstin}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </SearchableSelectPanel>
                </div>

                <div>
                  <label className={labelClasses}>GSTIN</label>
                  <input
                    type="text"
                    value={formData.clientGSTIN}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, clientGSTIN: e.target.value }))
                    }
                    placeholder="24ABCDE1234F1Z5"
                    className={inputClasses}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClasses}>Address</label>
                  <input
                    type="text"
                    value={formData.clientAddress}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, clientAddress: e.target.value }))
                    }
                    placeholder="Full client business address"
                    className={inputClasses}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Quote Dates & Tax Mode */}
            <SectionCard
              num={2}
              title={t("secQuoteDetails")}
              headerRight={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleIgst(false)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors",
                      !formData.is_igst
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    CGST + SGST
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleIgst(true)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors",
                      formData.is_igst
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    IGST
                  </button>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>{t("quoteDate")} *</label>
                  <input
                    type="date"
                    value={formData.quotation_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quotation_date: e.target.value }))
                    }
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("validUntil")} *</label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, valid_until: e.target.value }))
                    }
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  {formData.is_igst ? t("autoDetectedIgst") : t("autoDetectedCgstSgst")}
                </span>
              </div>
            </SectionCard>

            {/* Section 3: Products & Services (Line Items) */}
            <SectionCard
              num={3}
              title={t("secLineItems")}
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
                    key={item.item_id || index}
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
                      <div className="sm:col-span-5">
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

                      <div className="sm:col-span-2">
                        <label className={labelClasses}>{t("colHsn")}</label>
                        <input
                          type="text"
                          value={item.hsn_sac}
                          onChange={(e) => updateItem(index, "hsn_sac", e.target.value)}
                          placeholder="8479"
                          className={inputClasses}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClasses}>{t("colQty")} *</label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={item.qty}
                          onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                          className={inputClasses}
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className={labelClasses}>{t("colRate")} (₹) *</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                          className={inputClasses}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--border)]/50">
                      <div>
                        <label className={labelClasses}>{t("colDiscount")} (₹)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.discount}
                          onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                          className={inputClasses}
                        />
                      </div>

                      <div>
                        <label className={labelClasses}>{t("colGstRate")}</label>
                        <select
                          value={item.gst_rate}
                          onChange={(e) => updateItem(index, "gst_rate", parseFloat(e.target.value) || 0)}
                          className={inputClasses}
                        >
                          {GST_RATES.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 flex items-center justify-end pr-2 pt-3">
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--muted-foreground)] block">
                            {t("colTotal")}
                          </span>
                          <span className="text-sm font-bold text-[var(--foreground)] font-mono">
                            ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="mt-4 p-4 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] flex flex-col items-end space-y-1 text-xs">
                <div className="flex justify-between w-64 text-[var(--muted-foreground)]">
                  <span>{t("subtotal")}:</span>
                  <span className="font-mono">₹{calculations.subtotal.toLocaleString("en-IN")}</span>
                </div>

                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between w-64 text-amber-500 font-medium">
                    <span>{t("totalDiscount")}:</span>
                    <span className="font-mono">- ₹{calculations.totalDiscount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {formData.is_igst ? (
                  <div className="flex justify-between w-64 text-[var(--muted-foreground)]">
                    <span>IGST:</span>
                    <span className="font-mono">₹{calculations.totalIgst.toLocaleString("en-IN")}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between w-64 text-[var(--muted-foreground)]">
                      <span>CGST:</span>
                      <span className="font-mono">₹{calculations.totalCgst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between w-64 text-[var(--muted-foreground)]">
                      <span>SGST:</span>
                      <span className="font-mono">₹{calculations.totalSgst.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}

                <div className="w-64 pt-2 border-t border-[var(--border)] flex justify-between text-base font-bold text-[var(--foreground)]">
                  <span>{t("grandTotal")}:</span>
                  <span className="font-mono text-blue-500">
                    ₹{calculations.grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Section 4: Notes & Terms */}
            <SectionCard num={4} title={t("secNotesTerms")}>
              <div className="space-y-3">
                <div>
                  <label className={labelClasses}>{t("notesLabel")}</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder={t("notesPlaceholder")}
                    className={cn(inputClasses, "h-auto py-2")}
                  />
                </div>

                <div>
                  <label className={labelClasses}>{t("termsLabel")}</label>
                  <textarea
                    rows={3}
                    value={formData.terms}
                    onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.value }))}
                    placeholder={t("termsPlaceholder")}
                    className={cn(inputClasses, "h-auto py-2")}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0 pb-6 sm:pb-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {tCommon("cancel")}
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <span>{t("saving")}</span>
                ) : quoteToEdit ? (
                  <span>{t("btnUpdateQuote")}</span>
                ) : (
                  <span>{t("btnSaveQuote")}</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
