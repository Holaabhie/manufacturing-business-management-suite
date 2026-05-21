"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, Check, ShoppingCart, IndianRupee, Cpu, ClipboardCheck, Layers } from "lucide-react";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { StepClientProduct, StepFinancials, StepProduction, StepMaterials, StepReview } from "./steps";
import { parseNumericValue } from "@/components/ui/numeric-input";

// ─── Step metadata ───────────────────────────────────────────
const STEPS = [
  { label: "Client & Product", icon: ShoppingCart },
  { label: "Financials", icon: IndianRupee },
  { label: "Production", icon: Cpu },
  { label: "Materials", icon: Layers },
  { label: "Review", icon: ClipboardCheck },
];

// ─── Initial form state ──────────────────────────────────────
const initialForm = {
  client_id: "", product_name: "", quantity: "", unit: "kg", delivery_date: "",
  order_value: "", payment_terms: "Full Advance", credit_days: "", gst_applicable: false, gst_percent: "18",
  setup_production: false, machine_id: "", machine_name: "", operator_id: "", operator_name: "", start_date: "",
  new_client_name: "", new_client_phone: "", new_client_email: "",
  materials: [] as Array<{ inventoryItemId: string; itemName: string; quantityRequired: number; unit: string; currentStock: number; purchase_cost_per_unit: number }>,
};

export default function CreateOrderWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Inline client creation state ──────────────────────────
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "" });
  const [clientSearch, setClientSearch] = useState("");

  // ─── Data fetching ─────────────────────────────────────────
  const [clients, setClients] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const [cRes, mRes, eRes, iRes] = await Promise.all([
      fetch("/api/clients").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/machines").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/employees").then((r) => r.ok ? r.json() : { employees: [] }).catch(() => ({ employees: [] })),
      fetch("/api/v1/inventory").then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
    ]);
    setClients(Array.isArray(cRes) ? cRes : []);
    setMachines(Array.isArray(mRes) ? mRes : []);
    const empList = eRes?.employees || (Array.isArray(eRes) ? eRes : []);
    setEmployees(empList);
    setInventoryItems(Array.isArray(iRes?.data) ? iRes.data : Array.isArray(iRes) ? iRes : []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Validation per step ───────────────────────────────────
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.client_id && !addingClient) return "Please select a client";
      if (addingClient && !newClient.name.trim()) return "Client name is required";
      if (!form.product_name.trim()) return "Product name is required";
      if (!form.quantity || Number(form.quantity) <= 0) return "Quantity must be > 0";
    }
    if (s === 1) {
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
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClient.name.trim(), phone: newClient.phone, email: newClient.email }),
        });
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData.error || "Failed to create client");
        clientId = cData.id;
      }

      // 2) Calculate totals
      const orderVal = parseNumericValue(form.order_value);
      const gstPct = form.gst_applicable ? parseNumericValue(form.gst_percent) : 0;
      const gstAmt = orderVal * gstPct / 100;
      const totalAmount = orderVal + gstAmt;
      const qty = parseNumericValue(form.quantity);

      // 3) Create order
      const orderPayload = {
        client_id: clientId,
        product_name: form.product_name,
        quantity: qty,
        unit: form.unit,
        rate: qty > 0 ? orderVal / qty : orderVal,
        total_amount: totalAmount,
        delivery_date: form.delivery_date || null,
        status: "pending",
        payment_status: form.payment_terms === "Full Advance" ? "pending" : "pending",
        payment_terms: form.payment_terms,
        credit_days: form.payment_terms === "Credit" ? parseNumericValue(form.credit_days) : null,
        gst_applicable: form.gst_applicable,
        gst_percent: form.gst_applicable ? gstPct : 0,
        gst_amount: gstAmt,
        order_items: [],
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const oData = await oRes.json();
      if (!oRes.ok) throw new Error(oData.error || "Failed to create order");
      const orderId = oData.id;

      // 4) Create production run if opted in
      if (form.setup_production && orderId) {
        const client = clients.find((c) => c.id === clientId);
        await fetch("/api/production", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            orderProductName: form.product_name,
            orderQuantity: qty,
            clientName: client?.name || newClient.name || "",
            deliveryDate: form.delivery_date || null,
            machineId: form.machine_id,
            machineName: form.machine_name,
            operatorId: form.operator_id,
            operatorName: form.operator_name,
            expectedOutput: qty,
            startTime: form.start_date || new Date().toISOString(),
            targetCompletion: form.delivery_date || null,
            materials: [],
          }),
        });
      }

      toast.success("Order created successfully!");
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
            className="glow-btn !bg-none shadow-none" icon={<Check className="h-4 w-4" />}
          >Create Order</IOSButton>
        )}
      </div>
    </div>
  );
}
