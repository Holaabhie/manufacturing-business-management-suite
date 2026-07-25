"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, Check, ShoppingCart, IndianRupee, Cpu, ClipboardCheck, Layers, Info, X } from "lucide-react";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { StepClientProduct, StepFinancials, StepProduction, StepMaterials, StepReview } from "./steps";
import { parseNumericValue } from "@/components/ui/numeric-input";
import { useCachedPage } from "@/hooks/useCachedPage";
import { queryKeys, apiFetch } from "@/lib/hooks/use-orders";
import type { Order } from "@/modules/orders/domain/types";

// ─── Step metadata ───────────────────────────────────────────
const STEPS = [
  { label: "Client & Product", icon: ShoppingCart },
  { label: "Financials", icon: IndianRupee },
  { label: "Production", icon: Cpu },
  { label: "Materials", icon: Layers },
  { label: "Review", icon: ClipboardCheck },
];

// ─── Types ───────────────────────────────────────────────────
interface ProductionAssignment {
  id: string;
  machineId: string;
  machineName: string;
  operatorId: string;
  operatorName: string;
}

interface MaterialEntry {
  inventoryItemId: string;
  itemName: string;
  quantityRequired: number;
  unit: string;
  currentStock: number;
  purchase_cost_per_unit: number;
}

// ─── Initial form state ──────────────────────────────────────
const initialForm = {
  client_id: "", product_name: "", quantity: "", unit: "kg", delivery_date: "",
  order_value: "", unit_rate: "", payment_terms: "Full Advance", credit_days: "", gst_applicable: false, gst_percent: "18",
  setup_production: false, start_date: "",
  productionAssignments: [{ id: crypto.randomUUID(), machineId: "", machineName: "", operatorId: "", operatorName: "" }] as ProductionAssignment[],
  new_client_name: "", new_client_phone: "", new_client_email: "",
  materials: [] as MaterialEntry[],
};

// ─── Clone source metadata ───────────────────────────────
interface ClonedFromInfo {
  orderNumber?: string;
  orderId: string;
  createdAt: string;
  gstDerived?: boolean; // true when GST was inferred, not read from DB
}

