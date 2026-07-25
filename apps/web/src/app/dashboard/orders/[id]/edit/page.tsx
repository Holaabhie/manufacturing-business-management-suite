"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronDown,
  Package,
  Layers,
  IndianRupee,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  ClipboardList,
  Calculator,
  TrendingUp,
  Info,
  Save,
  X,
  User,
  Calendar,
  Hash,
  Settings2,
} from "lucide-react";
import { useClients, useInventory, useUpdateOrder } from "@/lib/hooks/use-orders";

// ─── Types ─────────────────────────────────────────────────────────

interface EditableMaterial {
  _id?: string;
  inventoryItemId: string;
  itemName: string;
  quantityRequired: number;
  unit: string;
  purchase_cost_per_unit: number;
}

interface EditFormData {
  client_id: string;
  product_name: string;
  quantity: string;
  unit: string;
  rate: string;
  delivery_date: string;
  status: string;
  payment_status: string;
  priority: string;
  notes: string;
  tax: string;
  labour_cost: string;
  overhead_cost: string;
  other_cost: string;
  materials: EditableMaterial[];
}

interface FieldErrors {
  [key: string]: string;
}

// ─── Adapters ──────────────────────────────────────────────────────

function hydrateFormData(order: any): EditFormData {
  const materials: EditableMaterial[] = (order.materials ?? []).map((m: any) => ({
    _id: m._id ?? m.inventoryItemId ?? undefined,
    inventoryItemId: m.inventoryItemId ?? "",
    itemName: m.itemName ?? "",
    quantityRequired: Number(m.quantityRequired) || 0,
    unit: m.unit ?? "",
    purchase_cost_per_unit: Number(m.purchase_cost_per_unit) || 0,
  }));

  return {
    client_id: order.clientId ?? "",
    product_name: order.productName ?? "",
    quantity: order.quantity != null ? String(order.quantity) : "",
    unit: order.unit ?? "kg",
    rate: order.rate != null ? String(order.rate) : "",
    delivery_date: order.deliveryDate
      ? new Date(order.deliveryDate).toISOString().split("T")[0]
      : "",
    status: order.status ?? "pending",
    payment_status: order.paymentStatus ?? "pending",
    priority: order.priority ?? "normal",
    notes: order.notes ?? "",
    tax: "0",
    labour_cost: order.labourCost != null ? String(order.labourCost) : "0",
    overhead_cost: order.overheadCost != null ? String(order.overheadCost) : "0",
    other_cost: order.machineryCost != null ? String(order.machineryCost) : "0",
    materials,
  };
}

function buildSubmitPayload(formData: EditFormData): Record<string, unknown> {
  const qty = parseNumericValue(formData.quantity);
  const rate = parseNumericValue(formData.rate);
  const tax = parseNumericValue(formData.tax);
  const totalAmount = qty * rate * (1 + tax / 100);

  const materialCost = formData.materials.reduce(
    (sum, m) => sum + m.quantityRequired * m.purchase_cost_per_unit,
    0,
  );

  return {
    client_id: formData.client_id,
    product_name: formData.product_name,
    quantity: qty,
    unit: formData.unit,
    rate,
    total_amount: Math.round(totalAmount * 100) / 100,
    delivery_date: formData.delivery_date || null,
    status: formData.status,
    payment_status: formData.payment_status,
    material_cost: Math.round(materialCost * 100) / 100,
    labour_cost: parseNumericValue(formData.labour_cost),
    overhead_cost: parseNumericValue(formData.overhead_cost),
    machinery_cost: parseNumericValue(formData.other_cost),
    materials: formData.materials.map((m) => ({
      inventoryItemId: m.inventoryItemId,
      itemName: m.itemName,
      quantityRequired: m.quantityRequired,
      unit: m.unit,
    })),
    estimated_material_cost: Math.round(materialCost * 100) / 100,
    priority: formData.priority,
    notes: formData.notes,
  };
}

