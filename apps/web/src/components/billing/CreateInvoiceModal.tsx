"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  X,
  Plus,
  Trash2,
  ChevronDown,
  PackageOpen,
  Truck,
  StickyNote,
  Receipt,
  CreditCard,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────
interface BillItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
}

interface CompanyInfo {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  gstin?: string;
  pan?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  state?: string;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: any[];
  orders: any[];
  companyInfo: CompanyInfo | null;
  inventoryItems?: any[];
}

// ─── Constants ─────────────────────────────────────────────
const PAYMENT_TERMS = [
  { label: "Due on Receipt", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "15 Days", days: 15 },
  { label: "30 Days", days: 30 },
  { label: "45 Days", days: 45 },
  { label: "Custom", days: -1 },
];

const GST_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
];

// ─── Number to Words (Indian) ──────────────────────────────
const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n: number): string {
  n = Math.round(n);
  if (n === 0) return "Zero";
  let s = "";
  if (n >= 10000000) { s += numToWords(Math.floor(n / 10000000)) + " Crore "; n %= 10000000; }
  if (n >= 100000) { s += numToWords(Math.floor(n / 100000)) + " Lakh "; n %= 100000; }
  if (n >= 1000) { s += numToWords(Math.floor(n / 1000)) + " Thousand "; n %= 1000; }
  if (n >= 100) { s += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
  if (n >= 20) { s += tens[Math.floor(n / 10)] + " "; n %= 10; }
  if (n > 0) s += ones[n] + " ";
  return s.trim();
}

// ─── Currency Formatter ────────────────────────────────────
const fmtCurrency = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// ─── Input Classes ─────────────────────────────────────────
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

// ─── Section Card ──────────────────────────────────────────
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

// ─── Status Badge ──────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-500/12 border-slate-500/25 text-slate-400",
    PAID: "bg-green-500/12 border-green-500/30 text-green-400",
    PARTIAL: "bg-blue-500/12 border-blue-500/30 text-blue-400",
    OVERDUE: "bg-red-500/12 border-red-500/30 text-red-400",
  };
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-[3px] rounded-md border",
        styles[status] || styles.DRAFT
      )}
    >
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function CreateInvoiceModal({
  open,
  onClose,
  onSuccess,
  clients,
  orders,
  companyInfo,
  inventoryItems = [],
}: CreateInvoiceModalProps) {
  // ─── Invoice Number ────────────────────────────────────
  const [invoiceNumber] = useState(
    () => "INV-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 9000) + 1000)
  );

  // ─── Form State (PRESERVES original formData fields) ───
  const [formData, setFormData] = useState({
    client_id: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    terms:
      "1. Payment is due within 30 days.\n2. Please include bill number in payment reference.\n3. For queries, contact our billing department.",
    items: [] as BillItem[],
    isIGST: false,
  });

  // ─── Extended State ────────────────────────────────────
  const [paymentTerm, setPaymentTerm] = useState("30 Days");
  const [discountMode, setDiscountMode] = useState<"pct" | "flat">("pct");
  const [discountValue, setDiscountValue] = useState(0);
  const [transportCharge, setTransportCharge] = useState(0);
  const [packingCharge, setPackingCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [advanceReceived, setAdvanceReceived] = useState(0);
  const [ewayOpen, setEwayOpen] = useState(false);
  const [ewayData, setEwayData] = useState({
    transportMode: "Road",
    vehicleNumber: "",
    dispatchLocation: "",
    deliveryLocation: "",
  });
  const [summaryAccordionOpen, setSummaryAccordionOpen] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);

  // ─── Selected Client ───────────────────────────────────
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === formData.client_id),
    [clients, formData.client_id]
  );

  // ─── Auto GST Type Detection ──────────────────────────
  useEffect(() => {
    if (!selectedClient || !companyInfo) return;
    const clientState = (selectedClient.state || selectedClient.address || "").toLowerCase();
    const companyState = (companyInfo.state || companyInfo.address || "").toLowerCase();
    if (clientState && companyState) {
      const sameState = clientState.includes(companyState) || companyState.includes(clientState);
      setFormData((prev) => ({ ...prev, isIGST: !sameState }));
    }
  }, [selectedClient, companyInfo]);

  // ─── Payment Terms → Due Date ──────────────────────────
  const handlePaymentTermChange = useCallback(
    (term: string) => {
      setPaymentTerm(term);
      const found = PAYMENT_TERMS.find((t) => t.label === term);
      if (found && found.days >= 0) {
        const base = new Date(formData.billDate || Date.now());
        base.setDate(base.getDate() + found.days);
        setFormData((prev) => ({ ...prev, dueDate: base.toISOString().split("T")[0] }));
      }
    },
    [formData.billDate]
  );

  // ─── Close dropdown on outside click ──────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    if (clientDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [clientDropdownOpen]);

  // ─── Line Item CRUD ────────────────────────────────────
  const addItem = () => {
    const newItem: BillItem = {
      id: Date.now().toString(),
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "pcs",
      rate: 0,
      amount: 0,
      gstRate: 18,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          updated.amount = updated.quantity * updated.rate;
          return updated;
        }
        return item;
      }),
    }));
  };

  const removeItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  // ─── Import From Order (PRESERVED) ─────────────────────
  const importFromOrder = (orderId: string) => {
    const order = orders.find((o) => (o.id || o._id) === orderId);
    if (!order) return;

    const description = order.productName ?? order.product_name ?? "Imported Order";
    const quantity = order.quantity || 1;
    const rate = order.rate || 0;
    const amount = order.totalAmount ?? order.total_amount ?? quantity * rate;

    const newItem: BillItem = {
      id: Date.now().toString(),
      description,
      hsnCode: "",
      quantity,
      unit: "pcs",
      rate,
      amount,
      gstRate: 18,
    };

    const clientId = order.clientId ?? order.client_id ?? formData.client_id;
    setFormData((prev) => ({
      ...prev,
      client_id: clientId,
      items: [...prev.items, newItem],
    }));
    setImportDropdownOpen(false);
    toast.success("Order imported to bill");
  };

  // ─── Calculations (PRESERVED + Extended) ───────────────
  const calculations = useMemo(() => {
    const subtotal = formData.items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
    const totalTax = formData.items.reduce(
      (acc, item) => acc + item.quantity * item.rate * (item.gstRate / 100),
      0
    );

    let cgstAmount = 0,
      sgstAmount = 0,
      igstAmount = 0;
    if (formData.isIGST) {
      igstAmount = totalTax;
    } else {
      cgstAmount = totalTax / 2;
      sgstAmount = totalTax / 2;
    }

    const discountAmount =
      discountMode === "pct" ? subtotal * (discountValue / 100) : discountValue;
    const grandTotal =
      subtotal - discountAmount + totalTax + transportCharge + packingCharge + otherCharges;
    const balance = grandTotal - advanceReceived;

    return {
      subtotal,
      totalTax,
      cgstAmount,
      sgstAmount,
      igstAmount,
      discountAmount,
      grandTotal,
      balance,
      totalAmount: subtotal + totalTax, // Original field preserved
    };
  }, [
    formData.items,
    formData.isIGST,
    discountMode,
    discountValue,
    transportCharge,
    packingCharge,
    otherCharges,
    advanceReceived,
  ]);

  // ─── Number to Words Helper (PRESERVED) ────────────────
  const numberToWords = (num: number): string => {
    const convertLessThanThousand = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
      );
    };

    if (num === 0) return "Zero";

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = Math.floor(num % 1000);

    let words = "";
    if (crore) words += convertLessThanThousand(crore) + " Crore ";
    if (lakh) words += convertLessThanThousand(lakh) + " Lakh ";
    if (thousand) words += convertLessThanThousand(thousand) + " Thousand ";
    if (remainder) words += convertLessThanThousand(remainder);

    return words.trim() + " Rupees Only";
  };

  // ─── Submit Handler (PRESERVED) ────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      return toast.error("Please select a client");
    }
    if (formData.items.length === 0) {
      return toast.error("Please add at least one item");
    }

    setSubmitting(true);

    const client = clients.find((c) => c.id === formData.client_id);

    const billData = {
      billNumber: "INV/AUTO",
      billDate: formData.billDate,
      dueDate: formData.dueDate,
      clientId: formData.client_id,
      client_id: formData.client_id,
      clientName: client?.name || "",
      clientAddress: client?.address || "",
      clientGSTIN: client?.gstin || "",
      clientPhone: client?.phone || "",
      clientEmail: client?.email || "",
      items: formData.items,
      subtotal: calculations.subtotal,
      cgstAmount: calculations.cgstAmount,
      sgstAmount: calculations.sgstAmount,
      igstAmount: calculations.igstAmount,
      totalAmount: calculations.totalAmount,
      amountInWords: numberToWords(Math.round(calculations.totalAmount)),
      notes: formData.notes,
      terms: formData.terms,
      status: "draft" as const,
    };

    try {
      const res = await fetch("/api/v1/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData),
      });
      const json = await res.json();

      if (json.error) {
        toast.error(json.error.message || "Failed to create bill");
      } else {
        const serverBillNumber = json.data?.billNumber || billData.billNumber;
        toast.success(`Bill ${serverBillNumber} created successfully`);
        onClose();
        onSuccess();
      }
    } catch {
      toast.error("Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Client orders for import ──────────────────────────
  const clientOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.client_id || o.clientId || (o.client && o.client._id)) === formData.client_id
      ),
    [orders, formData.client_id]
  );

  // ─── Stock lookup ──────────────────────────────────────
  const getStockInfo = useCallback(
    (itemName: string, qty: number) => {
      if (!inventoryItems.length || !itemName) return null;
      const inv = inventoryItems.find(
        (p) => p.name?.toLowerCase() === itemName.toLowerCase()
      );
      if (!inv) return null;
      const stock = inv.stock ?? inv.quantity ?? 0;
      const reorder = inv.reorderLevel ?? inv.reorder_level ?? 10;
      const unit = inv.unit || "KG";
      if (qty > stock) return { type: "danger" as const, text: `Warning: Exceeds available stock`, stock, unit };
      if (stock <= reorder) return { type: "warning" as const, text: `Stock: ${stock} ${unit} · Low`, stock, unit };
      return { type: "ok" as const, text: `Stock: ${stock} ${unit}`, stock, unit };
    },
    [inventoryItems]
  );

  // ─── Summary Panel Content (shared between desktop & mobile) ─
  const SummaryContent = () => (
    <div className="space-y-3">
      {/* Summary Rows */}
      <div className="space-y-[6px]">
        <div className="flex justify-between text-[11px]">
          <span className="text-[#64748B] dark:text-[#94A3B8]">Subtotal</span>
          <span className="text-[#0F172A] dark:text-[#F1F5F9] font-semibold">
            {fmtCurrency(calculations.subtotal)}
          </span>
        </div>
        {calculations.discountAmount > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Discount</span>
            <span className="text-red-400">— {fmtCurrency(calculations.discountAmount)}</span>
          </div>
        )}
        {!formData.isIGST ? (
          <>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#64748B] dark:text-[#94A3B8]">CGST</span>
              <span className="text-[#0F172A] dark:text-[#F1F5F9]">
                {fmtCurrency(calculations.cgstAmount)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#64748B] dark:text-[#94A3B8]">SGST</span>
              <span className="text-[#0F172A] dark:text-[#F1F5F9]">
                {fmtCurrency(calculations.sgstAmount)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">IGST</span>
            <span className="text-[#0F172A] dark:text-[#F1F5F9]">
              {fmtCurrency(calculations.igstAmount)}
            </span>
          </div>
        )}
        {transportCharge > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Transport</span>
            <span className="text-[#0F172A] dark:text-[#F1F5F9]">{fmtCurrency(transportCharge)}</span>
          </div>
        )}
        {packingCharge > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Packing</span>
            <span className="text-[#0F172A] dark:text-[#F1F5F9]">{fmtCurrency(packingCharge)}</span>
          </div>
        )}
        {otherCharges > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B] dark:text-[#94A3B8]">Other Charges</span>
            <span className="text-[#0F172A] dark:text-[#F1F5F9]">{fmtCurrency(otherCharges)}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]" />

      {/* Grand Total Card */}
      <div className="bg-green-500/[0.07] border border-green-500/20 rounded-[10px] p-3">
        <span className="text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block">
          Grand Total
        </span>
        <span className="text-[20px] font-bold text-green-400 tabular-nums">
          {fmtCurrency(calculations.grandTotal)}
        </span>
      </div>

      {/* Amount in Words */}
      <div className="bg-white/30 dark:bg-black/40 border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-[8px] p-[10px]">
        <span className="text-[9px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block mb-1">
          Amount in Words
        </span>
        <span className="text-[10px] text-[#0F172A] dark:text-[#F1F5F9] italic leading-relaxed">
          {numToWords(calculations.grandTotal)} Rupees Only
        </span>
      </div>

      {/* Payment Tracking */}
      <div className="bg-blue-500/[0.06] border border-blue-500/[0.18] rounded-[8px] p-[10px]">
        <span className="text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block mb-2">
          Payment Tracking
        </span>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-[#64748B] dark:text-[#94A3B8]">Due Date</span>
          <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
            {formData.dueDate
              ? new Date(formData.dueDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#64748B] dark:text-[#94A3B8]">Status</span>
          <span className="text-amber-400 font-medium">Pending</span>
        </div>
      </div>

      {/* Advance Received */}
      <div className="space-y-[6px]">
        <label className={labelClasses}>Advance Received</label>
        <input
          type="number"
          value={advanceReceived || ""}
          onChange={(e) => setAdvanceReceived(Number(e.target.value) || 0)}
          placeholder="₹ 0"
          className={inputClasses}
        />
        {advanceReceived > 0 && (
          <div className="text-[11px] font-bold text-amber-400">
            Balance: {fmtCurrency(calculations.balance)}
          </div>
        )}
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "relative z-10 flex flex-col",
              "w-[calc(100vw-16px)] md:w-[95vw] max-w-[1280px] 2xl:max-w-[1400px]",
              "min-h-screen md:min-h-0 md:max-h-[92vh]",
              "bg-[#F3F5F9] dark:bg-[#0F1117]",
              "md:rounded-2xl overflow-hidden",
              "border-0 md:border md:border-[rgba(15,23,42,0.06)] md:dark:border-[rgba(148,163,184,0.10)]",
              "shadow-2xl"
            )}
          >
            {/* ═══ HEADER ═══ */}
            <div className="shrink-0 flex items-center justify-between px-4 md:px-5 py-3 border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] bg-[#EEF2F7] dark:bg-[#161B27]">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-[10px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <FileText size={18} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
                    Create Invoice
                  </h2>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    GST compliant · Track payments automatically
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#64748B] dark:text-[#94A3B8] hidden sm:inline">
                  {invoiceNumber}
                </span>
                <StatusBadge status="DRAFT" />
                <button
                  type="button"
                  onClick={onClose}
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[#64748B] dark:text-[#94A3B8] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ═══ BODY ═══ */}
            <form id="create-invoice-form" onSubmit={handleSubmit} className="flex-1 flex flex-col md:flex-row min-h-0">
              {/* ── LEFT COLUMN (Scrollable Form) ── */}
              <div
                ref={formScrollRef}
                className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-0"
              >
                {/* ═══ SECTION 1 — Billing Information ═══ */}
                <SectionCard num={1} title="Billing Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Client Select — full width */}
                    <div className="sm:col-span-2 relative" ref={clientDropdownRef}>
                      <label className={labelClasses}>
                        Client <span className="text-red-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setClientDropdownOpen(!clientDropdownOpen);
                          setClientSearch("");
                        }}
                        className={cn(
                          inputClasses,
                          "text-left flex items-center justify-between cursor-pointer",
                          clientDropdownOpen && "border-blue-500/50 bg-blue-500/[0.04]"
                        )}
                      >
                        <span className={formData.client_id ? "text-[#0F172A] dark:text-[#F1F5F9]" : "text-[#94A3B8]/50"}>
                          {selectedClient?.name || "Select client..."}
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            "text-[#94A3B8] transition-transform duration-200",
                            clientDropdownOpen && "rotate-180"
                          )}
                        />
                      </button>
                      {clientDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-[8px] bg-white dark:bg-[#161B27] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.08)]">
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className={cn(inputClasses, "h-[32px] text-[11px]")}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[180px] overflow-y-auto">
                            {clients
                              .filter((c) =>
                                c.name?.toLowerCase().includes(clientSearch.toLowerCase())
                              )
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, client_id: c.id }));
                                    setClientDropdownOpen(false);
                                    setClientSearch("");
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-[12px] transition-colors duration-100",
                                    formData.client_id === c.id
                                      ? "bg-blue-500/10 text-blue-400 font-medium"
                                      : "text-[#0F172A] dark:text-[#F1F5F9] hover:bg-blue-500/5"
                                  )}
                                >
                                  <div className="font-medium">{c.name}</div>
                                  {c.phone && (
                                    <div className="text-[10px] text-[#94A3B8]">{c.phone}</div>
                                  )}
                                </button>
                              ))}
                            {clients.filter((c) =>
                              c.name?.toLowerCase().includes(clientSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-3 text-[11px] text-[#94A3B8] text-center">
                                No clients found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Auto-filled fields */}
                    {selectedClient && (
                      <>
                        <div>
                          <label className={labelClasses}>GST Number</label>
                          <input
                            type="text"
                            value={selectedClient.gstin || "N/A"}
                            readOnly
                            className={cn(inputClasses, "opacity-70 cursor-default")}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>State</label>
                          <input
                            type="text"
                            value={selectedClient.state || selectedClient.address || "—"}
                            readOnly
                            className={cn(inputClasses, "opacity-70 cursor-default")}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Contact Person</label>
                          <input
                            type="text"
                            value={selectedClient.contactPerson || selectedClient.name || "—"}
                            readOnly
                            className={cn(inputClasses, "opacity-70 cursor-default")}
                          />
                        </div>
                        <div>
                          <label className={labelClasses}>Phone</label>
                          <input
                            type="text"
                            value={selectedClient.phone || "—"}
                            readOnly
                            className={cn(inputClasses, "opacity-70 cursor-default")}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Auto GST Detection Chip */}
                  {selectedClient && (
                    <div className="mt-2">
                      {!formData.isIGST ? (
                        <div className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-[4px] rounded-md bg-blue-500/[0.06] border border-blue-500/[0.18] text-blue-400">
                          <Info size={11} />
                          Auto-detected: CGST + SGST (same state as company)
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-[4px] rounded-md bg-amber-500/[0.06] border border-amber-500/[0.18] text-amber-400">
                          <Info size={11} />
                          Auto-detected: IGST (inter-state transaction)
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* ═══ SECTION 2 — Invoice Details ═══ */}
                <SectionCard num={2} title="Invoice Details">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={labelClasses}>
                        Invoice Date <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.billDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, billDate: e.target.value }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Due Date</label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                        }
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>GST Type</label>
                      <select
                        value={formData.isIGST ? "igst" : "cgst_sgst"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            isIGST: e.target.value === "igst",
                          }))
                        }
                        className={cn(inputClasses, "cursor-pointer")}
                      >
                        <option value="cgst_sgst">CGST + SGST</option>
                        <option value="igst">IGST</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Terms Pills */}
                  <div className="flex flex-wrap gap-[6px] mt-3">
                    {PAYMENT_TERMS.map((term) => (
                      <button
                        key={term.label}
                        type="button"
                        onClick={() => handlePaymentTermChange(term.label)}
                        className={cn(
                          "text-[10px] font-medium px-2.5 py-[5px] rounded-md border transition-all duration-150 cursor-pointer",
                          paymentTerm === term.label
                            ? "bg-blue-500/18 border-blue-500/45 text-blue-400"
                            : "bg-white/30 dark:bg-black/50 border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.1)] text-[#64748B] dark:text-[#94A3B8] hover:border-blue-500/30"
                        )}
                      >
                        {term.label}
                      </button>
                    ))}
                  </div>
                </SectionCard>

                {/* ═══ SECTION 3 — Line Items ═══ */}
                <SectionCard
                  num={3}
                  title="Line Items"
                  headerRight={
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.client_id) {
                          toast.error("Please select a client first");
                          return;
                        }
                        setImportDropdownOpen(!importDropdownOpen);
                      }}
                      className="flex items-center gap-1.5 bg-blue-500/[0.08] border border-blue-500/25 text-blue-400 text-[11px] font-medium rounded-[7px] px-3 py-[5px] hover:bg-blue-500/[0.14] transition-colors cursor-pointer"
                    >
                      <PackageOpen size={13} />
                      Import from Order
                    </button>
                  }
                >
                  {/* Import Dropdown */}
                  {importDropdownOpen && formData.client_id && (
                    <div className="mb-3 bg-white/50 dark:bg-[rgba(15,17,25,0.7)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-lg p-2 max-h-[160px] overflow-y-auto">
                      {clientOrders.length === 0 ? (
                        <p className="text-[11px] text-[#94A3B8] text-center py-3">
                          No orders found for this client
                        </p>
                      ) : (
                        clientOrders.slice(0, 8).map((order) => {
                          const oId = order.id || order._id;
                          const oDesc = order.productName ?? order.product_name ?? "Order Item";
                          const oTotal = order.totalAmount ?? order.total_amount ?? 0;
                          return (
                            <button
                              key={oId}
                              type="button"
                              onClick={() => importFromOrder(oId)}
                              className="w-full text-left px-3 py-2 rounded-md text-[11px] hover:bg-blue-500/5 transition-colors flex items-center justify-between cursor-pointer"
                            >
                              <span className="text-[#0F172A] dark:text-[#F1F5F9] truncate mr-2">
                                {oDesc}
                              </span>
                              <span className="text-[#94A3B8] whitespace-nowrap text-[10px]">
                                {fmtCurrency(oTotal)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Items Table */}
                  {formData.items.length === 0 ? (
                    <div className="py-8 text-center bg-white/20 dark:bg-white/[0.02] rounded-lg border-2 border-dashed border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.08)]">
                      <PackageOpen
                        className="h-8 w-8 mx-auto mb-2 text-[#94A3B8]"
                      />
                      <p className="text-[11px] text-[#94A3B8]">
                        No items added yet. Click &quot;Add Item&quot; or import from orders.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table Header */}
                      <div className="hidden md:grid grid-cols-[1fr_70px_60px_90px_60px_90px_28px] gap-[6px] mb-1">
                        {["Product", "Qty", "Unit", "Rate (₹)", "Tax %", "Total", ""].map(
                          (h) => (
                            <span
                              key={h}
                              className="text-[10px] text-[#94A3B8] uppercase tracking-[0.06em] py-[5px] px-[6px] border-b border-[rgba(148,163,184,0.08)]"
                            >
                              {h}
                            </span>
                          )
                        )}
                      </div>

                      {/* Items */}
                      {formData.items.map((item) => {
                        const stockInfo = getStockInfo(item.description, item.quantity);
                        const lineTotal = item.quantity * item.rate * (1 + item.gstRate / 100);
                        return (
                          <div key={item.id}>
                            {/* Desktop Row */}
                            <div className="hidden md:grid grid-cols-[1fr_70px_60px_90px_60px_90px_28px] gap-[6px] items-center py-[3px] border-b border-[rgba(148,163,184,0.05)]">
                              <div>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    updateItem(item.id, "description", e.target.value)
                                  }
                                  placeholder="Product name"
                                  className="w-full bg-white/40 dark:bg-[rgba(15,17,25,0.5)] border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.08)] rounded-[5px] px-[6px] py-[4px] text-[11px] text-[#0F172A] dark:text-[#F1F5F9] focus:border-blue-500/40 outline-none placeholder:text-[#94A3B8]/40"
                                />
                                {stockInfo && (
                                  <span
                                    className={cn(
                                      "text-[9px] inline-block mt-[2px] px-1.5 py-[1px] rounded",
                                      stockInfo.type === "ok" &&
                                        "text-green-400 bg-green-500/8 border border-green-500/20",
                                      stockInfo.type === "warning" &&
                                        "text-amber-400 bg-amber-500/8 border border-amber-500/20",
                                      stockInfo.type === "danger" && "text-red-400"
                                    )}
                                  >
                                    {stockInfo.text}
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                value={item.quantity || ""}
                                onChange={(e) =>
                                  updateItem(item.id, "quantity", Number(e.target.value) || 0)
                                }
                                className="w-full bg-white/40 dark:bg-[rgba(15,17,25,0.5)] border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.08)] rounded-[5px] px-[6px] py-[4px] text-[11px] text-[#0F172A] dark:text-[#F1F5F9] focus:border-blue-500/40 outline-none text-center"
                                min={0}
                              />
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                className="w-full bg-white/40 dark:bg-[rgba(15,17,25,0.5)] border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.08)] rounded-[5px] px-[6px] py-[4px] text-[11px] text-[#0F172A] dark:text-[#F1F5F9] focus:border-blue-500/40 outline-none text-center"
                              />
                              <input
                                type="number"
                                value={item.rate || ""}
                                onChange={(e) =>
                                  updateItem(item.id, "rate", Number(e.target.value) || 0)
                                }
                                className="w-full bg-white/40 dark:bg-[rgba(15,17,25,0.5)] border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.08)] rounded-[5px] px-[6px] py-[4px] text-[11px] text-[#0F172A] dark:text-[#F1F5F9] focus:border-blue-500/40 outline-none text-right"
                                min={0}
                              />
                              <select
                                value={item.gstRate}
                                onChange={(e) =>
                                  updateItem(item.id, "gstRate", parseInt(e.target.value))
                                }
                                className="w-full bg-white/40 dark:bg-[rgba(15,17,25,0.5)] border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.08)] rounded-[5px] px-[3px] py-[4px] text-[11px] text-[#0F172A] dark:text-[#F1F5F9] focus:border-blue-500/40 outline-none cursor-pointer"
                              >
                                {GST_RATES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[11px] text-green-400 font-semibold text-right pr-1 tabular-nums">
                                {fmtCurrency(lineTotal)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-[24px] h-[24px] flex items-center justify-center rounded text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {/* Mobile Card */}
                            <div className="md:hidden bg-white/30 dark:bg-white/[0.03] rounded-lg p-3 mb-2 border border-[rgba(15,23,42,0.04)] dark:border-[rgba(148,163,184,0.06)]">
                              <div className="flex items-start justify-between mb-2">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) =>
                                    updateItem(item.id, "description", e.target.value)
                                  }
                                  placeholder="Product name"
                                  className="flex-1 bg-transparent border-none text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9] outline-none p-0 placeholder:text-[#94A3B8]/40"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="ml-2 text-[#94A3B8] hover:text-red-400 cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              {stockInfo && (
                                <span
                                  className={cn(
                                    "text-[9px] inline-block mb-2 px-1.5 py-[1px] rounded",
                                    stockInfo.type === "ok" &&
                                      "text-green-400 bg-green-500/8 border border-green-500/20",
                                    stockInfo.type === "warning" &&
                                      "text-amber-400 bg-amber-500/8 border border-amber-500/20",
                                    stockInfo.type === "danger" && "text-red-400"
                                  )}
                                >
                                  {stockInfo.text}
                                </span>
                              )}
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="text-[9px] text-[#94A3B8] block">Qty</label>
                                  <input
                                    type="number"
                                    value={item.quantity || ""}
                                    onChange={(e) =>
                                      updateItem(item.id, "quantity", Number(e.target.value) || 0)
                                    }
                                    className={cn(inputClasses, "h-[30px] text-[11px] text-center")}
                                    min={0}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#94A3B8] block">Unit</label>
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                    className={cn(inputClasses, "h-[30px] text-[11px] text-center")}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#94A3B8] block">Rate</label>
                                  <input
                                    type="number"
                                    value={item.rate || ""}
                                    onChange={(e) =>
                                      updateItem(item.id, "rate", Number(e.target.value) || 0)
                                    }
                                    className={cn(inputClasses, "h-[30px] text-[11px] text-right")}
                                    min={0}
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-[#94A3B8] block">GST%</label>
                                  <select
                                    value={item.gstRate}
                                    onChange={(e) =>
                                      updateItem(item.id, "gstRate", parseInt(e.target.value))
                                    }
                                    className={cn(inputClasses, "h-[30px] text-[11px] cursor-pointer")}
                                  >
                                    {GST_RATES.map((r) => (
                                      <option key={r.value} value={r.value}>
                                        {r.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex justify-end mt-2">
                                <span className="text-[12px] text-green-400 font-semibold tabular-nums">
                                  {fmtCurrency(lineTotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Add Item Button */}
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-[5px] text-[11px] text-blue-400 bg-transparent border-none cursor-pointer py-[6px] mt-1 hover:text-blue-300 transition-colors"
                  >
                    <Plus size={12} />
                    Add Item
                  </button>
                </SectionCard>

                {/* ═══ SECTION 4 — Tax, Discount & Charges ═══ */}
                <SectionCard num={4} title="Tax, Discount & Charges">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Discount */}
                    <div>
                      <label className={labelClasses}>Discount</label>
                      <div className="flex gap-1.5 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setDiscountMode("pct")}
                          className={cn(
                            "text-[10px] font-medium px-2 py-[3px] rounded-md border transition-all cursor-pointer",
                            discountMode === "pct"
                              ? "bg-blue-500/18 border-blue-500/45 text-blue-400"
                              : "bg-white/30 dark:bg-black/50 border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.1)] text-[#94A3B8]"
                          )}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode("flat")}
                          className={cn(
                            "text-[10px] font-medium px-2 py-[3px] rounded-md border transition-all cursor-pointer",
                            discountMode === "flat"
                              ? "bg-blue-500/18 border-blue-500/45 text-blue-400"
                              : "bg-white/30 dark:bg-black/50 border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.1)] text-[#94A3B8]"
                          )}
                        >
                          ₹ Flat
                        </button>
                      </div>
                      <input
                        type="number"
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                        placeholder={discountMode === "pct" ? "0 %" : "₹ 0"}
                        className={inputClasses}
                        min={0}
                      />
                    </div>

                    {/* Transport */}
                    <div>
                      <label className={labelClasses}>Transport / Loading</label>
                      <input
                        type="number"
                        value={transportCharge || ""}
                        onChange={(e) => setTransportCharge(Number(e.target.value) || 0)}
                        placeholder="₹ 0"
                        className={inputClasses}
                        min={0}
                      />
                    </div>

                    {/* Packing */}
                    <div>
                      <label className={labelClasses}>Packing Charges</label>
                      <input
                        type="number"
                        value={packingCharge || ""}
                        onChange={(e) => setPackingCharge(Number(e.target.value) || 0)}
                        placeholder="₹ 0"
                        className={inputClasses}
                        min={0}
                      />
                    </div>

                    {/* Other */}
                    <div>
                      <label className={labelClasses}>Other Charges</label>
                      <input
                        type="number"
                        value={otherCharges || ""}
                        onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                        placeholder="₹ 0"
                        className={inputClasses}
                        min={0}
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* ═══ SECTION 5 — E-Way Bill (Collapsible) ═══ */}
                <SectionCard num={5} title="E-Way Bill Details" className="!mb-3">
                  <button
                    type="button"
                    onClick={() => setEwayOpen(!ewayOpen)}
                    className="flex items-center gap-1.5 text-[11px] text-[#94A3B8] hover:text-blue-400 transition-colors cursor-pointer -mt-1 mb-1"
                  >
                    <span>{ewayOpen ? "Hide" : "Show"} E-Way Bill Fields</span>
                    <ChevronDown
                      size={13}
                      className={cn(
                        "transition-transform duration-200",
                        ewayOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {ewayOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className={labelClasses}>Transport Mode</label>
                            <select
                              value={ewayData.transportMode}
                              onChange={(e) =>
                                setEwayData((prev) => ({ ...prev, transportMode: e.target.value }))
                              }
                              className={cn(inputClasses, "cursor-pointer")}
                            >
                              <option>Road</option>
                              <option>Rail</option>
                              <option>Air</option>
                              <option>Ship</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelClasses}>Vehicle Number</label>
                            <input
                              type="text"
                              value={ewayData.vehicleNumber}
                              onChange={(e) =>
                                setEwayData((prev) => ({
                                  ...prev,
                                  vehicleNumber: e.target.value,
                                }))
                              }
                              placeholder="XX-00-XX-0000"
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>Dispatch Location</label>
                            <input
                              type="text"
                              value={ewayData.dispatchLocation}
                              onChange={(e) =>
                                setEwayData((prev) => ({
                                  ...prev,
                                  dispatchLocation: e.target.value,
                                }))
                              }
                              placeholder="City, State"
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>Delivery Location</label>
                            <input
                              type="text"
                              value={ewayData.deliveryLocation}
                              onChange={(e) =>
                                setEwayData((prev) => ({
                                  ...prev,
                                  deliveryLocation: e.target.value,
                                }))
                              }
                              placeholder="City, State"
                              className={inputClasses}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SectionCard>

                {/* ═══ SECTION 6 — Notes ═══ */}
                <SectionCard num={6} title="Notes">
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={2}
                    placeholder="Payment instructions, bank details, terms & conditions..."
                    className={cn(
                      inputClasses,
                      "h-auto resize-none py-2 leading-relaxed"
                    )}
                  />
                </SectionCard>

                {/* ═══ MOBILE SUMMARY ACCORDION ═══ */}
                <div className="block md:hidden mb-4">
                  <div
                    className="bg-white/40 dark:bg-black/40 border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setSummaryAccordionOpen(!summaryAccordionOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
                    >
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider">
                        Invoice Summary
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-green-400">
                          {fmtCurrency(calculations.grandTotal)}
                        </span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            "text-[#94A3B8] transition-transform duration-200",
                            summaryAccordionOpen && "rotate-180"
                          )}
                        />
                      </div>
                    </button>
                    <AnimatePresence>
                      {summaryAccordionOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.08)] pt-3">
                            <SummaryContent />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mobile Save Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "mt-3 h-[48px] w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-[10px] text-[14px] transition-colors cursor-pointer flex items-center justify-center gap-2",
                      submitting && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Receipt size={16} />
                    )}
                    <span>Generate Invoice</span>
                  </button>
                </div>
              </div>

              {/* ── RIGHT COLUMN (Sticky Summary — Desktop Only) ── */}
              <div className="hidden md:block w-[280px] xl:w-[300px] border-l border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] bg-[#EEF2F7] dark:bg-[#161B27]">
                <div className="sticky top-0 self-start p-4 overflow-y-auto max-h-[calc(92vh-130px)]">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-3">
                    Invoice Summary
                  </h3>
                  <SummaryContent />
                </div>
              </div>
            </form>

            {/* ═══ DESKTOP FOOTER ═══ */}
            <div className="hidden md:flex sticky bottom-0 z-20 items-center justify-between px-5 py-3 bg-[#EEF2F7] dark:bg-[#161B27] border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]">
              <button
                type="button"
                onClick={onClose}
                className="h-[38px] px-5 rounded-[8px] text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] bg-white/40 dark:bg-white/[0.04] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] hover:bg-white/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-invoice-form"
                disabled={submitting}
                className={cn(
                  "h-[38px] px-6 rounded-[8px] text-[13px] font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] transition-colors cursor-pointer flex items-center gap-2",
                  submitting && "opacity-60 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Receipt size={14} />
                )}
                <span>Generate Invoice</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
