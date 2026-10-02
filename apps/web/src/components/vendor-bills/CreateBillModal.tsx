"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ReceiptText,
    X,
    Plus,
    Trash2,
    ChevronDown,
    AlertTriangle,
    Info,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DEFAULT_CREDIT_DAYS } from "@/lib/reports/receivables";
import type { VendorBill, SupplyType, VendorSnapshot } from "@/modules/vendor-bills/domain/types";

interface VendorOption {
    id: string;
    _id?: string;
    name: string;
    gstin?: string;
    address?: string;
    phone?: string;
    state_code?: string;
}

interface PurchaseOrderOption {
    id: string;
    _id?: string;
    poNumber?: string;
    po_number?: string;
    vendorId: string;
    subtotal: number;
    taxAmount?: number;
    totalAmount?: number;
    status: string;
}

interface CreateBillModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (bill: VendorBill) => void;
    billToEdit?: VendorBill | null;
}

const GST_RATES = [0, 5, 12, 18, 28];

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
                    <div className="w-[18px] h-[18px] rounded-[5px] bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                        <span className="text-[10px] text-emerald-500 font-bold">{num}</span>
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

export function CreateBillModal({
    open,
    onClose,
    onSuccess,
    billToEdit,
}: CreateBillModalProps) {
    const t = useTranslations("vendorBills");
    const tCommon = useTranslations("common");

    const [portalMounted, setPortalMounted] = useState(false);
    useEffect(() => {
        setPortalMounted(true);
    }, []);

    // Vendor and PO data
    const [vendors, setVendors] = useState<VendorOption[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);
    const [companyStateCode, setCompanyStateCode] = useState<string>("");
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Form State
    const getToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const getInitialDueDate = (billDateStr: string) => {
        const d = new Date(billDateStr + "T00:00:00.000Z");
        d.setUTCDate(d.getUTCDate() + DEFAULT_CREDIT_DAYS);
        return d.toISOString().split("T")[0];
    };

    const [vendorId, setVendorId] = useState("");
    const [vendorSnapshot, setVendorSnapshot] = useState<VendorSnapshot>({
        name: "",
        gstin: "",
        address: "",
        phone: "",
        state_code: "",
    });
    const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);
    const [poSummaryData, setPoSummaryData] = useState<any>(null);
    const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
    const [billDate, setBillDate] = useState(getToday());
    const [dueDate, setDueDate] = useState(getInitialDueDate(getToday()));
    const [supplyType, setSupplyType] = useState<SupplyType | null>("intra");
    const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("");
    const [reverseCharge, setReverseCharge] = useState(false);
    const [itcEligible, setItcEligible] = useState(true);
    const [notes, setNotes] = useState("");

    // TDS
    const [enableTds, setEnableTds] = useState(false);
    const [tdsSection, setTdsSection] = useState("194C");
    const [tdsRate, setTdsRate] = useState<number>(1);

    // Line items
    const [items, setItems] = useState<
        Array<{
            description: string;
            hsn_sac: string;
            qty: number;
            unit: string;
            rate: number;
            discount: number;
            gst_rate: number;
        }>
    >([
        {
            description: "",
            hsn_sac: "",
            qty: 1,
            unit: "unit",
            rate: 0,
            discount: 0,
            gst_rate: 18,
        },
    ]);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
    const [vendorSearch, setVendorSearch] = useState("");
    const vendorDropdownRef = useRef<HTMLDivElement>(null);
    const formScrollRef = useRef<HTMLFormElement>(null);

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

    // Close vendor dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                vendorDropdownRef.current &&
                !vendorDropdownRef.current.contains(e.target as Node)
            ) {
                setVendorDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load initial reference data (vendors, POs, company state)
    useEffect(() => {
        if (!open) return;
        setIsLoadingData(true);

        Promise.allSettled([
            fetch("/api/purchasing/vendors").then((r) => r.json()),
            fetch("/api/purchasing").then((r) => r.json()),
            fetch("/api/profile/company").then((r) => r.json()),
        ]).then(([vendorsRes, poRes, compRes]) => {
            if (vendorsRes.status === "fulfilled") {
                const raw = vendorsRes.value;
                const list = Array.isArray(raw) ? raw : raw?.data || raw?.vendors || [];
                setVendors(
                    list.map((v: any) => ({
                        id: String(v._id || v.id),
                        name: v.name || "Unnamed Vendor",
                        gstin: v.gstin || "",
                        address: v.address || "",
                        phone: v.phone || "",
                        state_code: v.state_code || (v.gstin ? v.gstin.slice(0, 2) : ""),
                    }))
                );
            }
            if (poRes.status === "fulfilled") {
                const raw = poRes.value;
                const list = Array.isArray(raw) ? raw : raw?.data || raw?.purchase_orders || [];
                setPurchaseOrders(
                    list.map((p: any) => ({
                        id: String(p._id || p.id),
                        poNumber: p.poNumber || p.po_number || String(p._id || p.id),
                        vendorId: String(p.vendorId || p.vendor_id),
                        subtotal: Number(p.subtotal || 0),
                        taxAmount: Number(p.taxAmount || 0),
                        totalAmount: Number(p.totalAmount || 0),
                        status: p.status || "Draft",
                    }))
                );
            }
            if (compRes.status === "fulfilled" && compRes.value?.company) {
                const c = compRes.value.company;
                const state = c.state_code || (c.gstin ? c.gstin.slice(0, 2) : "");
                setCompanyStateCode(state);
            }
            setIsLoadingData(false);
        });
    }, [open]);

    // Populate edit data if provided
    useEffect(() => {
        if (billToEdit) {
            setVendorId(billToEdit.vendor_id);
            setVendorSnapshot(billToEdit.vendor);
            setPurchaseOrderId(billToEdit.purchase_order_id || null);
            setVendorInvoiceNumber(billToEdit.vendor_invoice_number);
            setBillDate(billToEdit.bill_date);
            setDueDate(billToEdit.due_date);
            setSupplyType(billToEdit.supply_type);
            setPlaceOfSupplyStateCode(billToEdit.place_of_supply_state_code || "");
            setReverseCharge(billToEdit.reverse_charge);
            setItcEligible(billToEdit.itc_eligible);
            setNotes(billToEdit.notes || "");
            if (billToEdit.tds) {
                setEnableTds(true);
                setTdsSection(billToEdit.tds.section);
                setTdsRate(billToEdit.tds.rate);
            } else {
                setEnableTds(false);
            }
            if (billToEdit.items && billToEdit.items.length > 0) {
                setItems(
                    billToEdit.items.map((i) => ({
                        description: i.description,
                        hsn_sac: i.hsn_sac,
                        qty: i.qty,
                        unit: i.unit,
                        rate: i.rate,
                        discount: i.discount,
                        gst_rate: i.gst_rate,
                    }))
                );
            }
        } else {
            // Reset to defaults
            setVendorId("");
            setVendorSnapshot({ name: "", gstin: "", address: "", phone: "", state_code: "" });
            setPurchaseOrderId(null);
            setPoSummaryData(null);
            setVendorInvoiceNumber("");
            const today = getToday();
            setBillDate(today);
            setDueDate(getInitialDueDate(today));
            setSupplyType("intra");
            setPlaceOfSupplyStateCode("");
            setReverseCharge(false);
            setItcEligible(true);
            setNotes("");
            setEnableTds(false);
            setTdsSection("194C");
            setTdsRate(1);
            setItems([
                { description: "", hsn_sac: "", qty: 1, unit: "unit", rate: 0, discount: 0, gst_rate: 18 },
            ]);
        }
    }, [billToEdit, open]);

    // Handle vendor selection and auto-supply detection
    const handleSelectVendor = (vendor: VendorOption) => {
        setVendorId(vendor.id);
        setVendorSnapshot({
            name: vendor.name,
            gstin: vendor.gstin || "",
            address: vendor.address || "",
            phone: vendor.phone || "",
            state_code: vendor.state_code || (vendor.gstin ? vendor.gstin.slice(0, 2) : ""),
        });
        setVendorDropdownOpen(false);

        // ITC default
        setItcEligible(Boolean(vendor.gstin && vendor.gstin.trim().length > 0));

        // Auto-detect supply type if company state & vendor state are available
        const vendorState = vendor.state_code || (vendor.gstin ? vendor.gstin.slice(0, 2) : "");
        if (companyStateCode && vendorState) {
            if (companyStateCode === vendorState) {
                setSupplyType("intra");
            } else {
                setSupplyType("inter");
            }
        }
        setPlaceOfSupplyStateCode(companyStateCode || vendorState || "");

        // If a linked PO was selected but belongs to another vendor, clear it
        if (purchaseOrderId) {
            const po = purchaseOrders.find((p) => p.id === purchaseOrderId);
            if (po && po.vendorId !== vendor.id) {
                setPurchaseOrderId(null);
                setPoSummaryData(null);
            }
        }
    };

    // Handle PO selection and prefill
    const handleSelectPO = async (poId: string) => {
        if (!poId) {
            setPurchaseOrderId(null);
            setPoSummaryData(null);
            return;
        }

        setPurchaseOrderId(poId);
        try {
            const res = await fetch(`/api/vendor-bills/po-summary?purchase_order_id=${poId}`);
            if (res.ok) {
                const data = await res.json();
                setPoSummaryData(data);

                // Auto-set vendor if not already set
                if (!vendorId && data.vendor_id) {
                    const match = vendors.find((v) => v.id === data.vendor_id);
                    if (match) {
                        handleSelectVendor(match);
                    } else if (data.vendor) {
                        setVendorId(data.vendor_id);
                        setVendorSnapshot(data.vendor);
                    }
                }

                // Prefill items if user hasn't typed line items yet
                if (data.items && data.items.length > 0) {
                    const isBlank =
                        items.length === 1 &&
                        !items[0].description &&
                        items[0].rate === 0;
                    if (isBlank) {
                        setItems(
                            data.items.map((i: any) => ({
                                description: i.description,
                                hsn_sac: i.hsn_sac || "",
                                qty: i.qty || 1,
                                unit: i.unit || "unit",
                                rate: i.rate || 0,
                                discount: 0,
                                gst_rate: i.gst_rate ?? 18,
                            }))
                        );
                    }
                }
            }
        } catch (err) {
            console.warn("Failed to fetch PO summary:", err);
        }
    };

    // Update bill date and default due date
    const handleBillDateChange = (newDate: string) => {
        setBillDate(newDate);
        if (!billToEdit) {
            setDueDate(getInitialDueDate(newDate));
        }
    };

    // Item changes
    const handleItemChange = (index: number, field: string, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { description: "", hsn_sac: "", qty: 1, unit: "unit", rate: 0, discount: 0, gst_rate: 18 },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            setItems([
                { description: "", hsn_sac: "", qty: 1, unit: "unit", rate: 0, discount: 0, gst_rate: 18 },
            ]);
            return;
        }
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    // Live calculations (display only — server calculates authoritatively)
    const calculations = useMemo(() => {
        let subtotal = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        items.forEach((item) => {
            const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
            const discount = Math.min(Math.max(0, Number(item.discount) || 0), gross);
            const taxable = gross - discount;
            const rate = Number(item.gst_rate) || 0;
            const tax = (taxable * rate) / 100;

            subtotal += taxable;

            if (supplyType === "intra") {
                const half = tax / 2;
                cgst += half;
                sgst += half;
            } else if (supplyType === "inter") {
                igst += tax;
            }
        });

        const totalTax = cgst + sgst + igst;
        const grandTotal = subtotal + totalTax;

        let tdsAmount = 0;
        if (enableTds && tdsRate > 0) {
            tdsAmount = (subtotal * tdsRate) / 100;
        }

        const payableAmount = Math.max(0, grandTotal - tdsAmount);

        return {
            subtotal,
            cgst,
            sgst,
            igst,
            totalTax,
            grandTotal,
            tdsAmount,
            payableAmount,
        };
    }, [items, supplyType, enableTds, tdsRate]);

    // Check PO over-billing warning
    const poOverBillingWarning = useMemo(() => {
        if (!poSummaryData) return null;
        const prospectiveTotal = poSummaryData.already_billed_subtotal + calculations.subtotal;
        if (prospectiveTotal > poSummaryData.subtotal) {
            const excess = prospectiveTotal - poSummaryData.subtotal;
            return `Total billed amount (₹${prospectiveTotal.toFixed(2)}) exceeds PO subtotal (₹${poSummaryData.subtotal.toFixed(2)}) by ₹${excess.toFixed(2)}`;
        }
        return null;
    }, [poSummaryData, calculations.subtotal]);

    // Submit handler
    const handleSubmit = async (e: React.FormEvent, targetStatus: "Draft" | "Open" = "Draft") => {
        e.preventDefault();

        if (!vendorId) {
            toast.error(t("vendorSelect"));
            return;
        }

        if (!vendorInvoiceNumber.trim()) {
            toast.error(t("errVendorInvoiceRequired"));
            return;
        }

        if (targetStatus === "Open") {
            if (!supplyType) {
                toast.error(t("errSelectSupplyType"));
                return;
            }
            if (calculations.grandTotal <= 0) {
                toast.error(t("errGrandTotalZero"));
                return;
            }
            if (items.length === 0 || !items[0].description) {
                toast.error(t("errAtLeastOneItem"));
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                vendor_id: vendorId,
                vendor: {
                    name: vendorSnapshot.name,
                    gstin: vendorSnapshot.gstin || "",
                    address: vendorSnapshot.address || "",
                    phone: vendorSnapshot.phone || "",
                    state_code: vendorSnapshot.state_code || "",
                },
                purchase_order_id: purchaseOrderId || null,
                vendor_invoice_number: vendorInvoiceNumber.trim(),
                bill_date: billDate,
                due_date: dueDate,
                supply_type: supplyType,
                place_of_supply_state_code: placeOfSupplyStateCode || null,
                reverse_charge: reverseCharge,
                itc_eligible: itcEligible,
                items: items.map((i) => ({
                    description: i.description.trim(),
                    hsn_sac: i.hsn_sac.trim(),
                    qty: Number(i.qty),
                    unit: i.unit.trim() || "unit",
                    rate: Number(i.rate),
                    discount: Number(i.discount) || 0,
                    gst_rate: Number(i.gst_rate) || 0,
                })),
                tds: enableTds
                    ? {
                        section: tdsSection.trim(),
                        rate: Number(tdsRate) || 0,
                    }
                    : null,
                notes: notes.trim(),
            };

            let savedBill: VendorBill;

            if (billToEdit) {
                const res = await fetch(`/api/vendor-bills/${billToEdit.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to update vendor bill");
                savedBill = data;
                toast.success(t("toastUpdated"));
            } else {
                const res = await fetch("/api/vendor-bills", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create vendor bill");
                savedBill = data;
                toast.success(t("toastCreated"));
            }

            // If user clicked "Open Bill" directly from creation
            if (targetStatus === "Open" && savedBill.status === "Draft") {
                const openRes = await fetch(`/api/vendor-bills/${savedBill.id}/status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "Open" }),
                });
                const openData = await openRes.json();
                if (!openRes.ok) throw new Error(openData.error || "Failed to open bill");
                savedBill = openData;
                toast.success(t("toastStatusOpen"));
            }

            onSuccess(savedBill);
            onClose();
        } catch (err: any) {
            toast.error(err.message || t("errSaveBill"));
        } finally {
            setIsSaving(false);
        }
    };

    if (!portalMounted || !open) return null;

    // Filtered POs by selected vendor
    const eligiblePOs = vendorId
        ? purchaseOrders.filter((po) => po.vendorId === vendorId && po.status !== "Cancelled")
        : purchaseOrders.filter((po) => po.status !== "Cancelled");

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
                {/* Backdrop Click */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0"
                />

                {/* Modal Container */}
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
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                <ReceiptText className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                                    {billToEdit ? t("modalEditTitle") : t("modalCreateTitle")}
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
                        onSubmit={(e) => handleSubmit(e, "Draft")}
                        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                        ref={formScrollRef}
                    >
                        {/* Section 1: Vendor & Purchase Order */}
                        <SectionCard num={1} title={t("secVendorInfo")}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Vendor Picker */}
                                <div className="relative" ref={vendorDropdownRef}>
                                    <label className={labelClasses}>{t("vendorSelect")} *</label>
                                    <button
                                        type="button"
                                        onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                                        className={cn(inputClasses, "flex items-center justify-between text-left")}
                                    >
                                        <span
                                            className={
                                                vendorSnapshot.name
                                                    ? "text-[var(--foreground)] font-medium"
                                                    : "text-[var(--muted-foreground)]"
                                            }
                                        >
                                            {vendorSnapshot.name || t("vendorPlaceholder")}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                                    </button>

                                    {vendorDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-56 overflow-y-auto p-1">
                                            <div className="p-1.5 border-b border-[var(--border)]">
                                                <input
                                                    type="text"
                                                    value={vendorSearch}
                                                    onChange={(e) => setVendorSearch(e.target.value)}
                                                    placeholder={t("vendorSearch")}
                                                    className="w-full px-2.5 py-1 text-xs rounded-md bg-[var(--muted)] border-none focus:outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="py-1">
                                                {vendors
                                                    .filter((v) =>
                                                        v.name.toLowerCase().includes(vendorSearch.toLowerCase())
                                                    )
                                                    .map((v) => (
                                                        <button
                                                            key={v.id}
                                                            type="button"
                                                            onClick={() => handleSelectVendor(v)}
                                                            className="w-full px-3 py-2 text-left hover:bg-[var(--muted)] flex items-center justify-between rounded-lg transition-colors"
                                                        >
                                                            <div>
                                                                <div className="text-xs font-semibold text-[var(--foreground)]">
                                                                    {v.name}
                                                                </div>
                                                                {v.gstin && (
                                                                    <div className="text-[10px] text-[var(--muted-foreground)]">
                                                                        GSTIN: {v.gstin}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {vendorId === v.id && (
                                                                <Check className="w-4 h-4 text-emerald-500" />
                                                            )}
                                                        </button>
                                                    ))}
                                                {vendors.filter((v) =>
                                                    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
                                                ).length === 0 && (
                                                        <div className="px-3 py-4 text-center text-xs text-[var(--muted-foreground)]">
                                                            {t("noVendorsFound")}
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Purchase Order Link */}
                                <div>
                                    <label className={labelClasses}>{t("poSelect")}</label>
                                    <select
                                        value={purchaseOrderId || ""}
                                        onChange={(e) => handleSelectPO(e.target.value)}
                                        className={inputClasses}
                                    >
                                        <option value="">{t("poPlaceholder")}</option>
                                        {eligiblePOs.map((po) => (
                                            <option key={po.id} value={po.id}>
                                                {po.poNumber} — ₹{po.subtotal.toFixed(2)} ({po.status})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* GSTIN Snapshot Override */}
                                <div>
                                    <label className={labelClasses}>GSTIN</label>
                                    <input
                                        type="text"
                                        value={vendorSnapshot.gstin || ""}
                                        onChange={(e) => {
                                            const gstin = e.target.value.toUpperCase();
                                            setVendorSnapshot((prev) => ({
                                                ...prev,
                                                gstin,
                                                state_code: gstin.length >= 2 ? gstin.slice(0, 2) : prev.state_code,
                                            }));
                                            setItcEligible(gstin.length > 0);
                                        }}
                                        placeholder="27AAAAA0000A1Z5"
                                        className={inputClasses}
                                    />
                                </div>

                                {/* Vendor Address */}
                                <div>
                                    <label className={labelClasses}>Address</label>
                                    <input
                                        type="text"
                                        value={vendorSnapshot.address || ""}
                                        onChange={(e) =>
                                            setVendorSnapshot((prev) => ({ ...prev, address: e.target.value }))
                                        }
                                        placeholder="Vendor business address"
                                        className={inputClasses}
                                    />
                                </div>
                            </div>

                            {/* PO Over-billing warning banner */}
                            {poOverBillingWarning && (
                                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-500">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>{poOverBillingWarning}</span>
                                </div>
                            )}
                        </SectionCard>

                        {/* Section 2: Bill & Tax Details */}
                        <SectionCard
                            num={2}
                            title={t("secBillDetails")}
                            headerRight={
                                <div className="flex items-center gap-1.5 bg-[var(--muted)] p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setSupplyType("intra")}
                                        className={cn(
                                            "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors",
                                            supplyType === "intra"
                                                ? "bg-[var(--card)] text-emerald-500 shadow-sm font-semibold"
                                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                        )}
                                    >
                                        CGST + SGST
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSupplyType("inter")}
                                        className={cn(
                                            "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors",
                                            supplyType === "inter"
                                                ? "bg-[var(--card)] text-emerald-500 shadow-sm font-semibold"
                                                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                                        )}
                                    >
                                        IGST
                                    </button>
                                </div>
                            }
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className={labelClasses}>{t("vendorInvoiceNo")} *</label>
                                    <input
                                        type="text"
                                        value={vendorInvoiceNumber}
                                        onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                                        placeholder={t("vendorInvoiceNoPlaceholder")}
                                        className={inputClasses}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>{t("billDate")} *</label>
                                    <input
                                        type="date"
                                        value={billDate}
                                        onChange={(e) => handleBillDateChange(e.target.value)}
                                        className={inputClasses}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className={labelClasses}>{t("dueDate")} *</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        min={billDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className={inputClasses}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)]">
                                    <input
                                        type="checkbox"
                                        checked={itcEligible}
                                        onChange={(e) => setItcEligible(e.target.checked)}
                                        className="rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <span>{t("itcEligible")}</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--foreground)]">
                                    <input
                                        type="checkbox"
                                        checked={reverseCharge}
                                        onChange={(e) => setReverseCharge(e.target.checked)}
                                        className="rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <span>{t("reverseCharge")}</span>
                                </label>
                            </div>
                        </SectionCard>

                        {/* Section 3: Line Items */}
                        <SectionCard
                            num={3}
                            title={t("secLineItems")}
                            headerRight={
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-500 font-semibold hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>{t("addItem")}</span>
                                </button>
                            }
                        >
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                    const gross = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                                    const discount = Math.min(Math.max(0, Number(item.discount) || 0), gross);
                                    const taxable = gross - discount;
                                    const lineTax = (taxable * (Number(item.gst_rate) || 0)) / 100;
                                    const lineTotal = taxable + lineTax;

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/50 space-y-2"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                {/* Description */}
                                                <div className="sm:col-span-5">
                                                    <label className={labelClasses}>{t("colItem")}</label>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                                                        placeholder={t("itemPlaceholder")}
                                                        className={inputClasses}
                                                        required
                                                    />
                                                </div>

                                                {/* HSN */}
                                                <div className="sm:col-span-2">
                                                    <label className={labelClasses}>{t("colHsn")}</label>
                                                    <input
                                                        type="text"
                                                        value={item.hsn_sac}
                                                        onChange={(e) => handleItemChange(idx, "hsn_sac", e.target.value)}
                                                        placeholder="e.g. 7208"
                                                        className={inputClasses}
                                                    />
                                                </div>

                                                {/* Qty */}
                                                <div className="sm:col-span-2">
                                                    <label className={labelClasses}>{t("colQty")}</label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                                                        className={inputClasses}
                                                        required
                                                    />
                                                </div>

                                                {/* Unit */}
                                                <div className="sm:col-span-2">
                                                    <label className={labelClasses}>{t("colUnit")}</label>
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                                                        placeholder="kg / pcs"
                                                        className={inputClasses}
                                                    />
                                                </div>

                                                {/* Delete Item */}
                                                <div className="sm:col-span-1 flex items-end justify-center pb-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Financial row for item */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--border)]/50 items-center">
                                                <div>
                                                    <label className={labelClasses}>{t("colRate")} (₹)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                                        className={inputClasses}
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className={labelClasses}>{t("colDiscount")}</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={item.discount}
                                                        onChange={(e) => handleItemChange(idx, "discount", e.target.value)}
                                                        className={inputClasses}
                                                    />
                                                </div>

                                                <div>
                                                    <label className={labelClasses}>{t("colGstRate")}</label>
                                                    <select
                                                        value={item.gst_rate}
                                                        onChange={(e) =>
                                                            handleItemChange(idx, "gst_rate", Number(e.target.value))
                                                        }
                                                        className={inputClasses}
                                                    >
                                                        {GST_RATES.map((r) => (
                                                            <option key={r} value={r}>
                                                                {r}%
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="text-right">
                                                    <span className={labelClasses}>{t("colTotal")}</span>
                                                    <div className="text-xs font-bold text-[var(--foreground)] pt-2">
                                                        ₹{lineTotal.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Live Tax Summary */}
                            <div className="mt-4 p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] text-xs space-y-1.5">
                                <div className="flex justify-between text-[var(--muted-foreground)]">
                                    <span>{t("subtotal")}</span>
                                    <span>₹{calculations.subtotal.toFixed(2)}</span>
                                </div>
                                {supplyType === "intra" ? (
                                    <>
                                        <div className="flex justify-between text-[var(--muted-foreground)]">
                                            <span>{t("cgst")}</span>
                                            <span>₹{calculations.cgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-[var(--muted-foreground)]">
                                            <span>{t("sgst")}</span>
                                            <span>₹{calculations.sgst.toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between text-[var(--muted-foreground)]">
                                        <span>{t("igst")}</span>
                                        <span>₹{calculations.igst.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-[var(--foreground)] pt-1.5 border-t border-[var(--border)]">
                                    <span>{t("grandTotal")}</span>
                                    <span>₹{calculations.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </SectionCard>

                        {/* Section 4: TDS & Notes */}
                        <SectionCard num={4} title={t("secTdsNotes")}>
                            <div className="space-y-3">
                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]/50">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--foreground)] mb-2">
                                        <input
                                            type="checkbox"
                                            checked={enableTds}
                                            onChange={(e) => setEnableTds(e.target.checked)}
                                            className="rounded border-[var(--border)] text-emerald-500 focus:ring-emerald-500/20"
                                        />
                                        <span>Apply Tax Deducted at Source (TDS)</span>
                                    </label>

                                    {enableTds && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]/50 items-center">
                                            <div>
                                                <label className={labelClasses}>{t("tdsSection")}</label>
                                                <input
                                                    type="text"
                                                    value={tdsSection}
                                                    onChange={(e) => setTdsSection(e.target.value)}
                                                    placeholder={t("tdsSectionPlaceholder")}
                                                    className={inputClasses}
                                                />
                                            </div>

                                            <div>
                                                <label className={labelClasses}>{t("tdsRate")}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={tdsRate}
                                                    onChange={(e) => setTdsRate(Number(e.target.value))}
                                                    className={inputClasses}
                                                />
                                            </div>

                                            <div className="text-right sm:text-left">
                                                <span className={labelClasses}>{t("tdsAmount")}</span>
                                                <div className="text-xs font-semibold text-rose-500 pt-2">
                                                    − ₹{calculations.tdsAmount.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {enableTds && (
                                        <div className="mt-2 pt-2 border-t border-[var(--border)]/50 flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            <span>{t("payableAmount")}</span>
                                            <span>₹{calculations.payableAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={labelClasses}>{t("notesLabel")}</label>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t("notesPlaceholder")}
                                        className={cn(inputClasses, "h-auto py-2")}
                                    />
                                </div>
                            </div>
                        </SectionCard>
                    </form>

                    {/* Footer */}
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
                        <div className="text-xs">
                            <span className="text-[var(--muted-foreground)]">Net Payable: </span>
                            <span className="font-bold text-[var(--foreground)] text-sm">
                                ₹{calculations.payableAmount.toFixed(2)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
                            >
                                {t("cancel")}
                            </button>

                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, "Draft")}
                                disabled={isSaving}
                                className="px-4 py-2 text-xs font-medium rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? t("saving") : t("btnSaveBill")}
                            </button>

                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, "Open")}
                                disabled={isSaving}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? t("saving") : t("btnOpenBill")}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