// ─── Animation Variants ────────────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.06 },
  }),
};

const materialRowVariants = {
  initial: { opacity: 0, height: 0, marginBottom: 0 },
  animate: { opacity: 1, height: "auto", marginBottom: 8, transition: { duration: 0.15 } },
  exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.15 } },
};

// ─── Section Card ──────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  label,
  children,
  index,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="mb-4 bg-card/70 backdrop-blur-sm border border-border rounded-[20px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center gap-2 pb-3.5 mb-4 border-b border-border">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          {label}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Field Wrapper ─────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs flex items-center gap-1 text-destructive"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Input Styles ──────────────────────────────────────────────────

const inputStyles =
  "h-[42px] md:h-[42px] rounded-[10px] text-sm transition-colors duration-150 " +
  "bg-background border border-border text-foreground " +
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 " +
  "placeholder:text-muted-foreground";

const readonlyInputStyles =
  "h-[42px] rounded-[10px] text-sm cursor-default " +
  "bg-muted border border-border text-muted-foreground";

const errorInputStyles = "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20";

// ─── Shake animation ───────────────────────────────────────────────

const shakeKeyframes = {
  x: [0, -4, 4, -4, 4, -2, 2, 0],
  transition: { duration: 0.3 },
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // ─── Data Fetching ──────────────────────────────────────
  const [order, setOrder] = useState<any>(null);
  const [pageState, setPageState] = useState<"loading" | "not-found" | "ready" | "error">("loading");
  const { data: clients = [] } = useClients();
  const { data: inventoryItems = [] } = useInventory();
  const updateOrder = useUpdateOrder();

  // ─── Form State (single source of truth) ────────────────
  const [formData, setFormData] = useState<EditFormData>({
    client_id: "",
    product_name: "",
    quantity: "",
    unit: "kg",
    rate: "",
    delivery_date: "",
    status: "pending",
    payment_status: "pending",
    priority: "normal",
    notes: "",
    tax: "0",
    labour_cost: "0",
    overhead_cost: "0",
    other_cost: "0",
    materials: [],
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [shakeField, setShakeField] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const initialSnapshot = useRef<string>("");
  const formHydrated = useRef(false);

  // ─── Sidebar collapse state (mobile) ────────────────────
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // ─── Fetch Order ────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function loadOrder() {
      try {
        const res = await fetch(`/api/v1/orders/${orderId}`, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 404) { setPageState("not-found"); return; }
          throw new Error("Failed to load order");
        }
        const json = await res.json();
        const orderData = json.data ?? json;
        if (cancelled) return;

        setOrder(orderData);
        const hydrated = hydrateFormData(orderData);
        setFormData(hydrated);
        initialSnapshot.current = JSON.stringify(hydrated);
        formHydrated.current = true;
        setPageState("ready");
      } catch {
        if (!cancelled) setPageState("error");
      }
    }

    loadOrder();
    return () => { cancelled = true; };
  }, [orderId]);

  // ─── Enrich material costs from inventory data ──────────
  useEffect(() => {
    if (!order?.materials?.length || !inventoryItems?.length || !formHydrated.current) return;
    setFormData((prev) => {
      const enriched = prev.materials.map((m) => {
        if (m.purchase_cost_per_unit > 0) return m; // already populated
        const inv = inventoryItems.find((i: any) => i.id === m.inventoryItemId);
        if (!inv) {
          console.warn(`[EditOrder] No inventory match for inventoryItemId: ${m.inventoryItemId}`);
          return m;
        }
        return { ...m, purchase_cost_per_unit: Number(inv.purchase_cost_per_unit || 0) };
      });
      if (JSON.stringify(enriched) === JSON.stringify(prev.materials)) return prev;
      return { ...prev, materials: enriched };
    });
  }, [order, inventoryItems]);

  // ─── Dirty State ────────────────────────────────────────
  const isDirty = useMemo(
    () => formHydrated.current && JSON.stringify(formData) !== initialSnapshot.current,
    [formData],
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ─── Computed Values (all from formData ONLY) ───────────
  const qty = parseNumericValue(formData.quantity);
  const rate = parseNumericValue(formData.rate);
  const tax = parseNumericValue(formData.tax);

  const calculatedTotal = useMemo(() => qty * rate * (1 + tax / 100), [qty, rate, tax]);

  const totalMaterialCost = useMemo(
    () =>
      formData.materials.reduce(
        (sum, m) => sum + m.quantityRequired * m.purchase_cost_per_unit,
        0,
      ),
    [formData.materials],
  );

  const labourCost = parseNumericValue(formData.labour_cost);
  const overheadCost = parseNumericValue(formData.overhead_cost);
  const otherCost = parseNumericValue(formData.other_cost);
  const totalCost = totalMaterialCost + labourCost + overheadCost + otherCost;
  const profit = calculatedTotal - totalCost;
  const margin = calculatedTotal > 0 ? (profit / calculatedTotal) * 100 : 0;

  // ─── Total pulse animation ─────────────────────────────
  const [totalPulse, setTotalPulse] = useState(false);
  const prevTotal = useRef(calculatedTotal);
  useEffect(() => {
    if (prevTotal.current !== calculatedTotal && formHydrated.current) {
      setTotalPulse(true);
      const t = setTimeout(() => setTotalPulse(false), 200);
      prevTotal.current = calculatedTotal;
      return () => clearTimeout(t);
    }
  }, [calculatedTotal]);

  // ─── Form Helpers ───────────────────────────────────────
  const updateField = useCallback(
    <K extends keyof EditFormData>(field: K, value: EditFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  // ─── Material Handlers ─────────────────────────────────
  const addMaterial = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          inventoryItemId: "",
          itemName: "",
          quantityRequired: 0,
          unit: "",
          purchase_cost_per_unit: 0,
        },
      ],
    }));
  }, []);

  const removeMaterial = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  }, []);

  const updateMaterial = useCallback(
    (index: number, field: keyof EditableMaterial, value: string | number) => {
      setFormData((prev) => {
        const mats = [...prev.materials];
        mats[index] = { ...mats[index], [field]: value };
        return { ...prev, materials: mats };
      });
      // Clear material-level errors
      setErrors((prev) => {
        const key = `materials.${index}.${field}`;
        if (prev[key]) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  const handleMaterialSelect = useCallback(
    (index: number, itemId: string) => {
      const item = inventoryItems.find((i: any) => i.id === itemId);
      if (!item) return;
      setFormData((prev) => {
        const mats = [...prev.materials];
        mats[index] = {
          ...mats[index],
          inventoryItemId: itemId,
          itemName: item.name || "",
          unit: item.unit || "",
          purchase_cost_per_unit: Number(item.purchase_cost_per_unit || 0),
        };
        return { ...prev, materials: mats };
      });
    },
    [inventoryItems],
  );

  // ─── Validation ─────────────────────────────────────────
  const validate = useCallback((): FieldErrors => {
    const errs: FieldErrors = {};
    if (!formData.product_name.trim()) errs.product_name = "Order name is required";
    if (!formData.client_id) errs.client_id = "Customer is required";
    if (!formData.delivery_date) errs.delivery_date = "Order date is required";
    if (parseNumericValue(formData.quantity) <= 0) errs.quantity = "Quantity must be greater than 0";
    if (parseNumericValue(formData.rate) < 0) errs.rate = "Unit price cannot be negative";

    if (formData.materials.length === 0) {
      errs.materials = "At least 1 material is required";
    } else {
      formData.materials.forEach((m, i) => {
        if (!m.itemName.trim() && !m.inventoryItemId)
          errs[`materials.${i}.itemName`] = "Select a material";
        if (m.quantityRequired <= 0)
          errs[`materials.${i}.quantityRequired`] = "Quantity must be > 0";
      });
    }

    return errs;
  }, [formData]);

  // ─── Submit ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0];
      setShakeField(firstKey);
      setTimeout(() => setShakeField(null), 350);

      const errorEl = document.querySelector(`[data-field="${firstKey}"]`);
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = errorEl.querySelector("input, select, textarea") as HTMLElement;
        input?.focus();
      }
      return;
    }

    setSaving(true);
    const payload = buildSubmitPayload(formData);

    updateOrder.mutate(
      { id: orderId, payload },
      {
        onSuccess: () => {
          initialSnapshot.current = JSON.stringify(formData);
          router.push("/dashboard/orders");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update order");
        },
        onSettled: () => setSaving(false),
      },
    );
  }, [formData, orderId, validate, updateOrder, router]);

  // ─── Cancel ─────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      router.push("/dashboard/orders");
    }
  }, [isDirty, router]);

  // ─── Format helpers ─────────────────────────────────────
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  // ═══════ RENDER STATES ═══════

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Breadcrumb skeleton */}
          <div className="h-4 w-48 rounded-md bg-muted animate-pulse mb-6" />
          <div className="h-8 w-72 rounded-md bg-muted animate-pulse mb-8" />
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-[20px] animate-pulse bg-card/70"
                  style={{
                    height: i === 3 ? 240 : 160,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
            <div
              className="hidden lg:block w-[340px] rounded-[20px] animate-pulse flex-shrink-0 bg-card/70"
              style={{ height: 400 }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "not-found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            Order Not Found
          </h2>
          <p className="text-sm mb-6 text-muted-foreground">
            This order doesn&apos;t exist or you don&apos;t have access.
          </p>
          <button
            onClick={() => router.push("/dashboard/orders")}
            className="h-10 px-6 rounded-[10px] text-sm font-semibold text-white cursor-pointer border-none bg-primary hover:bg-primary/90 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            Something Went Wrong
          </h2>
          <p className="text-sm mb-6 text-muted-foreground">
            Failed to load order. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-10 px-6 rounded-[10px] text-sm font-semibold text-white cursor-pointer border-none bg-primary hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ═══════ MAIN RENDER ═══════

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* ─── Page Title ─── */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Edit Order
            </h1>
            <p className="text-sm mt-1 text-muted-foreground">
              Update order details, materials, and pricing
            </p>
          </div>

          {/* ─── Split Panel Layout ─── */}
          <div className="flex flex-col lg:flex-row gap-6" ref={formRef}>
            {/* ═══ LEFT PANEL ═══ */}
            <div className="flex-1 min-w-0">
              {/* ─── Mobile/Tablet Summary Bar ─── */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-[16px] cursor-pointer border-none bg-card/90 backdrop-blur-md border border-border shadow-sm"
                >
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Total{" "}
                      <strong className="text-foreground">{"₹"}{fmt(calculatedTotal)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Cost{" "}
                      <strong className="text-foreground">{"₹"}{fmt(totalCost)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Profit{" "}
                      <strong className={profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                        {"₹"}{fmt(profit)}
                      </strong>
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                      sidebarExpanded && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence>
                  {sidebarExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <SidebarContent
                        calculatedTotal={calculatedTotal}
                        totalMaterialCost={totalMaterialCost}
                        totalCost={totalCost}
                        profit={profit}
                        margin={margin}
                        totalPulse={totalPulse}
                        fmt={fmt}
                        saving={saving}
                        onSubmit={handleSubmit}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── Section 1: Order Information ─── */}
              <SectionCard icon={ClipboardList} label="Order Information" index={0}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Order No." className="md:col-span-1">
                    <div className="relative">
                      <Hash
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      />
                      <Input
                        value={order?.orderNumber || order?.id || ""}
                        readOnly
                        className={cn(readonlyInputStyles, "pl-9")}
                      />
                    </div>
                  </Field>

                  <Field
                    label="Order Name"
                    required
                    error={errors.product_name}
                  >
                    <motion.div
                      data-field="product_name"
                      animate={shakeField === "product_name" ? shakeKeyframes : {}}
                    >
                      <div className="relative">
                        <Package
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"
                        />
                        <Input
                          value={formData.product_name}
                          onChange={(e) => updateField("product_name", e.target.value)}
                          placeholder="Product name..."
                          className={cn(inputStyles, "pl-9", errors.product_name && errorInputStyles)}
                        />
                      </div>
                    </motion.div>
                  </Field>

                  <Field
                    label="Customer"
                    required
                    error={errors.client_id}
                  >
                    <motion.div
                      data-field="client_id"
                      animate={shakeField === "client_id" ? shakeKeyframes : {}}
                    >
                      <div className="relative">
                        <User
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10 pointer-events-none text-primary"
                        />
                        <Select
                          value={formData.client_id}
                          onValueChange={(v) => updateField("client_id", v)}
                        >
                          <SelectTrigger
                            className={cn(inputStyles, "pl-9", errors.client_id && errorInputStyles)}
                          >
                            <SelectValue placeholder="Select customer..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-[10px]">
                            {clients.map((c: any) => (
                              <SelectItem key={c.id} value={c.id} className="rounded-[8px]">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  </Field>

                  <Field
                    label="Order Date"
                    required
                    error={errors.delivery_date}
                  >
                    <motion.div
                      data-field="delivery_date"
                      animate={shakeField === "delivery_date" ? shakeKeyframes : {}}
                    >
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary"
                        />
                        <Input
                          type="date"
                          value={formData.delivery_date}
                          onChange={(e) => updateField("delivery_date", e.target.value)}
                          className={cn(inputStyles, "pl-9", errors.delivery_date && errorInputStyles)}
                        />
                      </div>
                    </motion.div>
                  </Field>
                </div>
              </SectionCard>

              {/* ─── Section 2: Production Details ─── */}
              <SectionCard icon={Settings2} label="Production Details" index={1}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Target Quantity"
                    required
                    error={errors.quantity}
                  >
                    <motion.div
                      data-field="quantity"
                      animate={shakeField === "quantity" ? shakeKeyframes : {}}
                    >
                      <div className="flex">
                        <NumericInput
                          value={formData.quantity}
                          onValueChange={(v) => updateField("quantity", v)}
                          placeholder="0"
                          allowDecimal
                          min={0}
                          className={cn(
                            inputStyles,
                            "rounded-r-none border-r-0 flex-1",
                            errors.quantity && errorInputStyles,
                          )}
                        />
                        <div
                          className="h-[42px] px-3 flex items-center rounded-r-[10px] text-xs font-medium bg-muted text-muted-foreground border border-border border-l-0"
                        >
                          {formData.unit}
                        </div>
                      </div>
                    </motion.div>
                  </Field>

                  <Field
                    label="Unit Price"
                    required
                    error={errors.rate}
                  >
                    <motion.div
                      data-field="rate"
                      animate={shakeField === "rate" ? shakeKeyframes : {}}
                    >
                      <div className="relative">
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-muted-foreground"
                        >
                          {"₹"}
                        </span>
                        <NumericInput
                          value={formData.rate}
                          onValueChange={(v) => updateField("rate", v)}
                          placeholder="0.00"
                          allowDecimal
                          min={0}
                          className={cn(inputStyles, "pl-7", errors.rate && errorInputStyles)}
                        />
                      </div>
                    </motion.div>
                  </Field>

                  <Field label="Tax (%)">
                    <div className="flex">
                      <NumericInput
                        value={formData.tax}
                        onValueChange={(v) => updateField("tax", v)}
                        placeholder="0"
                        allowDecimal
                        min={0}
                        className={cn(inputStyles, "rounded-r-none border-r-0 flex-1")}
                      />
                      <div
                        className="h-[42px] px-3 flex items-center rounded-r-[10px] text-xs font-medium bg-muted text-muted-foreground border border-border border-l-0"
                      >
                        %
                      </div>
                    </div>
                  </Field>

                  <Field label="Total Amount">
                    <div
                      className="h-[42px] px-4 rounded-[10px] flex items-center text-sm font-semibold bg-primary/10 border border-primary/20 text-primary"
                    >
                      {"₹"}{fmt(calculatedTotal)}
                    </div>
                  </Field>
                </div>
              </SectionCard>

              {/* ─── Section 3: Materials ─── */}
              <SectionCard icon={Layers} label="Materials" index={2}>
                {errors.materials && (
                  <p className="text-xs mb-3 flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {errors.materials}
                  </p>
                )}

                {/* Table Header */}
                {formData.materials.length > 0 && (
                  <div
                    className="hidden md:grid gap-3 mb-2 px-1 text-[11px] font-bold uppercase text-muted-foreground tracking-wider"
                    style={{
                      gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr 40px",
                    }}
                  >
                    <span>Material</span>
                    <span>Required</span>
                    <span>Unit</span>
                    <span>Rate (INR)</span>
                    <span>Amount (INR)</span>
                    <span />
                  </div>
                )}

                {/* Material Rows */}
                <AnimatePresence initial={false}>
                  {formData.materials.map((mat, idx) => {
                    const amount = mat.quantityRequired * mat.purchase_cost_per_unit;
                    const nameError = errors[`materials.${idx}.itemName`];
                    const qtyError = errors[`materials.${idx}.quantityRequired`];

                    return (
                      <motion.div
                        key={mat._id ?? `new-${idx}`}
                        variants={materialRowVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                      >
                        {/* Desktop row */}
                        <div
                          className="hidden md:grid gap-3 items-start p-3 rounded-[12px] transition-colors hover:bg-primary/5"
                          style={{
                            gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr 40px",
                          }}
                        >
                          <div data-field={`materials.${idx}.itemName`}>
                            <Select
                              value={mat.inventoryItemId}
                              onValueChange={(v) => handleMaterialSelect(idx, v)}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-9 rounded-[8px] text-[13px]",
                                  inputStyles,
                                  nameError && errorInputStyles,
                                )}
                              >
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-[10px]">
                                {inventoryItems.map((item: any) => (
                                  <SelectItem key={item.id} value={item.id} className="rounded-[8px] text-[13px]">
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {nameError && (
                              <p className="text-[11px] mt-0.5 text-destructive">
                                {nameError}
                              </p>
                            )}
                          </div>
                          <div data-field={`materials.${idx}.quantityRequired`}>
                            <NumericInput
                              value={String(mat.quantityRequired || "")}
                              onValueChange={(v) =>
                                updateMaterial(idx, "quantityRequired", Number(v) || 0)
                              }
                              placeholder="0"
                              allowDecimal
                              min={0}
                              className={cn(
                                "h-9 rounded-[8px] text-[13px] text-center",
                                inputStyles,
                                qtyError && errorInputStyles,
                              )}
                            />
                            {qtyError && (
                              <p className="text-[11px] mt-0.5 text-destructive">
                                {qtyError}
                              </p>
                            )}
                          </div>
                          <Input
                            value={mat.unit}
                            readOnly
                            className={cn("h-9 rounded-[8px] text-[13px] text-center", readonlyInputStyles)}
                          />
                          <NumericInput
                            value={String(mat.purchase_cost_per_unit || "")}
                            onValueChange={(v) =>
                              updateMaterial(idx, "purchase_cost_per_unit", Number(v) || 0)
                            }
                            placeholder="0.00"
                            allowDecimal
                            min={0}
                            className={cn("h-9 rounded-[8px] text-[13px]", inputStyles)}
                          />
                          <div
                            className="h-9 px-3 rounded-[8px] flex items-center text-[13px] font-medium bg-muted text-muted-foreground"
                          >
                            {"₹"}{fmt(amount)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMaterial(idx)}
                            className="h-9 w-9 rounded-[8px] flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mobile row */}
                        <div
                          className="md:hidden p-3 rounded-[12px] space-y-3 bg-card/60 border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-muted-foreground">
                              Material {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMaterial(idx)}
                              className="h-8 w-8 rounded-[8px] flex items-center justify-center cursor-pointer border-none bg-transparent text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Select
                            value={mat.inventoryItemId}
                            onValueChange={(v) => handleMaterialSelect(idx, v)}
                          >
                            <SelectTrigger className={cn("h-12", inputStyles)}>
                              <SelectValue placeholder="Select material..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-[10px]">
                              {inventoryItems.map((item: any) => (
                                <SelectItem key={item.id} value={item.id} className="rounded-[8px]">
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Qty</span>
                              <NumericInput
                                value={String(mat.quantityRequired || "")}
                                onValueChange={(v) =>
                                  updateMaterial(idx, "quantityRequired", Number(v) || 0)
                                }
                                placeholder="0"
                                allowDecimal
                                min={0}
                                className={cn("h-12 text-center", inputStyles)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Rate</span>
                              <NumericInput
                                value={String(mat.purchase_cost_per_unit || "")}
                                onValueChange={(v) =>
                                  updateMaterial(idx, "purchase_cost_per_unit", Number(v) || 0)
                                }
                                placeholder="0"
                                allowDecimal
                                min={0}
                                className={cn("h-12 text-center", inputStyles)}
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Amount</span>
                              <div
                                className="h-12 rounded-[10px] flex items-center justify-center text-sm font-medium bg-muted text-muted-foreground"
                              >
                                {"₹"}{fmt(amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add Material Button */}
                <button
                  type="button"
                  onClick={addMaterial}
                  className="w-full mt-3 h-11 rounded-[12px] flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer border-2 border-dashed border-primary/30 bg-transparent text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4" />
                  Add Material
                </button>

                {/* Total Material Cost */}
                {formData.materials.length > 0 && (
                  <div className="flex justify-end mt-4 pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Total Material Cost:{" "}
                    </span>
                    <span className="text-lg font-semibold ml-2 text-primary">
                      {"₹"}{fmt(totalMaterialCost)}
                    </span>
                  </div>
                )}
              </SectionCard>

              {/* ─── Section 4: Cost & Pricing ─── */}
              <SectionCard icon={Calculator} label="Cost & Pricing" index={3}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Material Cost">
                    <div className={cn(readonlyInputStyles, "px-3 flex items-center")}>
                      <span className="text-sm mr-1 text-muted-foreground">{"₹"}</span>
                      {fmt(totalMaterialCost)}
                    </div>
                  </Field>

                  <Field label="Labour Cost">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-muted-foreground">{"₹"}</span>
                      <NumericInput
                        value={formData.labour_cost}
                        onValueChange={(v) => updateField("labour_cost", v)}
                        placeholder="0"
                        allowDecimal
                        min={0}
                        className={cn(inputStyles, "pl-7")}
                      />
                    </div>
                  </Field>

                  <Field label="Overhead Cost">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-muted-foreground">{"₹"}</span>
                      <NumericInput
                        value={formData.overhead_cost}
                        onValueChange={(v) => updateField("overhead_cost", v)}
                        placeholder="0"
                        allowDecimal
                        min={0}
                        className={cn(inputStyles, "pl-7")}
                      />
                    </div>
                  </Field>

                  <Field label="Other Cost">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-muted-foreground">{"₹"}</span>
                      <NumericInput
                        value={formData.other_cost}
                        onValueChange={(v) => updateField("other_cost", v)}
                        placeholder="0"
                        allowDecimal
                        min={0}
                        className={cn(inputStyles, "pl-7")}
                      />
                    </div>
                  </Field>
                </div>

                {/* Total Cost Row */}
                <div
                  className="flex justify-end mt-4 pt-3 border-t border-border"
                >
                  <span className="text-sm text-muted-foreground">
                    Total Cost:
                  </span>
                  <span className="text-lg font-bold ml-2 text-foreground">
                    {"₹"}{fmt(totalCost)}
                  </span>
                </div>
              </SectionCard>

              {/* ─── Bottom Action Bar ─── */}
              <div
                className="flex items-center justify-between py-4 mt-2 border-t border-border"
              >
                <span className="text-xs text-muted-foreground">
                  * Required fields
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="h-10 px-5 rounded-[10px] text-sm font-semibold transition-colors cursor-pointer border border-border bg-transparent text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="h-12 min-w-[160px] px-6 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-primary hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Push Updates
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT SIDEBAR (Desktop) ═══ */}
            <div className="hidden lg:block w-[340px] min-w-[300px] flex-shrink-0">
              <div className="sticky top-24">
                <SidebarContent
                  calculatedTotal={calculatedTotal}
                  totalMaterialCost={totalMaterialCost}
                  totalCost={totalCost}
                  profit={profit}
                  margin={margin}
                  totalPulse={totalPulse}
                  fmt={fmt}
                  saving={saving}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add bottom padding on mobile to account for nav */}
        <div className="lg:hidden h-24" />
      </div>

      {/* ─── Discard Changes Modal ─── */}
      <AnimatePresence>
        {showDiscardModal && (
          <>
            {/* BACKDROP — blur here ONLY */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
              onClick={() => setShowDiscardModal(false)}
            />

            {/* DIALOG — NO blur, solid surface, z-50 above backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(380px,90vw)] rounded-2xl p-6 bg-card border border-border shadow-xl"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-base font-bold mb-2 text-foreground">
                Discard changes?
              </h3>
              <p className="text-sm mb-6 leading-relaxed text-muted-foreground">
                You have unsaved changes. Are you sure you want to leave? Your edits will be lost.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscardModal(false)}
                  className="h-10 px-4 rounded-[10px] text-sm font-semibold cursor-pointer bg-muted border border-border text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardModal(false);
                    router.push("/dashboard/orders");
                  }}
                  className="h-10 px-4 rounded-[10px] text-sm font-semibold text-white cursor-pointer border-none bg-destructive hover:bg-destructive/90 transition-colors"
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

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════════════

function SidebarContent({
  calculatedTotal,
  totalMaterialCost,
  totalCost,
  profit,
  margin,
  totalPulse,
  fmt,
  saving,
  onSubmit,
}: {
  calculatedTotal: number;
  totalMaterialCost: number;
  totalCost: number;
  profit: number;
  margin: number;
  totalPulse: boolean;
  fmt: (n: number) => string;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      className="rounded-[20px] overflow-hidden bg-card/90 backdrop-blur-md border border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
    >
      {/* Calculated Total */}
      <div className="p-5">
        <p className="text-[10px] font-bold uppercase mb-1 text-muted-foreground tracking-widest">
          Calculated Total
        </p>
        <motion.p
          animate={totalPulse ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.2 }}
          className="text-[28px] font-bold text-foreground"
        >
          {"₹"}{fmt(calculatedTotal)}
        </motion.p>
        <p className="text-xs text-muted-foreground">
          (All inclusive)
        </p>
      </div>

      {/* Cost & Profit Summary */}
      <div className="px-5 pb-5 space-y-2.5 border-t border-border pt-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Material Cost</span>
          <span className="font-medium tabular-nums text-foreground">
            {"₹"}{fmt(totalMaterialCost)}
          </span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="font-medium tabular-nums text-foreground">
            {"₹"}{fmt(totalCost)}
          </span>
        </div>
        <div className="flex justify-between text-[13px] pt-2 border-t border-border">
          <span className="text-muted-foreground">Profit</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {"₹"}{fmt(profit)}
          </span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Margin</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {margin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Push Updates Button (desktop sidebar) */}
      <div className="p-5 border-t border-border">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="w-full h-12 rounded-[12px] text-sm font-bold text-white cursor-pointer border-none flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Push Updates
            </>
          )}
        </button>
      </div>
    </div>
  );
}
