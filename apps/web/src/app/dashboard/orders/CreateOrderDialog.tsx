import React, { useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/ui/numeric-input";
import { TogglePill } from "@/components/ui/toggle-pill";
import { IOSButton } from "@/components/ui/ios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Factory, X, Package, Box, AlertCircle, Plus, Loader2,
  ChevronDown, ChevronUp, User, Calendar, Cpu, StickyNote, Zap, Flame, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormDirty } from "@/hooks/useFormDirty";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface CreateOrderDialogProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  currentOrder: any;
  clients: any[];
  clientProducts: any[];
  inventory: any[];
  clientProductMaterials: any[];
  isLoadingMaterials: boolean;
  computedMaterialCost: { total: number; warnings: string[] };
  parseNumericValue: (v: string | number) => number;
  handleClientChange: (clientId: string) => void;
  handleProductChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addDeductionRow: () => void;
  updateDeductionRow: (idx: number, field: string, value: string) => void;
  removeDeductionRow: (idx: number) => void;
  machines?: any[];
  employees?: any[];
  submitLoading?: boolean;
}

export function CreateOrderDialog({
  isDialogOpen,
  setIsDialogOpen,
  resetForm,
  handleSubmit,
  formData,
  setFormData,
  currentOrder,
  clients,
  clientProducts,
  inventory,
  clientProductMaterials,
  isLoadingMaterials,
  computedMaterialCost,
  parseNumericValue,
  handleClientChange,
  handleProductChange,
  addDeductionRow,
  updateDeductionRow,
  removeDeductionRow,
  machines = [],
  employees = [],
  submitLoading = false,
}: CreateOrderDialogProps) {
  const [showMaterials, setShowMaterials] = React.useState(true);
  const [showNotes, setShowNotes] = React.useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);

  // ── Live Summary — useMemo-derived, no sync effects ──
  const totals = useMemo(() => {
    const totalValue = parseNumericValue(formData.quantity) * parseNumericValue(formData.rate);
    const effectiveMaterialCost = currentOrder && formData.order_items.length === 0
      ? Number(currentOrder.materialCost ?? currentOrder.material_cost ?? 0)
      : computedMaterialCost.total;
    const totalCost = effectiveMaterialCost + parseNumericValue(formData.labour_cost) + parseNumericValue(formData.overhead_cost);
    const profit = totalValue - totalCost;
    const marginPct = totalValue > 0 ? (profit / totalValue) * 100 : 0;
    const hasData = totalCost > 0 || effectiveMaterialCost > 0;
    return { totalValue, effectiveMaterialCost, totalCost, profit, marginPct, hasData };
  }, [formData, currentOrder, computedMaterialCost, parseNumericValue]);

  const { totalValue, effectiveMaterialCost, profit, marginPct } = totals;

  // ── Dirty tracking for unsaved changes protection ──
  const { isDirty, resetDirty } = useFormDirty(formData);

  // Body scroll lock for discard confirmation (nested modal)
  useBodyScrollLock(showDiscardDialog);

  const isSubmitDisabled = !formData.client_id || !formData.product_name || parseNumericValue(formData.quantity) <= 0 || submitLoading;

  const handleDraftSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormData((prev: any) => ({ ...prev, status: "pending" }));
    setTimeout(() => {
      handleSubmit(e);
      resetDirty();
    }, 0);
  }, [handleSubmit, setFormData, resetDirty]);

  const handleIssueSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFormData((prev: any) => ({ ...prev, status: "processing" }));
    setTimeout(() => {
      handleSubmit(e);
      resetDirty();
    }, 0);
  }, [handleSubmit, setFormData, resetDirty]);

  // ── Attempt to close — show discard if dirty ──
  const attemptClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      setIsDialogOpen(false);
      resetForm();
    }
  }, [isDirty, setIsDialogOpen, resetForm]);

  // ── Ctrl+S / Cmd+S shortcut ──
  useEffect(() => {
    if (!isDialogOpen) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitDisabled) {
          handleDraftSubmit(new Event('submit') as unknown as React.FormEvent);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDialogOpen, isSubmitDisabled, handleDraftSubmit]);

  return (
    <>
    <Dialog
      open={isDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          attemptClose();
          return;
        }
        setIsDialogOpen(open);
      }}
    >
      <DialogContent
        className="max-w-[520px] md:max-w-[min(1100px,85vw)] p-0 gap-0 border border-gray-200 dark:border-[rgba(255,255,255,0.07)] rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[92vh] bg-white dark:bg-[#0D1421]"
        aria-describedby={undefined}
        showCloseButton={false}
        fullScreen
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); attemptClose(); } }}
      >
        {/* Noise overlay — dark mode only */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-0 dark:opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

        <DialogDescription className="sr-only">Form to configure and issue a production order</DialogDescription>

        {/* Header */}
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-[rgba(255,255,255,0.07)] relative z-10 bg-white dark:bg-[#0D1421]">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 dark:bg-[rgba(59,130,246,0.15)] border border-blue-100 dark:border-[rgba(59,130,246,0.2)] flex items-center justify-center flex-shrink-0">
              <Factory className="h-[18px] w-[18px] text-blue-500 dark:text-[#60a5fa]" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-[18px] font-bold text-gray-900 dark:text-[rgba(255,255,255,0.95)] leading-tight m-0">
                {currentOrder ? "Edit Order" : "Configure Production Order"}
              </DialogTitle>
              <p className="text-[12px] text-gray-400 dark:text-[rgba(255,255,255,0.35)] mt-0.5">
                {currentOrder ? `Updating ${currentOrder.productName || "order"}` : "Setup details and allocate materials"}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] flex items-center justify-center cursor-pointer text-gray-400 dark:text-[rgba(255,255,255,0.4)] hover:bg-red-50 dark:hover:bg-[rgba(255,80,80,0.15)] hover:text-red-500 dark:hover:text-[#f87171] transition-colors flex-shrink-0 absolute top-5 right-5"
            >
              <X size={16} />
            </motion.button>
          </DialogClose>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 relative z-10" style={{ scrollbarWidth: 'thin' }}>
          <form id="order-form" className="space-y-8">

            {/* Section 1: Order Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 dark:text-[rgba(255,255,255,0.3)]">Order Details</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.05)]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Target Client</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-[#60a5fa] z-10 pointer-events-none" />
                    <Select value={formData.client_id} onValueChange={handleClientChange} required>
                      <SelectTrigger className="h-[44px] pl-10 bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[10px] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-1 dark:focus:ring-[#60a5fa] transition-all">
                        <SelectValue placeholder="Select from directory..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-[10px] bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
                        {clients.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="rounded-[8px] text-gray-700 dark:text-[rgba(255,255,255,0.8)] focus:bg-gray-50 dark:focus:bg-[rgba(255,255,255,0.05)] focus:text-gray-900 dark:focus:text-white">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Product Name</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500 dark:text-[#c084fc] pointer-events-none" />
                    <Input
                      list="client-products"
                      placeholder="Enter product name..."
                      value={formData.product_name}
                      onChange={handleProductChange}
                      className="h-[44px] pl-10 bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[10px] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus-visible:ring-2 focus-visible:ring-purple-500/30 dark:focus-visible:ring-1 dark:focus-visible:ring-[#c084fc] placeholder:text-gray-400 dark:placeholder:text-[rgba(255,255,255,0.2)]"
                      required
                    />
                    <datalist id="client-products">
                      {clientProducts.map((p) => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Ordered Quantity</Label>
                  <div className="flex h-[44px] rounded-[10px] overflow-hidden border border-gray-200 dark:border-[rgba(255,255,255,0.08)] focus-within:ring-2 focus-within:ring-blue-500/30 dark:focus-within:ring-1 dark:focus-within:ring-[rgba(255,255,255,0.2)] transition-all">
                    <NumericInput
                      value={formData.quantity}
                      onValueChange={(v) => setFormData({ ...formData, quantity: v })}
                      className="h-full rounded-none border-none border-r border-gray-200 dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[rgba(255,255,255,0.03)] focus:ring-0 max-w-[60%] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] placeholder:text-gray-400 dark:placeholder:text-[rgba(255,255,255,0.2)]"
                      placeholder="0"
                      allowDecimal={true}
                      min={0}
                      required
                    />
                    <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                      <SelectTrigger className="h-full rounded-none border-none flex-1 bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] focus:ring-0 focus:ring-offset-0 px-3 text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)]">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[10px] bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] min-w-[80px]">
                        {["kg", "pcs", "ltr", "mtr", "box"].map(u => (
                          <SelectItem key={u} value={u} className="rounded-[8px] text-gray-700 dark:text-[rgba(255,255,255,0.8)] focus:bg-gray-50 dark:focus:bg-[rgba(255,255,255,0.05)] focus:text-gray-900 dark:focus:text-white">{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Rate per Unit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400 dark:text-[rgba(255,255,255,0.4)] pointer-events-none">₹</span>
                    <NumericInput
                      value={formData.rate}
                      onValueChange={(v) => setFormData({ ...formData, rate: v })}
                      className="h-[44px] pl-7 bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[10px] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:focus-visible:ring-1 dark:focus-visible:ring-[rgba(255,255,255,0.2)] placeholder:text-gray-400 dark:placeholder:text-[rgba(255,255,255,0.2)]"
                      placeholder="0.00"
                      allowDecimal={true}
                      min={0}
                      required
                    />
                  </div>
                </div>

                {/* Estimated Order Value Strip */}
                <div className="col-span-2 mt-1 rounded-[12px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[rgba(59,130,246,0.08)] dark:to-[rgba(99,102,241,0.06)] border border-blue-100 dark:border-[rgba(59,130,246,0.12)] flex items-center justify-between px-4 py-3">
                  <span className="text-[12px] font-semibold text-blue-500/70 dark:text-[rgba(96,165,250,0.7)] uppercase tracking-wider">Estimated Order Value</span>
                  <span className="text-[17px] font-bold text-blue-600 dark:text-[#60a5fa]">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Production Setup */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 dark:text-[rgba(255,255,255,0.3)]">Production Setup</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.05)]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Priority</Label>
                  <div className="flex gap-2">
                    {[
                      { v: 'low', l: 'Low', i: ChevronDown, c: 'text-slate-500 dark:text-[#94a3b8]', bg: 'bg-slate-50 dark:bg-[rgba(148,163,184,0.1)]', bc: 'border-slate-200 dark:border-[rgba(148,163,184,0.2)]' },
                      { v: 'normal', l: 'Normal', i: Zap, c: 'text-blue-500 dark:text-[#60a5fa]', bg: 'bg-blue-50 dark:bg-[rgba(96,165,250,0.1)]', bc: 'border-blue-200 dark:border-[rgba(96,165,250,0.2)]' },
                      { v: 'high', l: 'High', i: ChevronUp, c: 'text-amber-500 dark:text-[#fbbf24]', bg: 'bg-amber-50 dark:bg-[rgba(251,191,36,0.1)]', bc: 'border-amber-200 dark:border-[rgba(251,191,36,0.2)]' },
                      { v: 'urgent', l: 'Urgent', i: Flame, c: 'text-red-500 dark:text-[#ef4444]', bg: 'bg-red-50 dark:bg-[rgba(239,68,68,0.1)]', bc: 'border-red-200 dark:border-[rgba(239,68,68,0.2)]' }
                    ].map(p => {
                      const Icon = p.i;
                      const isSelected = formData.priority === p.v;
                      return (
                        <button
                          key={p.v} type="button"
                          onClick={() => setFormData({ ...formData, priority: p.v })}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 h-[38px] rounded-[10px] border text-[13px] font-medium transition-all cursor-pointer",
                            isSelected ? `${p.bg} ${p.bc} ${p.c}` : "bg-white dark:bg-[rgba(255,255,255,0.03)] border-gray-200 dark:border-[rgba(255,255,255,0.05)] text-gray-400 dark:text-[rgba(255,255,255,0.4)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.06)]"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", isSelected ? p.c : "text-gray-400 dark:text-[rgba(255,255,255,0.3)]")} />
                          {p.l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Delivery Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 dark:text-[#34d399] pointer-events-none" />
                    <Input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                      className="h-[44px] pl-10 bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[10px] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:focus-visible:ring-1 dark:focus-visible:ring-[#34d399]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] uppercase tracking-wide">Status</Label>
                  <div className="relative">
                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 dark:text-[#f472b6] pointer-events-none" />
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="h-[44px] pl-10 bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] rounded-[10px] text-[14px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus:ring-2 focus:ring-pink-500/30 dark:focus:ring-1 dark:focus:ring-[#f472b6]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[10px] bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
                        <SelectItem value="pending" className="rounded-[8px] text-gray-700 dark:text-[rgba(255,255,255,0.8)]">Pending</SelectItem>
                        <SelectItem value="processing" className="rounded-[8px] text-gray-700 dark:text-[rgba(255,255,255,0.8)]">In Production</SelectItem>
                        <SelectItem value="completed" className="rounded-[8px] text-gray-700 dark:text-[rgba(255,255,255,0.8)]">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Materials & Cost */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowMaterials(!showMaterials)}
                className="w-full flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 dark:text-[rgba(255,255,255,0.3)] group-hover:text-gray-500 dark:group-hover:text-[rgba(255,255,255,0.5)] transition-colors">Materials & Cost</span>
                  {formData.order_items.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-[rgba(255,255,255,0.1)] text-[10px] font-bold text-blue-600 dark:text-white leading-none">
                      {formData.order_items.length}
                    </span>
                  )}
                  <div className="w-16 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] ml-2" />
                </div>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 dark:text-[rgba(255,255,255,0.3)] transition-transform duration-300", showMaterials ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {showMaterials && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    {/* Material Source toggle */}
                    <div className="flex items-center justify-between p-3 rounded-[12px] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)]">
                      <Label className="text-[12px] font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.7)] ml-1">Material Source</Label>
                      <div className="scale-90 origin-right">
                        <TogglePill
                          options={[
                            { value: "own", label: "Own Material" },
                            { value: "client", label: "Client Material" },
                          ]}
                          value={formData.material_source}
                          onChange={(v: any) => {
                            setFormData((prev: any) => ({ ...prev, material_source: v, order_items: [] }));
                          }}
                        />
                      </div>
                    </div>

                    {/* Material List */}
                    {!currentOrder && (
                      <div className="space-y-3">
                        {formData.order_items.length === 0 ? (
                          <div className="py-6 text-center bg-gray-50 dark:bg-[rgba(255,255,255,0.01)] rounded-[12px] border border-dashed border-gray-200 dark:border-[rgba(255,255,255,0.1)] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.02)] transition-colors" onClick={addDeductionRow}>
                            <Box className="h-6 w-6 mb-2 text-gray-300 dark:text-[rgba(255,255,255,0.2)]" />
                            <p className="text-[13px] font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)]">No materials selected</p>
                            <p className="text-[11px] text-gray-400 dark:text-[rgba(255,255,255,0.3)] mt-1">Click to add raw materials for this order</p>
                          </div>
                        ) : (
                          formData.order_items.map((item: any, idx: number) => {
                            const sourceMaterials = formData.material_source === "own" ? inventory : clientProductMaterials;
                            const hasClientSelected = formData.material_source === "own" || !!formData.client_id;
                            return (
                              <div key={idx} className="flex gap-2 items-start p-3 rounded-[12px] bg-white dark:bg-[rgba(255,255,255,0.03)] border border-gray-100 dark:border-[rgba(255,255,255,0.05)] shadow-sm dark:shadow-none">
                                <div className="flex-1 space-y-1.5">
                                  <Label className="text-[10px] font-bold text-gray-400 dark:text-[rgba(255,255,255,0.4)] uppercase">Material {isLoadingMaterials && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}</Label>
                                  <Select value={item.inventory_id} onValueChange={(v) => updateDeductionRow(idx, "inventory_id", v)} disabled={!hasClientSelected || isLoadingMaterials}>
                                    <SelectTrigger className="h-[36px] bg-gray-50 dark:bg-[rgba(0,0,0,0.2)] border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-[8px] text-[13px]">
                                      <SelectValue placeholder={!hasClientSelected ? "Select client..." : "Select stock..."} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-[10px] bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
                                      {sourceMaterials.map((i: any) => (
                                        <SelectItem key={i.id} value={i.id} disabled={i.quantity <= 0} className="rounded-[8px] text-[13px]">
                                          {i.name} ({i.quantity} left)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="w-24 space-y-1.5">
                                  <Label className="text-[10px] font-bold text-gray-400 dark:text-[rgba(255,255,255,0.4)] uppercase">Qty</Label>
                                  <NumericInput value={item.quantity_deducted} onValueChange={(v) => updateDeductionRow(idx, "quantity_deducted", v)} className="h-[36px] bg-gray-50 dark:bg-[rgba(0,0,0,0.2)] border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-[8px] text-[13px] text-center" placeholder="0" allowDecimal={true} min={0} />
                                </div>
                                <div className="pt-5 pl-1">
                                  <button type="button" onClick={() => removeDeductionRow(idx)} className="h-[36px] w-[36px] rounded-[8px] flex items-center justify-center text-gray-400 dark:text-[rgba(255,255,255,0.3)] hover:text-red-500 dark:hover:text-[#f87171] hover:bg-red-50 dark:hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <button type="button" onClick={addDeductionRow} className="flex items-center gap-1.5 text-[12px] font-medium text-blue-500 dark:text-[#60a5fa] hover:text-blue-600 dark:hover:text-[#93c5fd] transition-colors mt-2 ml-1 cursor-pointer">
                          <Plus className="h-3.5 w-3.5" /> Add Material
                        </button>
                      </div>
                    )}

                    {/* Cost Summary Strip */}
                    <div className="rounded-[12px] bg-gradient-to-r from-gray-50 to-white dark:from-[rgba(255,255,255,0.02)] dark:to-transparent border border-gray-100 dark:border-[rgba(255,255,255,0.05)] overflow-hidden">
                      <div className="flex divide-x divide-gray-100 dark:divide-[rgba(255,255,255,0.05)]">
                        <div className="flex-1 p-3 relative">
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-400" />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[rgba(255,255,255,0.4)] mb-1">Material Cost</div>
                          <div className="text-[14px] font-semibold text-gray-900 dark:text-white">₹{effectiveMaterialCost.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="flex-1 p-3 relative">
                          <div className={cn("absolute top-0 left-0 right-0 h-[2px]", profit >= 0 ? "bg-emerald-400" : "bg-red-400")} />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[rgba(255,255,255,0.4)] mb-1">Gross Profit</div>
                          <div className={cn("text-[14px] font-semibold", profit >= 0 ? "text-emerald-600 dark:text-[#34d399]" : "text-red-600 dark:text-[#f87171]")}>
                            ₹{profit.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="flex-1 p-3 relative">
                          <div className={cn("absolute top-0 left-0 right-0 h-[2px]", marginPct >= 0 ? "bg-violet-400" : "bg-red-400")} />
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[rgba(255,255,255,0.4)] mb-1">Margin</div>
                          <div className={cn("text-[14px] font-semibold", marginPct >= 0 ? "text-violet-600 dark:text-[#a78bfa]" : "text-red-600 dark:text-[#f87171]")}>
                            {marginPct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 4: Notes */}
            <div className="space-y-4 pb-4">
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="w-full flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-gray-400 dark:text-[rgba(255,255,255,0.3)] group-hover:text-gray-500 dark:group-hover:text-[rgba(255,255,255,0.5)] transition-colors">Additional Notes</span>
                  <div className="w-16 h-px bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] ml-2" />
                </div>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 dark:text-[rgba(255,255,255,0.3)] transition-transform duration-300", showNotes ? "rotate-180" : "")} />
              </button>

              <AnimatePresence>
                {showNotes && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-4 w-4 text-gray-300 dark:text-[rgba(255,255,255,0.2)] pointer-events-none" />
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any internal notes, special requirements, or instructions..."
                        className="w-full min-h-[80px] pl-10 pr-3 py-3 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-[12px] text-[13px] text-gray-900 dark:text-[rgba(255,255,255,0.9)] focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-1 dark:focus:ring-[rgba(255,255,255,0.2)] focus:outline-none placeholder:text-gray-400 dark:placeholder:text-[rgba(255,255,255,0.2)] resize-none"
                        maxLength={500}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons — inline at end of form */}
            <div style={{ paddingTop: 32, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }} className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDraftSubmit}
                disabled={isSubmitDisabled}
                className="h-[46px] px-5 rounded-[12px] bg-white dark:bg-[rgba(255,255,255,0.05)] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] text-[13px] font-semibold text-gray-600 dark:text-[rgba(255,255,255,0.7)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.08)] hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={handleIssueSubmit}
                disabled={isSubmitDisabled}
                className="h-[46px] px-6 rounded-[12px] bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-[#10b981] dark:to-[#059669] text-white text-[13px] font-semibold shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.35)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-emerald-400/20 dark:border-[rgba(255,255,255,0.1)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                {submitLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {currentOrder ? "Push Updates" : "Issue Order"}
                    <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Discard Changes Confirmation ── */}
    <AnimatePresence mode="wait">
      {showDiscardDialog && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onPointerDown={() => setShowDiscardDialog(false)}
            className="fixed inset-0"
            style={{ zIndex: 10000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(360px,90vw)] rounded-[16px] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#1a2235] shadow-[0_24px_64px_rgba(0,0,0,0.5)] p-6"
            style={{ zIndex: 10001 }}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Escape') setShowDiscardDialog(false); }}
            tabIndex={-1}
            autoFocus
          >
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-2">
              Discard changes?
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-[rgba(255,255,255,0.5)] mb-6 leading-relaxed">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardDialog(false)}
                className="h-[38px] px-4 rounded-[10px] bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] border border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-[13px] font-semibold text-gray-600 dark:text-[rgba(255,255,255,0.7)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors cursor-pointer"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardDialog(false);
                  setIsDialogOpen(false);
                  resetForm();
                }}
                className="h-[38px] px-4 rounded-[10px] bg-red-500 dark:bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-red-600 dark:hover:bg-[#dc2626] transition-colors cursor-pointer shadow-[0_2px_8px_rgba(239,68,68,0.3)]"
              >
                Discard Changes
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