export default function CreateOrderWizard() {
  const router = useRouter();
  const { restoreState, persist, clearPageState } = useCachedPage({
    pageKey: "create_order",
  });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Inline client creation state ──────────────────────────
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [clientSearch, setClientSearch] = useState("");

  // ─── Clone state ───────────────────────────────────────────
  const [clonedFrom, setClonedFrom] = useState<ClonedFromInfo | null>(null);
  const [cloningOrderId, setCloningOrderId] = useState<string | null>(null);
  const [showAllPrevious, setShowAllPrevious] = useState(false);
  const prevClientIdRef = useRef(form.client_id);

  // Restore state on mount
  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (typeof cached.step === "number") setStep(cached.step);
      if (cached.form) setForm(cached.form as typeof initialForm);
      if (cached.newClient) setNewClient(cached.newClient as typeof newClient);
      if (typeof cached.addingClient === "boolean") setAddingClient(cached.addingClient);
    }
  }, [restoreState]);

  // Persist state on change
  useEffect(() => {
    persist({
      step,
      form,
      newClient,
      addingClient,
    });
  }, [step, form, newClient, addingClient, persist]);

  // ─── Data fetching ─────────────────────────────────────────
  const [clients, setClients] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const [cRes, mRes, eRes, iRes] = await Promise.all([
      fetch("/api/clients", { credentials: "include" }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/machines", { credentials: "include" }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/employees", { credentials: "include" }).then((r) => r.ok ? r.json() : { employees: [] }).catch(() => ({ employees: [] })),
      fetch("/api/v1/inventory", { credentials: "include" }).then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
    ]);
    setClients(Array.isArray(cRes) ? cRes : []);
    setMachines(Array.isArray(mRes) ? mRes : []);
    const empList = eRes?.employees || (Array.isArray(eRes) ? eRes : []);
    setEmployees(empList);
    setInventoryItems(Array.isArray(iRes?.data) ? iRes.data : Array.isArray(iRes) ? iRes : []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Fetch recent orders for selected client ──────────────
  const { data: recentOrders } = useQuery<Order[]>({
    queryKey: queryKeys.ordersByClient(form.client_id),
    queryFn: () => apiFetch<Order[]>(`/api/v1/orders?clientId=${form.client_id}`),
    enabled: !!form.client_id && !addingClient,
    staleTime: 60_000,
  });

  // ─── Client-change guard: clear cloned data on client switch ─
  useEffect(() => {
    if (prevClientIdRef.current !== form.client_id && clonedFrom) {
      // Client changed after clone — reset cloned fields to prevent cross-client BOM leak
      setClonedFrom(null);
      setShowAllPrevious(false);
      setForm(prev => ({
        ...prev,
        product_name: initialForm.product_name,
        quantity: initialForm.quantity,
        unit: initialForm.unit,
        unit_rate: initialForm.unit_rate,
        order_value: initialForm.order_value,
        payment_terms: initialForm.payment_terms,
        credit_days: initialForm.credit_days,
        gst_applicable: initialForm.gst_applicable,
        gst_percent: initialForm.gst_percent,
        materials: initialForm.materials,
        notes: "",
      }));
      toast.info("Client changed — cloned template cleared");
    }
    prevClientIdRef.current = form.client_id;
  }, [form.client_id, clonedFrom]);

  // ─── Clone order handler ──────────────────────────────────
  const cloneOrder = useCallback(async (orderId: string) => {
    setCloningOrderId(orderId);
    try {
      const full = await apiFetch<Order>(`/api/v1/orders/${orderId}`);

      // Determine GST: prefer stored values, derive as fallback
      let gstApplicable = false;
      let gstPercent = "18";
      let gstDerived = false;

      if (full.gstApplicable != null) {
        // Stored in DB — use directly
        gstApplicable = full.gstApplicable;
        gstPercent = String(full.gstPercent ?? 18);
      } else if (full.totalTax > 0 && full.totalAmount > 0) {
        // Legacy fallback — derive from tax amounts, flag for review
        gstApplicable = true;
        const derivedRate = Math.round((full.totalTax / (full.totalAmount - full.totalTax)) * 100);
        gstPercent = [5, 12, 18, 28].includes(derivedRate) ? String(derivedRate) : "18";
        gstDerived = true;
      }

      // Map materials with fresh inventory data; keep missing items visible
      const clonedMaterials: MaterialEntry[] = [];
      const missingItems: string[] = [];

      if (Array.isArray(full.materials)) {
        for (const mat of full.materials) {
          const inventoryMatch = inventoryItems.find(
            (inv: { id: string }) => inv.id === mat.inventoryItemId
          );
          if (inventoryMatch) {
            clonedMaterials.push({
              inventoryItemId: mat.inventoryItemId,
              itemName: mat.itemName,
              quantityRequired: mat.quantityRequired,
              unit: mat.unit,
              currentStock: Number(inventoryMatch.quantity ?? 0),
              purchase_cost_per_unit: Number(inventoryMatch.purchase_cost_per_unit ?? 0),
            });
          } else {
            // Keep item visible with a "not in inventory" state
            clonedMaterials.push({
              inventoryItemId: mat.inventoryItemId,
              itemName: mat.itemName,
              quantityRequired: mat.quantityRequired,
              unit: mat.unit,
              currentStock: -1, // sentinel: signals "not found in inventory"
              purchase_cost_per_unit: 0,
            });
            missingItems.push(mat.itemName);
          }
        }
      }

      if (missingItems.length > 0) {
        toast.warning(
          `Materials not found in current inventory: ${missingItems.join(", ")}. Review before creating.`,
          { duration: 6000 }
        );
      }

      // Map into wizard form — DO NOT clone: delivery_date, status, timestamps, production
      setForm(prev => ({
        ...prev,
        product_name: full.productName || "",
        quantity: String(full.quantity || ""),
        unit: full.unit || "kg",
        unit_rate: String(full.rate || ""),
        order_value: "", // recalculated by StepFinancials from unit_rate × quantity
        payment_terms: full.paymentTerms || "Full Advance",
        credit_days: full.creditDays ? String(full.creditDays) : "",
        gst_applicable: gstApplicable,
        gst_percent: gstPercent,
        materials: clonedMaterials,
        // Explicitly NOT cloned:
        // delivery_date, start_date, setup_production, productionAssignments, status
      }));

      const createdDate = full.createdAt ? new Date(full.createdAt).toISOString() : new Date().toISOString();
      setClonedFrom({
        orderNumber: full.orderNumber,
        orderId: full.id,
        createdAt: createdDate,
        gstDerived,
      });

      toast.success("Order template loaded — review and edit before creating");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load order details";
      toast.error(message);
    } finally {
      setCloningOrderId(null);
    }
  }, [inventoryItems]);

  // ─── Validation per step ───────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.client_id && !addingClient) return "Please select a client";
      if (addingClient && !newClient.name.trim()) return "Client name is required";
      if (!form.product_name.trim()) return "Product name is required";
      if (!form.quantity || Number(form.quantity) <= 0) return "Quantity must be > 0";
    }
    if (s === 1) {
      if (!form.unit_rate || Number(form.unit_rate) <= 0) return `Enter valid rate per ${(form.unit || 'unit').toUpperCase()}`;
      if (!form.order_value || Number(form.order_value) <= 0) return "Order value is required";
      if (form.payment_terms === "Credit" && (!form.credit_days || Number(form.credit_days) <= 0)) return "Credit period is required";
    }
    // Step 2 (production) is optional — no validation needed
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1) Create client inline if needed
      let clientId = form.client_id;
      if (addingClient && newClient.name.trim()) {
        const cRes = await fetch("/api/clients", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClient.name.trim(), phone: newClient.phone, email: newClient.email }),
        });
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData.message || cData.error || "Failed to create client");
        clientId = cData.id;
      }

      // 2) Calculate totals
      const orderVal = parseNumericValue(form.order_value);
      const gstPct = form.gst_applicable ? parseNumericValue(form.gst_percent) : 0;
      const gstAmt = orderVal * gstPct / 100;
      const totalAmount = orderVal + gstAmt;
      const qty = parseNumericValue(form.quantity);

      // 3) Create order (with materials — deduction happens server-side)
      const orderPayload = {
        client_id: clientId,
        product_name: form.product_name,
        quantity: qty,
        unit: form.unit,
        rate: parseNumericValue(form.unit_rate) || (qty > 0 ? orderVal / qty : orderVal),
        total_amount: totalAmount,
        delivery_date: form.delivery_date || null,
        status: "pending",
        payment_status: form.payment_terms === "Full Advance" ? "pending" : "pending",
        payment_terms: form.payment_terms,
        credit_days: form.payment_terms === "Credit" ? parseNumericValue(form.credit_days) : null,
        gst_applicable: form.gst_applicable,
        gst_percent: form.gst_applicable ? gstPct : 0,
        gst_amount: gstAmt,
        materials: form.materials.map((m) => ({
          inventoryItemId: m.inventoryItemId,
          itemName: m.itemName,
          quantityRequired: m.quantityRequired,
          unit: m.unit,
        })),
        estimated_material_cost: Math.round(
          form.materials.reduce((acc, m) => acc + m.quantityRequired * (m.purchase_cost_per_unit || 0), 0) * 100
        ) / 100,
        estimated_gross_profit: Math.round(
          (orderVal - form.materials.reduce((acc, m) => acc + m.quantityRequired * (m.purchase_cost_per_unit || 0), 0)) * 100
        ) / 100,
        estimated_margin: orderVal > 0
          ? Math.round(((orderVal - form.materials.reduce((acc, m) => acc + m.quantityRequired * (m.purchase_cost_per_unit || 0), 0)) / orderVal) * 1000) / 10
          : 0,
      };

      const oRes = await fetch("/api/orders", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const oData = await oRes.json();
      if (!oRes.ok) throw new Error(oData.message || oData.error || "Failed to create order");
      const orderId = oData.id;

      // 4) Create production run if opted in — send assignments array
      if (form.setup_production && orderId) {
        const client = clients.find((c) => c.id === clientId);
        const validAssignments = form.productionAssignments.filter((a) => a.machineId && a.operatorId);
        await fetch("/api/production", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            orderProductName: form.product_name,
            orderQuantity: qty,
            clientName: client?.name || newClient.name || "",
            deliveryDate: form.delivery_date || null,
            productionAssignments: validAssignments.map((a) => ({
              machineId: a.machineId,
              machineName: a.machineName,
              operatorId: a.operatorId,
              operatorName: a.operatorName,
            })),
            expectedOutput: qty,
            startTime: form.start_date || new Date().toISOString(),
            targetCompletion: form.delivery_date || null,
            materials: form.materials.map((m) => ({
              inventoryId: m.inventoryItemId,
              name: m.itemName,
              quantityUsed: m.quantityRequired,
              unit: m.unit,
            })),
          }),
        });
      }

      toast.success("Order created successfully!");
      clearPageState();
      router.push("/dashboard/orders");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[34px] font-bold text-[var(--foreground)] leading-[41px] tracking-[0.37px]">New Order</h1>
        <p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px]">Create a new order with optional production setup.</p>
      </div>

      {/* ── Step indicator — Desktop ── */}
      <div className="hidden md:flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-[10px] transition-all",
                isActive ? "bg-[rgba(0,122,255,0.1)]" : "",
              )}>
                <div className={cn(
                  "w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-bold transition-all",
                  isDone ? "bg-[var(--erp-success)] text-white" :
                  isActive ? "bg-[var(--primary)] text-white" :
                  "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn("text-[13px] font-medium whitespace-nowrap",
                  isActive ? "text-[var(--primary)]" : isDone ? "text-[var(--erp-success)]" : "text-[var(--muted-foreground)]"
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-[2px] mx-2 rounded-full", isDone ? "bg-[var(--erp-success)]" : "bg-[var(--muted)]")} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step indicator — Mobile ── */}
      <div className="md:hidden mb-6 flex items-center justify-between px-1">
        <span className="text-[14px] font-semibold text-[var(--foreground)]">Step {step + 1} of {STEPS.length}</span>
        <span className="text-[13px] text-[var(--primary)] font-medium">{STEPS[step].label}</span>
      </div>

      {/* Progress bar — Mobile */}
      <div className="md:hidden mb-6 h-[3px] bg-[var(--muted)] rounded-full overflow-hidden">
        <motion.div className="h-full bg-[var(--primary)] rounded-full" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      {/* ── Template Loaded banner ── */}
      <AnimatePresence>
        {clonedFrom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] border border-[var(--primary)]/20 bg-[rgba(0,122,255,0.06)]">
              <Info className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--primary)]">
                  Order Template Loaded
                  {clonedFrom.orderNumber && <> — Source: Order #{clonedFrom.orderNumber}</>}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                  Created {(() => {
                    const days = Math.floor((Date.now() - new Date(clonedFrom.createdAt).getTime()) / 86400000);
                    return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
                  })()}
                  {clonedFrom.gstDerived && (
                    <span className="ml-2 text-[var(--erp-warning)] font-medium">· GST {form.gst_percent}% — verify</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClonedFrom(null)}
                className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center hover:bg-[rgba(0,122,255,0.1)] transition-colors cursor-pointer flex-shrink-0"
                aria-label="Dismiss template banner"
              >
                <X className="h-3.5 w-3.5 text-[var(--primary)]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step content ── */}
      <div className="glass-section rounded-[16px] p-5 md:p-6 border border-[var(--border)] bg-[var(--card)]">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            {step === 0 && (
              <StepClientProduct
                clients={clients} form={form} setForm={setForm}
                clientSearch={clientSearch} setClientSearch={setClientSearch}
                addingClient={addingClient} setAddingClient={setAddingClient}
                newClient={newClient} setNewClient={setNewClient}
                recentOrders={recentOrders}
                onClone={cloneOrder}
                cloningOrderId={cloningOrderId}
                showAllPrevious={showAllPrevious}
                setShowAllPrevious={setShowAllPrevious}
              />
            )}
            {step === 1 && <StepFinancials form={form} setForm={setForm} />}
            {step === 2 && <StepProduction form={form} setForm={setForm} machines={machines} employees={employees} />}
            {step === 3 && (
              <StepMaterials
                form={form}
                setForm={setForm}
                inventoryItems={inventoryItems}
                onSkip={() => setStep(4)}
              />
            )}
            {step === 4 && <StepReview form={form} clients={clients} machines={machines} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between mt-6 gap-3">
        {step > 0 ? (
          <IOSButton variant="gray" size="large" onClick={goBack} icon={<ChevronLeft className="h-4 w-4" />}>Back</IOSButton>
        ) : (
          <IOSButton variant="gray" size="large" onClick={() => router.push("/dashboard/orders")}>Cancel</IOSButton>
        )}

        {step < 4 ? (
          <IOSButton variant="filled" size="large" onClick={goNext} iconRight={<ChevronRight className="h-4 w-4" />}>Next</IOSButton>
        ) : (
          <IOSButton variant="filled" size="large" onClick={handleSubmit} loading={submitting} loadingText="Creating..."
            className="!bg-[#2563EB] text-white hover:!bg-[#1D51C8] dark:!bg-[#0A84FF] dark:hover:!bg-[#0070E0] dark:text-white glow-btn !bg-none shadow-none" icon={<Check className="h-4 w-4" />}
          >Create Order</IOSButton>
        )}
      </div>
    </div>
  );
}
