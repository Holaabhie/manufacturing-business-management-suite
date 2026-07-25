"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, UserPlus, Check, Package, IndianRupee, Calendar, Cpu, User, ChevronDown, ChevronRight, X, AlertTriangle, TrendingUp, Layers, Copy, Clock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Order } from "@/modules/orders/domain/types";

// ─── Shared field wrapper ────────────────────────────────────
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

const inputClass = "bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] rounded-[10px] h-[44px] text-[15px]";
const fadeIn = { initial: { opacity: 0, y: 12 } as const, animate: { opacity: 1, y: 0 } as const, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

// ═════════════════════════════════════════════════════════════
// STEP 1: Client & Product
// ═════════════════════════════════════════════════════════════
export function StepClientProduct({
  clients, form, setForm, clientSearch, setClientSearch, addingClient, setAddingClient, newClient, setNewClient,
  recentOrders, onClone, cloningOrderId, showAllPrevious, setShowAllPrevious,
}: {
  clients: any[]; form: any; setForm: (f: any) => void;
  clientSearch: string; setClientSearch: (s: string) => void;
  addingClient: boolean; setAddingClient: (b: boolean) => void;
  newClient: { name: string; phone: string; email: string }; setNewClient: (c: any) => void;
  recentOrders?: Order[];
  onClone?: (orderId: string) => void;
  cloningOrderId?: string | null;
  showAllPrevious?: boolean;
  setShowAllPrevious?: (show: boolean) => void;
}) {
  const filtered = clients.filter((c) => c.name?.toLowerCase().includes(clientSearch.toLowerCase()));
  const selectedClient = clients.find((c) => c.id === form.client_id);

  // ─── Clone card helpers ─────────────────────────────────
  const formatINR = (num: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  const daysAgo = (dateStr: string | Date | undefined) => {
    if (!dateStr) return "unknown date";
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const latestOrder = recentOrders?.[0];
  const remainingOrders = recentOrders?.slice(1) ?? [];

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Client selection */}
      <Field label="Client">
        {!addingClient ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className={cn(inputClass, "pl-10")}
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--muted)]">
              {filtered.length === 0 ? (
                <p className="text-center text-[13px] text-[var(--muted-foreground)] py-4">No clients found</p>
              ) : filtered.slice(0, 8).map((c) => (
                <button
                  key={c.id} type="button"
                  onClick={() => setForm({ ...form, client_id: c.id })}
                  className={cn(
                    "w-full text-left px-3 py-2.5 flex items-center justify-between text-[14px] transition-colors cursor-pointer",
                    "hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-0",
                    form.client_id === c.id ? "bg-[rgba(0,122,255,0.08)] text-[var(--primary)]" : "text-[var(--foreground)]"
                  )}
                >
                  <span className="font-medium">{c.name}</span>
                  {form.client_id === c.id && <Check className="h-4 w-4 text-[var(--primary)]" />}
                </button>
              ))}
            </div>
            {selectedClient && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[rgba(0,122,255,0.06)] text-[var(--primary)] text-[13px]">
                <Check className="h-3.5 w-3.5" /> Selected: <span className="font-semibold">{selectedClient.name}</span>
              </div>
            )}
            <button type="button" onClick={() => setAddingClient(true)} className="flex items-center gap-1.5 text-[13px] text-[var(--primary)] font-medium hover:underline cursor-pointer">
              <UserPlus className="h-3.5 w-3.5" /> Add new client
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-[10px] border border-dashed border-[var(--primary)]/30 bg-[rgba(0,122,255,0.04)]">
            <p className="text-[13px] font-semibold text-[var(--primary)]">New Client</p>
            <Input placeholder="Client name *" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className={inputClass} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className={inputClass} />
              <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className={inputClass} />
            </div>
            <button type="button" onClick={() => { setAddingClient(false); setNewClient({ name: "", phone: "", email: "" }); }} className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)] cursor-pointer">
              ← Back to client list
            </button>
          </div>
        )}
      </Field>

      {/* ── Clone Previous Order Card ── */}
      <AnimatePresence>
        {latestOrder && !addingClient && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-[13px] font-bold text-[var(--foreground)]">
                    Previous Orders Found
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white font-bold">
                    {recentOrders?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Latest order card */}
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--muted)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--foreground)] truncate">
                      {latestOrder.productName || "Unnamed Product"}
                    </p>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">
                      {Number(latestOrder.quantity || 0).toLocaleString('en-IN')} {(latestOrder.unit || 'kg').toUpperCase()}
                      {latestOrder.totalAmount > 0 && (
                        <> · {formatINR(Number(latestOrder.totalAmount))}</>  
                      )}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {daysAgo(latestOrder.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClone?.(latestOrder.id)}
                    disabled={cloningOrderId === latestOrder.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                      "bg-[var(--primary)] text-white hover:opacity-90",
                      cloningOrderId === latestOrder.id && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {cloningOrderId === latestOrder.id ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Loading...</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Clone Order</>
                    )}
                  </button>
                </div>
              </div>

              {/* View all previous link */}
              {remainingOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllPrevious?.(!showAllPrevious)}
                  className="flex items-center gap-1 text-[12px] text-[var(--primary)] font-medium hover:underline cursor-pointer"
                >
                  {showAllPrevious ? "Hide" : "View all"} previous orders
                  <ChevronRight className={cn("h-3 w-3 transition-transform", showAllPrevious && "rotate-90")} />
                </button>
              )}

              {/* Expanded list of remaining orders */}
              <AnimatePresence>
                {showAllPrevious && remainingOrders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    {remainingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-[10px] border border-[var(--border)] bg-[var(--muted)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[var(--foreground)] truncate">
                              {order.productName || "Unnamed Product"}
                            </p>
                            <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">
                              {Number(order.quantity || 0).toLocaleString('en-IN')} {(order.unit || 'kg').toUpperCase()}
                              {order.totalAmount > 0 && <> · {formatINR(Number(order.totalAmount))}</>}
                              {" "}· {daysAgo(order.createdAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onClone?.(order.id)}
                            disabled={cloningOrderId === order.id}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                              "border border-[var(--primary)] text-[var(--primary)] hover:bg-[rgba(0,122,255,0.06)]",
                              cloningOrderId === order.id && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            {cloningOrderId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><Copy className="h-3 w-3" /> Clone</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product */}
      <Field label="Product Name">
        <Input placeholder="e.g. Steel Rods, Cotton Fabric..." value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className={inputClass} />
      </Field>

      {/* Quantity + Unit */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <NumericInput value={form.quantity} onValueChange={(v) => setForm({ ...form, quantity: v })} placeholder="0" className={inputClass} />
        </Field>
        <Field label="Unit">
          <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
            <SelectTrigger className={cn(inputClass, "cursor-pointer")}><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-[10px]">
              {["kg", "pcs", "meters", "liters"].map((u) => <SelectItem key={u} value={u} className="rounded-[8px]">{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Due date */}
      <Field label="Due Date">
        <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className={cn(inputClass, "cursor-pointer")} />
      </Field>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// STEP 2: Financials
// ═════════════════════════════════════════════════════════════
export function StepFinancials({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  // ─── Derived from Step 1 ──────────────────────────────
  const productQuantity = parseFloat(form.quantity) || 0;
  const productUnit = (form.unit || 'unit').toUpperCase();

  // ─── Auto-calculate order value from rate ─────────────
  const unitRate = parseFloat(form.unit_rate) || 0;
  const calculatedOrderValue = productQuantity * unitRate;

  // Sync order_value whenever rate or quantity changes
  React.useEffect(() => {
    const val = productQuantity * (parseFloat(form.unit_rate) || 0);
    setForm((prev: any) => ({ ...prev, order_value: val > 0 ? String(val) : '' }));
  }, [form.unit_rate, productQuantity]);

  // ─── INR formatter ────────────────────────────────────
  const formatINR = (num: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);

  // ─── GST calculations ────────────────────────────────
  const gstPct = form.gst_applicable ? (Number(form.gst_percent) || 0) : 0;
  const subtotal = calculatedOrderValue;
  const gstAmt = subtotal * gstPct / 100;
  const grandTotal = subtotal + gstAmt;

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* ── PRICING — Quantity (read-only from Step 1) + Rate Per Unit ── */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4 space-y-3">
        <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Pricing</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Quantity — read-only */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Quantity</Label>
            <div className={cn(inputClass, "flex items-center px-3 bg-[var(--card)] border border-[var(--border)] opacity-70 cursor-not-allowed")}>
              <Package className="h-4 w-4 text-[var(--muted-foreground)] mr-2 flex-shrink-0" />
              <span className="text-[15px] font-semibold text-[var(--foreground)]">
                {productQuantity > 0 ? productQuantity.toLocaleString('en-IN') : '—'} {productUnit}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] pl-1">Set in Step 1 — Client & Product</p>
          </div>

          {/* Rate Per Unit — editable */}
          <Field label={`Rate Per ${productUnit}`}>
            <NumericInput
              value={form.unit_rate}
              onValueChange={(v) => setForm({ ...form, unit_rate: v })}
              prefix={"\u20B9"}
              placeholder="0"
              allowDecimal={true}
              className={cn(inputClass, "pl-8 font-semibold")}
            />
          </Field>
        </div>
      </div>

      {/* ── ORDER VALUE — auto-calculated, read-only ── */}
      <Field label="Order Value">
        <div className="relative">
          <NumericInput
            value={form.order_value}
            onValueChange={() => {}}
            prefix={"\u20B9"}
            placeholder="0"
            className={cn(inputClass, "pl-8 font-bold text-[17px] bg-[var(--card)] opacity-70 cursor-not-allowed")}
            disabled
          />
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)] pl-1 mt-1">
          Calculated from quantity × rate
          {calculatedOrderValue > 0 && (
            <span className="ml-1 font-medium text-[var(--primary)]">
              ({productQuantity.toLocaleString('en-IN')} × {formatINR(unitRate)} = {formatINR(calculatedOrderValue)})
            </span>
          )}
        </p>
      </Field>

      <Field label="Payment Terms">
        <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
          <SelectTrigger className={cn(inputClass, "cursor-pointer")}><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-[10px]">
            {["Full Advance", "50% Advance", "On Delivery", "Credit"].map((t) => <SelectItem key={t} value={t} className="rounded-[8px]">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <AnimatePresence>
        {form.payment_terms === "Credit" && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Field label="Credit Period (Days)">
              <NumericInput value={form.credit_days} onValueChange={(v) => setForm({ ...form, credit_days: v })} placeholder="30" allowDecimal={false} className={inputClass} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GST Toggle */}
      <div className="flex items-center justify-between p-3 rounded-[10px] bg-[var(--muted)]">
        <span className="text-[14px] font-medium text-[var(--foreground)]">GST Applicable</span>
        <button type="button" onClick={() => setForm({ ...form, gst_applicable: !form.gst_applicable })}
          className={cn("w-[51px] h-[31px] rounded-full transition-colors relative cursor-pointer", form.gst_applicable ? "bg-[var(--erp-success)]" : "bg-[var(--accent)]")}
        >
          <motion.div className="w-[27px] h-[27px] rounded-full bg-white shadow-md absolute top-[2px]" animate={{ x: form.gst_applicable ? 22 : 2 }} transition={{ type: "spring", stiffness: 700, damping: 30 }} />
        </button>
      </div>

      <AnimatePresence>
        {form.gst_applicable && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Field label="GST Rate">
              <Select value={form.gst_percent} onValueChange={(v) => setForm({ ...form, gst_percent: v })}>
                <SelectTrigger className={cn(inputClass, "cursor-pointer")}><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-[10px]">
                  {["5", "12", "18", "28"].map((r) => <SelectItem key={r} value={r} className="rounded-[8px]">{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Enhanced Summary Card ── */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4 space-y-2">
        <div className="flex justify-between text-[14px] text-[var(--muted-foreground)]">
          <span>Quantity</span>
          <span className="font-medium text-[var(--foreground)]">{productQuantity > 0 ? productQuantity.toLocaleString('en-IN') : '—'} {productUnit}</span>
        </div>
        <div className="flex justify-between text-[14px] text-[var(--muted-foreground)]">
          <span>Rate</span>
          <span className="font-medium text-[var(--foreground)]">{unitRate > 0 ? `${formatINR(unitRate)} / ${productUnit}` : '—'}</span>
        </div>
        <div className="border-t border-[var(--border)] my-1" />
        <div className="flex justify-between text-[14px] text-[var(--muted-foreground)]">
          <span>Subtotal</span><span className="font-medium text-[var(--foreground)]">{subtotal > 0 ? formatINR(subtotal) : '₹0'}</span>
        </div>
        {form.gst_applicable && (
          <div className="flex justify-between text-[14px] text-[var(--muted-foreground)]">
            <span>GST ({gstPct}%)</span><span className="font-medium text-[var(--foreground)]">{formatINR(gstAmt)}</span>
          </div>
        )}
        <div className="border-t border-[var(--border)] pt-2 flex justify-between text-[16px] font-bold text-[var(--foreground)]">
          <span>Grand Total</span><span>{grandTotal > 0 ? formatINR(grandTotal) : '₹0'}</span>
        </div>
      </div>
    </motion.div>
  );
}


// ═════════════════════════════════════════════════════════════
// STEP 3: Production Setup (Optional) — Multi Machine+Operator
// ═════════════════════════════════════════════════════════════
export function StepProduction({
  form, setForm, machines, employees,
}: { form: any; setForm: (f: any) => void; machines: any[]; employees: any[] }) {
  const productionStaff = employees.filter((e) => e.department === "Production" || e.department === "General");

  const assignments: Array<{ id: string; machineId: string; machineName: string; operatorId: string; operatorName: string }> =
    form.productionAssignments || [{ id: crypto.randomUUID(), machineId: "", machineName: "", operatorId: "", operatorName: "" }];

  const updateAssignment = (id: string, field: string, value: string) => {
    const updated = assignments.map((a) => {
      if (a.id !== id) return a;
      if (field === "machineId") {
        const m = machines.find((x) => x.id === value);
        return { ...a, machineId: value, machineName: m?.machineName || "" };
      }
      if (field === "operatorId") {
        const e = employees.find((x) => x.id === value);
        return { ...a, operatorId: value, operatorName: e?.fullName || "" };
      }
      return { ...a, [field]: value };
    });
    setForm({ ...form, productionAssignments: updated });
  };

  const addRow = () => {
    setForm({
      ...form,
      productionAssignments: [...assignments, { id: crypto.randomUUID(), machineId: "", machineName: "", operatorId: "", operatorName: "" }],
    });
  };

  const removeRow = (id: string) => {
    if (assignments.length <= 1) return;
    setForm({
      ...form,
      productionAssignments: assignments.filter((a) => a.id !== id),
    });
  };

  // Check for duplicate pairs
  const pairs = assignments.map((a) => `${a.machineId}:${a.operatorId}`);
  const hasDuplicates = assignments.some((a) => a.machineId && a.operatorId) && pairs.length !== new Set(pairs).size;

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-[12px] bg-[var(--muted)] border border-[var(--border)]">
        <div>
          <p className="text-[15px] font-semibold text-[var(--foreground)]">Set up production now</p>
          <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">You can also do this later from Production Floor</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, setup_production: !form.setup_production })}
          className={cn(
            "relative shrink-0 w-[51px] h-[31px] rounded-full transition-colors cursor-pointer p-0 overflow-hidden",
            form.setup_production ? "bg-[var(--erp-success)]" : "bg-[var(--accent)]"
          )}
        >
          <motion.div
            className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-md"
            animate={{ x: form.setup_production ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {form.setup_production && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
            {/* Machine + Operator Rows */}
            {assignments.map((row, idx) => (
              <div
                key={row.id}
                className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Assignment {idx + 1}
                  </span>
                  {assignments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-[rgba(255,59,48,0.1)] transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 text-[var(--destructive)]" />
                    </button>
                  )}
                </div>

                <Field label="Machine / Equipment">
                  <Select value={row.machineId} onValueChange={(v) => updateAssignment(row.id, "machineId", v)}>
                    <SelectTrigger className={cn(inputClass, "cursor-pointer")}><SelectValue placeholder="Select machine" /></SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {machines.map((m) => <SelectItem key={m.id} value={m.id} className="rounded-[8px]">{m.machineName}{m.machineType ? ` (${m.machineType})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Assigned Operator">
                  <Select value={row.operatorId} onValueChange={(v) => updateAssignment(row.id, "operatorId", v)}>
                    <SelectTrigger className={cn(inputClass, "cursor-pointer")}><SelectValue placeholder="Select operator" /></SelectTrigger>
                    <SelectContent className="rounded-[10px]">
                      {productionStaff.map((e) => <SelectItem key={e.id} value={e.id} className="rounded-[8px]">{e.fullName} — {e.department}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ))}

            {/* Duplicate warning */}
            {hasDuplicates && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[rgba(255,59,48,0.06)] text-[var(--destructive)] text-[13px]">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">Duplicate machine + operator pair detected</span>
              </div>
            )}

            {/* Add Another Machine button */}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-[13px] text-[var(--primary)] font-medium hover:underline cursor-pointer"
            >
              <span className="text-[16px] leading-none">+</span> Add Another Machine
            </button>

            {/* Start date — single for the whole production */}
            <Field label="Target Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={cn(inputClass, "cursor-pointer")} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// STEP 4: Materials Required (Optional)
// ═════════════════════════════════════════════════════════════

interface SelectedMaterialEntry {
  inventoryItemId: string;
  itemName: string;
  quantityRequired: number;
  unit: string;
  currentStock: number;
  purchase_cost_per_unit: number;
}

interface InventorySearchItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchase_cost_per_unit: number;
  item_type?: string;
}

export function StepMaterials({
  form, setForm, inventoryItems, onSkip,
}: {
  form: { materials: SelectedMaterialEntry[]; [key: string]: unknown };
  setForm: (f: any) => void;
  inventoryItems: InventorySearchItem[];
  onSkip: () => void;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Debounce 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchResults = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    const selectedIds = new Set(form.materials.map((m: SelectedMaterialEntry) => m.inventoryItemId));
    return inventoryItems
      .filter((item: InventorySearchItem) => item.name.toLowerCase().includes(q) && !selectedIds.has(item.id))
      .slice(0, 8);
  }, [debouncedQuery, inventoryItems, form.materials]);

  const addMaterial = (item: InventorySearchItem) => {
    const entry: SelectedMaterialEntry = {
      inventoryItemId: item.id,
      itemName: item.name,
      quantityRequired: 1,
      unit: item.unit,
      currentStock: item.quantity,
      purchase_cost_per_unit: item.purchase_cost_per_unit || 0,
    };
    setForm({ ...form, materials: [...form.materials, entry] });
    setSearchQuery("");
    setShowDropdown(false);
  };

  const removeMaterial = (id: string) => {
    setForm({ ...form, materials: form.materials.filter((m: SelectedMaterialEntry) => m.inventoryItemId !== id) });
  };

  const updateQuantity = (id: string, qty: number) => {
    setForm({
      ...form,
      materials: form.materials.map((m: SelectedMaterialEntry) =>
        m.inventoryItemId === id ? { ...m, quantityRequired: qty } : m
      ),
    });
  };

  return (
    <motion.div {...fadeIn} className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[17px] font-semibold text-[var(--foreground)]">Materials Required</p>
        <p className="text-[13px] text-[var(--muted-foreground)] mt-0.5">Select raw materials needed for this order</p>
      </div>

      {/* Search */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className={cn(inputClass, "pl-10")}
          />
        </div>

        {/* Dropdown results */}
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute z-20 top-[48px] left-0 right-0 max-h-[200px] overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-lg"
            >
              {searchResults.map((item: InventorySearchItem) => {
                const outOfStock = item.quantity <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addMaterial(item)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 flex items-center justify-between text-[14px] transition-colors cursor-pointer",
                      "hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-0",
                      outOfStock ? "opacity-50" : "text-[var(--foreground)]"
                    )}
                  >
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{item.name}</span>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        Stock: {item.quantity} {item.unit}
                      </span>
                    </div>
                    {outOfStock && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,59,48,0.1)] text-[var(--destructive)] font-semibold whitespace-nowrap ml-2">
                        Out of stock
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected materials list */}
      {form.materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-[48px] h-[48px] rounded-[12px] bg-[var(--muted)] flex items-center justify-center mb-3">
            <Layers className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-[15px] font-medium text-[var(--muted-foreground)]">No materials added yet</p>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-1">Materials can also be added later from Production Floor</p>
        </div>
      ) : (
        <div className="space-y-2">
          {form.materials.map((mat: SelectedMaterialEntry) => {
            const overStock = mat.quantityRequired > mat.currentStock;
            return (
              <div
                key={mat.inventoryItemId}
                className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[var(--foreground)] truncate">{mat.itemName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] font-medium whitespace-nowrap">
                        Material
                      </span>
                      {mat.currentStock === -1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,59,48,0.1)] text-[var(--destructive)] font-semibold whitespace-nowrap">
                          Not in inventory
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-[var(--muted-foreground)] mt-0.5 block">
                      {mat.currentStock === -1 ? "Item not found in current inventory" : `Available: ${mat.currentStock} ${mat.unit}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMaterial(mat.inventoryItemId)}
                    className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-[rgba(255,59,48,0.1)] transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 text-[var(--destructive)]" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <NumericInput
                    value={String(mat.quantityRequired)}
                    onValueChange={(v) => updateQuantity(mat.inventoryItemId, v === "" ? 0 : Number(v))}
                    placeholder="0"
                    allowDecimal={false}
                    min={0}
                    className={cn(inputClass, "w-[100px] text-center")}
                  />
                  <span className="text-[13px] text-[var(--muted-foreground)] font-medium">{mat.unit}</span>
                  {overStock && (
                    <div className="flex items-center gap-1 text-[var(--erp-warning)] ml-auto">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium">Exceeds stock</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skip link */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onSkip}
          className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)] font-medium cursor-pointer transition-colors"
        >
          Skip this step →
        </button>
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════
// STEP 5: Review & Confirm
// ═════════════════════════════════════════════════════════════
export function StepReview({ form, clients, machines }: { form: any; clients: any[]; machines: any[] }) {
  const client = clients.find((c) => c.id === form.client_id);
  const orderVal = Number(form.order_value) || 0;
  const gstPct = form.gst_applicable ? (Number(form.gst_percent) || 0) : 0;
  const gstAmt = orderVal * gstPct / 100;
  const total = orderVal + gstAmt;

  const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-[13px] text-[var(--muted-foreground)]">{label}</span>
      <span className={cn("text-[14px] font-medium", accent ? "text-[var(--primary)]" : "text-[var(--foreground)]")}>{value}</span>
    </div>
  );

  return (
    <motion.div {...fadeIn} className="space-y-4">
      {/* Client & Product */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4">
        <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Client & Product</p>
        <Row label="Client" value={form.new_client_name || client?.name || "—"} accent />
        <Row label="Product" value={form.product_name || "—"} />
        <Row label="Quantity" value={`${form.quantity || 0} ${form.unit}`} />
        <Row label="Due Date" value={form.delivery_date ? new Date(form.delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
      </div>

      {/* Financials */}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4">
        <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Financials</p>
        {(Number(form.unit_rate) || 0) > 0 && (
          <Row label={`Rate Per ${(form.unit || 'unit').toUpperCase()}`} value={`\u20B9${Number(form.unit_rate).toLocaleString("en-IN")} / ${(form.unit || 'unit').toUpperCase()}`} />
        )}
        <Row label="Subtotal" value={`\u20B9${orderVal.toLocaleString("en-IN")}`} />
        {form.gst_applicable && <Row label={`GST (${gstPct}%)`} value={`\u20B9${gstAmt.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />}
        <Row label="Total Amount" value={`\u20B9${total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} accent />
        <Row label="Payment Terms" value={form.payment_terms} />
        {form.payment_terms === "Credit" && <Row label="Credit Period" value={`${form.credit_days || 0} days`} />}
      </div>

      {/* Production (if set up) */}
      {form.setup_production && (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Production Setup</p>
          {(form.productionAssignments || [])
            .filter((a: any) => a.machineId || a.operatorId)
            .map((a: any, idx: number) => (
              <div key={a.id || idx} className="py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-[var(--muted-foreground)]">Machine {idx + 1}</span>
                  <span className="text-[14px] font-medium text-[var(--foreground)]">{a.machineName || "—"}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-[13px] text-[var(--muted-foreground)]">Operator {idx + 1}</span>
                  <span className="text-[14px] font-medium text-[var(--foreground)]">{a.operatorName || "—"}</span>
                </div>
              </div>
            ))}
          <Row label="Start Date" value={form.start_date ? new Date(form.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
        </div>
      )}

      {/* Materials (if selected) */}
      {Array.isArray(form.materials) && form.materials.length > 0 && (
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Materials</p>
          {form.materials.map((m: { inventoryItemId: string; itemName: string; quantityRequired: number; unit: string }) => (
            <Row key={m.inventoryItemId} label={m.itemName} value={`${m.quantityRequired} ${m.unit}`} />
          ))}
        </div>
      )}

      {/* ── Profit Estimate Card ── */}
      {(() => {
        const ov = Number(form.order_value) || 0;
        if (ov <= 0) return null;

        const mats: Array<{ itemName: string; quantityRequired: number; purchase_cost_per_unit: number }> =
          Array.isArray(form.materials) ? form.materials : [];

        if (mats.length === 0) {
          return (
            <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--muted)] p-4 text-center">
              <p className="text-[13px] text-[var(--muted-foreground)] italic">Add materials to see profit estimate</p>
            </div>
          );
        }

        const totalMaterialCost = Math.round(
          mats.reduce((acc: number, m) => acc + m.quantityRequired * (m.purchase_cost_per_unit || 0), 0) * 100
        ) / 100;
        const labourCost = Number(form.labour_cost) || 0;
        const overheadCost = Number(form.overhead_cost) || 0;
        const otherCost = Number(form.other_cost) || 0;
        const totalCost = totalMaterialCost + labourCost + overheadCost + otherCost;
        const grossProfit = Math.round((ov - totalCost) * 100) / 100;
        const marginPercent = Math.round((grossProfit / ov) * 1000) / 10;
        const isPositive = grossProfit > 0;
        const profitColor = isPositive ? "var(--erp-success)" : "var(--destructive)";

        const materialBreakdown = mats
          .map((m) => `${m.itemName} \u2014 \u20B9${Math.round(m.quantityRequired * (m.purchase_cost_per_unit || 0)).toLocaleString("en-IN")}`)
          .join("  |  ");

        return (
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--muted)] p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
              <div>
                <p className="text-[13px] font-bold text-[var(--foreground)]">Profit Estimate</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">Based on selected material costs</p>
              </div>
            </div>

            {/* Row 1: Order Value */}
            <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
              <span className="text-[13px] text-[var(--muted-foreground)]">Order Value</span>
              <span className="text-[14px] font-medium text-[var(--foreground)]">{"\u20B9"}{ov.toLocaleString("en-IN")}</span>
            </div>

            {/* Row 2: Total Cost */}
            <div className="py-2 border-b border-[var(--border)]">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--muted-foreground)]">Total Cost</span>
                <span className="text-[14px] font-medium" style={{ color: "var(--erp-warning)" }}>{"\u20B9"}{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-1 truncate" title={materialBreakdown}>
                Materials: {"\u20B9"}{totalMaterialCost.toLocaleString("en-IN")}{labourCost + overheadCost + otherCost > 0 ? `  |  Other: \u20B9${(labourCost + overheadCost + otherCost).toLocaleString("en-IN")}` : ""}
              </p>
            </div>

            {/* Row 3: Gross Profit */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-[13px] font-semibold text-[var(--foreground)]">Gross Profit</span>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {!isPositive && <AlertTriangle className="h-3.5 w-3.5" style={{ color: profitColor }} />}
                  <span className="text-[16px] font-bold" style={{ color: profitColor }}>
                    {"\u20B9"}{Math.abs(grossProfit).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    {grossProfit < 0 && " loss"}
                  </span>
                </div>
                <span className="text-[11px] font-medium" style={{ color: profitColor }}>
                  {marginPercent}% margin
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
}
