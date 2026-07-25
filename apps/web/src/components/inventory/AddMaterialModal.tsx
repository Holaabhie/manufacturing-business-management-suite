"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  X,
  Info,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────

interface FormData {
  name: string;
  quantity: string;
  unit: string;
  min_stock_level: string;
  supplier_whatsapp: string;
  purchase_cost_per_unit: string;
  hsn_code: string;
  tax_rate: string;
  track_inventory: boolean;
  track_batches: boolean;
  item_type: string;
}

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
}

// ─── Unit Quick-Select Pills ────────────────────────────────────

const UNIT_PILLS = ["KG", "PCS", "BOX", "BAG", "ROLL", "TON"] as const;

// ─── Category Options ───────────────────────────────────────────

const CATEGORIES = [
  "Raw Material",
  "Packaging",
  "Chemical",
  "Consumable",
  "Finished Goods",
] as const;

// ─── Helpers ────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ─── Section Card ───────────────────────────────────────────────

function SectionCard({
  number,
  title,
  badge,
  children,
}: {
  number: number;
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/40 dark:bg-black/40 border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-4 hover:-translate-y-[1px] transition-transform duration-200">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-[18px] h-[18px] rounded-[5px] bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-400 font-bold flex items-center justify-center">
          {number}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
          {title}
        </span>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-[0.05em] bg-green-500/15 border border-green-500/30 text-green-400 px-[6px] py-[2px] rounded-[4px]">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Field Label ────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium block mb-1.5"
    >
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

// ─── Shared Input Classes ───────────────────────────────────────

const inputClasses =
  "bg-white/60 dark:bg-[rgba(15,17,25,0.6)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-[8px] px-3 py-[7px] text-[13px] text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-blue-500/50 focus:bg-blue-500/[0.04] focus:ring-0 focus:outline-none transition-all duration-150 h-[48px] md:h-[38px] w-full";

// ─── Info Chip ──────────────────────────────────────────────────

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[6px] text-[11px] text-blue-400 bg-blue-500/[0.08] border border-blue-500/[0.18] rounded-[8px] p-2 mt-2.5">
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ─── Stock Health ───────────────────────────────────────────────

function getStockHealth(
  qty: number,
  lowStockAlert: number,
  reorderLevel: number
): { label: string; color: string; dotClass: string; bgClass: string } {
  if (qty === 0)
    return {
      label: "No Stock",
      color: "text-[#94A3B8]",
      dotClass: "bg-[#94A3B8]",
      bgClass: "bg-slate-500/10 border-slate-500/20",
    };
  if (qty <= lowStockAlert)
    return {
      label: "Critical",
      color: "text-[#EF4444]",
      dotClass: "bg-[#EF4444]",
      bgClass: "bg-red-500/10 border-red-500/20",
    };
  if (qty <= reorderLevel)
    return {
      label: "Low Stock",
      color: "text-[#F59E0B]",
      dotClass: "bg-[#F59E0B]",
      bgClass: "bg-amber-500/10 border-amber-500/20",
    };
  return {
    label: "Healthy",
    color: "text-[#10B981]",
    dotClass: "bg-[#10B981]",
    bgClass: "bg-green-500/10 border-green-500/20",
  };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AddMaterialModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
}: AddMaterialModalProps) {
  // ── Local UI state (does NOT affect API) ──
  const [isGstInclusive, setIsGstInclusive] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [reorderLevel, setReorderLevel] = useState<string>("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ── Live Calculations ──
  const quantity = useMemo(
    () => Number(formData.quantity) || 0,
    [formData.quantity]
  );
  const costPerUnit = useMemo(
    () => Number(formData.purchase_cost_per_unit) || 0,
    [formData.purchase_cost_per_unit]
  );
  const gst = useMemo(() => Number(formData.tax_rate) || 0, [formData.tax_rate]);
  const lowStockAlert = useMemo(
    () => Number(formData.min_stock_level) || 0,
    [formData.min_stock_level]
  );
  const reorderLevelNum = useMemo(
    () => Number(reorderLevel) || lowStockAlert * 2,
    [reorderLevel, lowStockAlert]
  );

  const subtotal = useMemo(() => quantity * costPerUnit, [quantity, costPerUnit]);
  const taxAmount = useMemo(
    () => subtotal * (gst / 100),
    [subtotal, gst]
  );
  const totalValue = useMemo(
    () => subtotal + taxAmount,
    [subtotal, taxAmount]
  );

  const stockHealth = useMemo(
    () => getStockHealth(quantity, lowStockAlert, reorderLevelNum),
    [quantity, lowStockAlert, reorderLevelNum]
  );

  // ── Active unit pill ──
  const activeUnit = formData.unit.toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="add-material-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* ── Modal ── */}
          <motion.div
            key="add-material-modal"
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn(
              "fixed z-[100] flex flex-col overflow-hidden",
              "bg-[#F3F5F9] dark:bg-[#0F1117]",
              "rounded-[18px] shadow-2xl",
              // Desktop
              "max-w-[1280px] 2xl:max-w-[1400px] w-[95vw]",
              // Mobile
              "max-md:w-[calc(100vw-16px)] max-md:h-[calc(100dvh-16px)]",
              // Centering
              "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              // Height control
              "max-h-[90dvh] md:max-h-[88vh]",
              // Safe area
              "pb-[env(safe-area-inset-bottom)]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ════════════════ HEADER ════════════════ */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]">
              <div className="flex items-center gap-3">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Package size={18} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
                    {isEditing ? "Edit Material" : "Add New Material"}
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    {isEditing
                      ? "Update stock and supplier details"
                      : "Add raw material to inventory and track stock levels"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <X size={16} className="text-[#64748B] dark:text-[#94A3B8]" />
              </button>
            </div>

            {/* ════════════════ INVENTORY VALUE PREVIEW BANNER ════════════════ */}
            <div className="flex-shrink-0 mx-5 mt-3 hidden md:block">
              <div className="flex items-center justify-between bg-blue-500/[0.06] border border-blue-500/20 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Live Preview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Estimated Inventory Value
                  </span>
                  <span className="text-xl font-bold text-green-400">
                    {formatINR(totalValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* ════════════════ BODY — TWO COLUMNS ════════════════ */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
              {/* ──── LEFT COLUMN: Scrollable Form ──── */}
              <div className="flex-1 overflow-y-auto p-5 pb-6 scrollbar-thin">
                {/* ── MOBILE: Estimated Value Header ── */}
                <div className="md:hidden dark:bg-[#161B27] bg-[#EEF2F7] border-b border-[rgba(148,163,184,0.10)] py-3 px-5 -mx-5 -mt-5 mb-4">
                  <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Estimated Inventory Value</p>
                  <p className="text-[22px] font-bold text-green-400 tabular-nums">{formatINR(totalValue)}</p>
                </div>
                <form
                  id="inventory-form"
                  onSubmit={onSubmit}
                  className="space-y-4 md:space-y-3"
                >
                  {/* ── SECTION 1: Material Details ── */}
                  <SectionCard number={1} title="Material Details">
                    <div className="space-y-3">
                      {/* Material Name */}
                      <div>
                        <FieldLabel htmlFor="modal-name" required>
                          Material Name
                        </FieldLabel>
                        <Input
                          id="modal-name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g. Polyester Yarn"
                          required
                          className={inputClasses}
                        />
                      </div>
                      {/* Category + HSN Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <FieldLabel htmlFor="modal-category">
                            Category
                          </FieldLabel>
                          <select
                            id="modal-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={inputClasses + " cursor-pointer"}
                          >
                            <option value="">Select category</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel htmlFor="modal-hsn">HSN Code</FieldLabel>
                          <Input
                            id="modal-hsn"
                            value={formData.hsn_code}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hsn_code: e.target.value,
                              })
                            }
                            placeholder="e.g. 5402"
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SECTION 2: Inventory Setup ── */}
                  <SectionCard number={2} title="Inventory Setup">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Quantity */}
                        <div>
                          <FieldLabel htmlFor="modal-quantity" required>
                            Quantity
                          </FieldLabel>
                          <NumericInput
                            id="modal-quantity"
                            value={formData.quantity}
                            onValueChange={(v) =>
                              setFormData({ ...formData, quantity: v })
                            }
                            placeholder="Enter quantity"
                            allowDecimal={true}
                            min={0}
                            className={inputClasses}
                          />
                        </div>
                        {/* Unit */}
                        <div>
                          <FieldLabel htmlFor="modal-unit" required>
                            Unit
                          </FieldLabel>
                          <Input
                            id="modal-unit"
                            value={formData.unit}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                unit: e.target.value,
                              })
                            }
                            placeholder="kg, pcs, meters"
                            className={inputClasses}
                          />
                        </div>
                      </div>
                      {/* Unit Quick-Select Pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {UNIT_PILLS.map((pill) => (
                          <button
                            key={pill}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                unit: pill.toLowerCase(),
                              })
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all duration-150 border",
                              activeUnit === pill
                                ? "bg-blue-500/[0.18] border-blue-500/[0.45] text-blue-400"
                                : "bg-transparent border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] text-[#64748B] dark:text-[#94A3B8] hover:border-blue-500/30 hover:text-blue-400"
                            )}
                          >
                            {pill}
                          </button>
                        ))}
                      </div>
                      <InfoChip>
                        Total stock after adding will be reflected in inventory
                      </InfoChip>
                    </div>
                  </SectionCard>

                  {/* ── SECTION 3: Cost & Tax Configuration ── */}
                  <SectionCard number={3} title="Cost & Tax Configuration">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Cost Per Unit */}
                        <div>
                          <FieldLabel htmlFor="modal-cost" required>
                            Cost Per Unit
                          </FieldLabel>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-[13px] text-[#94A3B8] pointer-events-none select-none z-10">₹</span>
                            <NumericInput
                              id="modal-cost"
                              value={formData.purchase_cost_per_unit}
                              onValueChange={(v) =>
                                setFormData({
                                  ...formData,
                                  purchase_cost_per_unit: v,
                                })
                              }
                              placeholder="0.00"
                              allowDecimal={true}
                              min={0}
                              className={inputClasses + " pl-7"}
                            />
                          </div>
                        </div>
                        {/* GST % */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <FieldLabel>GST %</FieldLabel>
                          </div>
                          <NumericInput
                            id="modal-tax"
                            value={formData.tax_rate}
                            onValueChange={(v) =>
                              setFormData({ ...formData, tax_rate: v })
                            }
                            placeholder="18"
                            allowDecimal={true}
                            min={0}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                      {/* GST Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                            Inclusive of GST
                          </span>
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] ml-1.5">
                            · Cost already includes GST
                          </span>
                        </div>
                        <div
                          role="switch"
                          aria-checked={isGstInclusive}
                          onClick={() => setIsGstInclusive(!isGstInclusive)}
                          className={cn(
                            "relative w-[44px] h-[24px] rounded-full cursor-pointer overflow-hidden transition-colors duration-200",
                            isGstInclusive
                              ? "bg-blue-600"
                              : "bg-[rgba(148,163,184,0.2)]"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200",
                              isGstInclusive
                                ? "translate-x-[23px]"
                                : "translate-x-[3px]"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* ── SECTION 4: Stock Monitoring ── */}
                  <SectionCard number={4} title="Stock Monitoring">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Low Stock Alert */}
                        <div>
                          <FieldLabel htmlFor="modal-min-stock">
                            Low Stock Alert
                          </FieldLabel>
                          <NumericInput
                            id="modal-min-stock"
                            value={formData.min_stock_level}
                            onValueChange={(v) =>
                              setFormData({ ...formData, min_stock_level: v })
                            }
                            placeholder="e.g. 10"
                            allowDecimal={true}
                            min={0}
                            className={inputClasses}
                          />
                        </div>
                        {/* Reorder Level */}
                        <div>
                          <FieldLabel htmlFor="modal-reorder">
                            Reorder Level
                          </FieldLabel>
                          <NumericInput
                            id="modal-reorder"
                            value={reorderLevel}
                            onValueChange={setReorderLevel}
                            placeholder="e.g. 20"
                            allowDecimal={true}
                            min={0}
                            className={inputClasses}
                          />
                        </div>
                      </div>
                      <InfoChip>
                        You will be notified when stock reaches low stock level
                      </InfoChip>
                    </div>
                  </SectionCard>

                  {/* ── SECTION 5: Additional Information ── */}
                  <SectionCard number={5} title="Additional Information (Optional)">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Supplier WhatsApp */}
                        <div>
                          <FieldLabel htmlFor="modal-whatsapp" required>
                            Supplier WhatsApp
                          </FieldLabel>
                          <Input
                            id="modal-whatsapp"
                            value={formData.supplier_whatsapp}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                supplier_whatsapp: e.target.value,
                              })
                            }
                            placeholder="e.g. +91 9876543210"
                            required
                            className={inputClasses}
                          />
                        </div>
                        {/* Notes */}
                        <div>
                          <FieldLabel htmlFor="modal-notes">Notes</FieldLabel>
                          <textarea
                            id="modal-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                            rows={3}
                            className={cn(
                              inputClasses,
                              "h-auto resize-none py-2"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </form>

                {/* ── MOBILE ACCORDION: Inventory Summary ── */}
                <div className="block md:hidden mt-4">
                  <div className="bg-white/40 dark:bg-black/40 border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl overflow-hidden">
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => setSummaryOpen((prev) => !prev)}
                      className="flex items-center justify-between w-full p-4"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-[18px] h-[18px] rounded-[5px] bg-blue-500/15 border border-blue-500/30 text-[10px] text-blue-400 font-bold flex items-center justify-center">
                          6
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                          Inventory Summary
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-[#64748B] dark:text-[#94A3B8] transition-transform duration-200",
                          summaryOpen && "rotate-180"
                        )}
                      />
                    </button>

                    {/* Accordion Body */}
                    <AnimatePresence initial={false}>
                      {summaryOpen && (
                        <motion.div
                          key="summary-accordion-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {/* Material Preview */}
                            <div className="bg-white/60 dark:bg-[rgba(22,27,39,0.9)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-3.5 space-y-2.5">
                              <p className="text-[13px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                                {formData.name || "Material Name"}
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">Quantity</span>
                                  <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                                    {quantity || "\u2014"} {formData.unit || ""}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">Unit</span>
                                  <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                                    {formData.unit || "\u2014"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">Cost Per Unit</span>
                                  <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                                    {costPerUnit ? formatINR(costPerUnit) : "\u2014"}
                                  </span>
                                </div>
                              </div>
                              {/* Divider */}
                              <div className="border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]" />
                              {/* Subtotal + GST */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#10B981] font-medium">Subtotal</span>
                                  <span className="text-[#10B981] font-semibold">{formatINR(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[12px]">
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">GST Tax ({gst}%)</span>
                                  <span className="text-[#64748B] dark:text-[#94A3B8]">{formatINR(taxAmount)}</span>
                                </div>
                              </div>
                              {/* Divider */}
                              <div className="border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]" />
                              {/* Total */}
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">Total</span>
                                <span className="text-[17px] font-bold text-green-400">{formatINR(totalValue)}</span>
                              </div>
                            </div>

                            {/* Stock Health */}
                            <div className="bg-white/60 dark:bg-[rgba(22,27,39,0.9)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-3.5">
                              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                                Stock Health
                              </p>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                                  stockHealth.bgClass,
                                  stockHealth.color
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", stockHealth.dotClass)} />
                                {stockHealth.label}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* ── MOBILE: Save / Cancel Buttons ── */}
                <div className="md:hidden pt-4 pb-6 px-1 flex flex-col gap-3">
                  <button
                    type="submit"
                    form="inventory-form"
                    className="w-full h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] rounded-[10px] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle size={16} />
                    {isEditing ? "Update Details" : "Save Material"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-[48px] bg-transparent border border-[rgba(148,163,184,0.20)] text-[#94A3B8] font-medium text-[14px] rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* ──── RIGHT COLUMN: Sticky Summary Panel ──── */}
              <div className="hidden md:block w-full md:w-[300px] xl:w-[320px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] overflow-y-auto p-5">
                <div className="sticky top-0 space-y-3">
                  {/* Summary Title */}
                  <h3 className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    Inventory Summary
                  </h3>

                  {/* Material Preview Card */}
                  <div className="bg-white/60 dark:bg-[rgba(22,27,39,0.9)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-3.5 space-y-2.5">
                    {/* Name */}
                    <p className="text-[13px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                      {formData.name || "Material Name"}
                    </p>
                    {/* Row items */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          Quantity
                        </span>
                        <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                          {quantity || "—"} {formData.unit || ""}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          Unit
                        </span>
                        <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                          {formData.unit || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          Cost Per Unit
                        </span>
                        <span className="text-[#0F172A] dark:text-[#F1F5F9] font-medium">
                          {costPerUnit ? formatINR(costPerUnit) : "—"}
                        </span>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)]" />
                    {/* Subtotal + GST */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#10B981] font-medium">
                          Subtotal
                        </span>
                        <span className="text-[#10B981] font-semibold">
                          {formatINR(subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          GST Tax ({gst}%)
                        </span>
                        <span className="text-[#64748B] dark:text-[#94A3B8]">
                          {formatINR(taxAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Inventory Value */}
                  <div className="bg-green-500/[0.07] border border-green-500/20 rounded-xl p-3.5">
                    <p className="text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold mb-1">
                      Total Inventory Value
                    </p>
                    <p className="text-[17px] font-bold text-green-400">
                      {formatINR(totalValue)}
                    </p>
                  </div>

                  {/* Stock Health Indicator */}
                  <div className="bg-white/60 dark:bg-[rgba(22,27,39,0.9)] border border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] rounded-xl p-3.5">
                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                      Stock Health
                    </p>
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                        stockHealth.bgClass,
                        stockHealth.color
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          stockHealth.dotClass
                        )}
                      />
                      {stockHealth.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════ FOOTER (Desktop only) ════════════════ */}
            <div className="flex-shrink-0 hidden md:block px-5 py-3.5 border-t border-[rgba(15,23,42,0.06)] dark:border-[rgba(148,163,184,0.10)] bg-[#EEF2F7]/80 dark:bg-[rgba(30,37,55,0.95)]">
              <div className="flex gap-2.5 items-center justify-between">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] border border-[rgba(15,23,42,0.08)] dark:border-[rgba(148,163,184,0.2)] bg-transparent hover:bg-slate-500/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {/* Save */}
                <button
                  type="submit"
                  form="inventory-form"
                  className="px-6 py-2 rounded-[10px] text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  {isEditing ? "Update Details" : "Save to Inventory"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
