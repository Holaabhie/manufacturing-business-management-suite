"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/LocaleProvider";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import {
    ChevronRight,
    ChevronLeft,
    Check,
    ShoppingCart,
    Settings,
    Sliders,
    Package,
    Cog,
    Search,
    AlertCircle,
    Calendar,
    Clock,
    User,
    Cpu,
    Plus,
    X,
    ArrowRight,
    Loader2,
    Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NumericInput } from "@/components/ui/numeric-input";
import { MaterialsStep } from "@/components/production/MaterialsStep";
import type { SelectedMaterial } from "@/lib/materials-types";

import type { ShiftType } from "@/lib/production-types";

// ─── Types ──────────────────────────────────────────────────────────
interface Order {
    id: string;
    product_name: string;
    productName?: string;
    quantity: number;
    delivery_date: string | null;
    deliveryDate?: string | null;
    status: string;
    client_id: string;
    clientId?: string;
    clients?: { name: string } | null;
    clientName?: string;
    createdAt?: string;
}

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    purchase_cost_per_unit?: number;
}

interface MachineData {
    id: string;
    machineName: string;
    machineType: string;
    capacity: string;
    status: "active" | "inactive" | "maintenance";
}

interface OperatorData {
    id: string;
    fullName: string;
    employeeId: string;
    department: string;
    designation: string;
    status: string;
}

interface ProductionSetupDraft {
    currentStep: number;
    selectedOrderId: string;
    orderSearchTerm: string;
    statusFilter: string;
    selectedMaterials: SelectedMaterial[];
    assignedMachines: { id: number; machineId: string; machineName: string }[];
    assignedOperators: { id: number; operatorId: string; operatorName: string }[];
    expectedOutput: string;
    startTime: string;
    shift: ShiftType;
    targetCompletion: string;
    notes: string;
    labourCost: number;
    overhead: number;
    saleValue: number;
}

const getDefaultDraft = (): ProductionSetupDraft => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultStartTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    return {
        currentStep: 1,
        selectedOrderId: "",
        orderSearchTerm: "",
        statusFilter: "all",
        selectedMaterials: [],
        assignedMachines: [{ id: Date.now(), machineId: "", machineName: "" }],
        assignedOperators: [{ id: Date.now(), operatorId: "", operatorName: "" }],
        expectedOutput: "",
        startTime: defaultStartTime,
        shift: "morning" as ShiftType,
        targetCompletion: "",
        notes: "",
        labourCost: 0,
        overhead: 0,
        saleValue: 0,
    };
};

// ─── Page Component ─────────────────────────────────────────────────
export default function CreateProductionPage() {
    const t = useTranslations("production.create");
    const tToast = useTranslations("production.toasts");
    const tMat = useTranslations("production.materialsStep");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const router = useRouter();

    const steps = [
        { id: 1, title: t("stepOrder"), icon: ShoppingCart, description: t("stepOrderDesc") },
        { id: 2, title: t("stepSetup"), icon: Settings, description: t("stepSetupDesc") },
        { id: 3, title: t("stepMaterials"), icon: Package, description: t("stepMaterialsDesc") },
        { id: 4, title: t("lblConfig"), icon: Sliders, description: t("lblConfigDesc") },
    ];

    // NOTE: Multi-tab same-draft collision (accepted limitation):
    // If a user opens two simultaneous tabs both creating a new production run,
    // both tabs share the same draft key ('draft:production-setup:new') and
    // can overwrite each other. Cross-tab lock/synchronization is out of scope for this pass.
    const { draft, updateDraft, clearDraft } = useDraftPersistence<ProductionSetupDraft>(
        "draft:production-setup:new",
        getDefaultDraft()
    );

    const {
        currentStep,
        selectedOrderId,
        orderSearchTerm,
        statusFilter,
        selectedMaterials,
        assignedMachines,
        assignedOperators,
        expectedOutput,
        startTime,
        shift,
        targetCompletion,
        notes,
        labourCost,
        overhead,
        saleValue,
    } = draft;

    const setCurrentStep = useCallback(
        (action: number | ((prev: number) => number)) =>
            updateDraft((prev) => ({
                currentStep: typeof action === "function" ? action(prev.currentStep) : action,
            })),
        [updateDraft]
    );

    const setSelectedOrderId = useCallback(
        (id: string) => updateDraft({ selectedOrderId: id }),
        [updateDraft]
    );

    const setOrderSearchTerm = useCallback(
        (term: string) => updateDraft({ orderSearchTerm: term }),
        [updateDraft]
    );

    const setStatusFilter = useCallback(
        (filter: string) => updateDraft({ statusFilter: filter }),
        [updateDraft]
    );

    const setSelectedMaterials = useCallback(
        (action: SelectedMaterial[] | ((prev: SelectedMaterial[]) => SelectedMaterial[])) =>
            updateDraft((prev) => ({
                selectedMaterials: typeof action === "function" ? action(prev.selectedMaterials) : action,
            })),
        [updateDraft]
    );

    const setAssignedMachines = useCallback(
        (action: { id: number; machineId: string; machineName: string }[] | ((prev: { id: number; machineId: string; machineName: string }[]) => { id: number; machineId: string; machineName: string }[])) =>
            updateDraft((prev) => ({
                assignedMachines: typeof action === "function" ? action(prev.assignedMachines) : action,
            })),
        [updateDraft]
    );

    const setAssignedOperators = useCallback(
        (action: { id: number; operatorId: string; operatorName: string }[] | ((prev: { id: number; operatorId: string; operatorName: string }[]) => { id: number; operatorId: string; operatorName: string }[])) =>
            updateDraft((prev) => ({
                assignedOperators: typeof action === "function" ? action(prev.assignedOperators) : action,
            })),
        [updateDraft]
    );

    const setExpectedOutput = useCallback(
        (val: string) => updateDraft({ expectedOutput: val }),
        [updateDraft]
    );

    const setStartTime = useCallback(
        (val: string) => updateDraft({ startTime: val }),
        [updateDraft]
    );

    const setShift = useCallback(
        (val: ShiftType) => updateDraft({ shift: val }),
        [updateDraft]
    );

    const setTargetCompletion = useCallback(
        (val: string) => updateDraft({ targetCompletion: val }),
        [updateDraft]
    );

    const setNotes = useCallback(
        (val: string) => updateDraft({ notes: val }),
        [updateDraft]
    );

    const setLabourCost = useCallback(
        (val: number) => updateDraft({ labourCost: val }),
        [updateDraft]
    );

    const setOverhead = useCallback(
        (val: number) => updateDraft({ overhead: val }),
        [updateDraft]
    );

    const setSaleValue = useCallback(
        (val: number) => updateDraft({ saleValue: val }),
        [updateDraft]
    );

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data from API
    const [orders, setOrders] = useState<Order[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [machines, setMachines] = useState<MachineData[]>([]);
    const [operators, setOperators] = useState<OperatorData[]>([]);

    const handleCancel = useCallback(() => {
        clearDraft();
        router.push("/dashboard/production");
    }, [clearDraft, router]);

    // ─── Fetch data & Reconcile with Fresh Lists ─────────────
    useEffect(() => {
        let isCancelled = false;
        const fetchData = async () => {
            try {
                const [ordersRes, inventoryRes, machinesRes, employeesRes] = await Promise.all([
                    fetch("/api/v1/orders").then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
                    fetch("/api/inventory").then((r) => r.ok ? r.json() : []).catch(() => []),
                    fetch("/api/machines").then((r) => r.ok ? r.json() : []).catch(() => []),
                    fetch("/api/employees").then((r) => r.ok ? r.json() : { employees: [] }).catch(() => ({ employees: [] })),
                ]);
                if (isCancelled) return;

                // v1 API wraps data in { success, data } envelope
                const orderData: Order[] = ordersRes?.data ?? (Array.isArray(ordersRes) ? ordersRes : []);
                const invList: InventoryItem[] = Array.isArray(inventoryRes) ? inventoryRes : [];
                const machineList: MachineData[] = Array.isArray(machinesRes) ? machinesRes : [];
                const empList: any[] = Array.isArray(employeesRes?.employees)
                    ? employeesRes.employees
                    : Array.isArray(employeesRes) ? employeesRes : [];
                const activeOps: OperatorData[] = empList.filter((e: any) => e.status === "active");

                setOrders(Array.isArray(orderData) ? orderData : []);
                setInventory(invList);
                setMachines(machineList);
                setOperators(activeOps);

                // Reconcile restored draft against fresh data
                updateDraft((prev) => {
                    let changed = false;

                    // 1. Order reconciliation
                    let nextOrderId = prev.selectedOrderId;
                    if (nextOrderId && !orderData.some((o) => o.id === nextOrderId)) {
                        console.warn(`[CreateProduction] Order ${nextOrderId} no longer exists; clearing selection.`);
                        nextOrderId = "";
                        changed = true;
                    }

                    // 2. Machine assignments reconciliation
                    let nextMachines = prev.assignedMachines;
                    if (nextMachines && nextMachines.length > 0) {
                        const reconciled = nextMachines.map((row) => {
                            if (!row.machineId) return row;
                            const match = machineList.find((m) => m.id === row.machineId && m.status === "active");
                            if (!match) {
                                console.warn(`[CreateProduction] Machine ${row.machineId} inactive or removed; clearing.`);
                                changed = true;
                                return { ...row, machineId: "", machineName: "" };
                            }
                            if (match.machineName !== row.machineName) {
                                changed = true;
                                return { ...row, machineName: match.machineName };
                            }
                            return row;
                        });
                        nextMachines = reconciled;
                    } else {
                        nextMachines = [{ id: Date.now(), machineId: "", machineName: "" }];
                        changed = true;
                    }

                    // 3. Operator assignments reconciliation
                    let nextOperators = prev.assignedOperators;
                    if (nextOperators && nextOperators.length > 0) {
                        const reconciled = nextOperators.map((row) => {
                            if (!row.operatorId) return row;
                            const match = activeOps.find((op) => op.id === row.operatorId);
                            if (!match) {
                                console.warn(`[CreateProduction] Operator ${row.operatorId} inactive or removed; clearing.`);
                                changed = true;
                                return { ...row, operatorId: "", operatorName: "" };
                            }
                            if (match.fullName !== row.operatorName) {
                                changed = true;
                                return { ...row, operatorName: match.fullName };
                            }
                            return row;
                        });
                        nextOperators = reconciled;
                    } else {
                        nextOperators = [{ id: Date.now(), operatorId: "", operatorName: "" }];
                        changed = true;
                    }

                    // 4. Materials reconciliation
                    const nextMaterials = prev.selectedMaterials.map((mat) => {
                        if (!mat.inventoryId) return mat;
                        const match = invList.find((i) => i.id === mat.inventoryId);
                        if (!match) {
                            console.warn(`[CreateProduction] Material ${mat.inventoryId} removed from inventory.`);
                            changed = true;
                            return { ...mat, inventoryId: "", availableStock: 0 };
                        }
                        if (match.quantity !== mat.availableStock) {
                            changed = true;
                            return { ...mat, availableStock: match.quantity };
                        }
                        return mat;
                    });

                    if (!changed) return prev;
                    return {
                        ...prev,
                        selectedOrderId: nextOrderId,
                        assignedMachines: nextMachines,
                        assignedOperators: nextOperators,
                        selectedMaterials: nextMaterials,
                    };
                });
            } catch {
                toast.error(tToast("loadDataFailed"));
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => {
            isCancelled = true;
        };
    }, [updateDraft, tToast]);

    // Statuses eligible for production (case-insensitive)
    const PRODUCTION_ELIGIBLE = new Set(["pending", "confirmed", "processing", "in_progress", "in progress"]);

    const confirmedOrders = useMemo(
        () =>
            orders.filter(
                (o) => PRODUCTION_ELIGIBLE.has(o.status?.toLowerCase?.() ?? "")
            ),
        [orders]
    );

    const filteredOrders = useMemo(
        () => {
            let list = confirmedOrders;
            // Apply status filter
            if (statusFilter !== "all") {
                list = list.filter(
                    (o) => o.status?.toLowerCase() === statusFilter
                );
            }
            // Apply search
            if (orderSearchTerm.trim()) {
                const term = orderSearchTerm.toLowerCase();
                list = list.filter(
                    (o) =>
                        (o.product_name ?? o.productName ?? "").toLowerCase().includes(term) ||
                        (o.clients?.name ?? o.clientName ?? "").toLowerCase().includes(term)
                );
            }
            return list;
        },
        [confirmedOrders, orderSearchTerm, statusFilter]
    );

    const selectedOrder = useMemo(
        () => orders.find((o) => o.id === selectedOrderId),
        [orders, selectedOrderId]
    );

    // ─── Cost computations ────────────────────────────────────
    const materialCost = useMemo(
        () => selectedMaterials.reduce((sum, m) => sum + (m.quantityUsed * (m.unitCost || 0)), 0),
        [selectedMaterials]
    );
    const totalCost = useMemo(() => materialCost + labourCost + overhead, [materialCost, labourCost, overhead]);
    const marginPercent = useMemo(() => saleValue > 0 ? ((saleValue - totalCost) / saleValue) * 100 : 0, [saleValue, totalCost]);

    // Only active machines are selectable
    const availableMachines = useMemo(
        () => machines.filter((m) => m.status === "active"),
        [machines]
    );

    // Machine list helpers
    const addMachineRow = () => setAssignedMachines(prev => [...prev, { id: Date.now(), machineId: '', machineName: '' }]);
    const removeMachineRow = (id: number) => setAssignedMachines(prev => prev.filter(m => m.id !== id));
    const updateMachineRow = (id: number, machineId: string) => {
        const found = machines.find(m => m.id === machineId);
        setAssignedMachines(prev => prev.map(row => row.id === id ? { ...row, machineId, machineName: found?.machineName || '' } : row));
    };

    // Operator list helpers
    const addOperatorRow = () => setAssignedOperators(prev => [...prev, { id: Date.now(), operatorId: '', operatorName: '' }]);
    const removeOperatorRow = (id: number) => setAssignedOperators(prev => prev.filter(o => o.id !== id));
    const updateOperatorRow = (id: number, operatorId: string) => {
        const found = operators.find(o => o.id === operatorId);
        setAssignedOperators(prev => prev.map(row => row.id === id ? { ...row, operatorId, operatorName: found?.fullName || '' } : row));
    };

    // ─── Material management ──────────────────────────────────
    const addMaterial = () => {
        setSelectedMaterials([
            ...selectedMaterials,
            { inventoryId: "", name: "", quantityUsed: 0, unit: "", availableStock: 0 },
        ]);
    };

    const updateMaterial = (index: number, field: string, value: any) => {
        const updated = [...selectedMaterials];
        if (field === "inventoryId") {
            const item = inventory.find((i) => i.id === value);
            if (item) {
                updated[index] = {
                    inventoryId: value,
                    name: item.name,
                    quantityUsed: 0,
                    unit: item.unit,
                    availableStock: item.quantity,
                };
            }
        } else {
            (updated[index] as any)[field] = value;
        }
        setSelectedMaterials(updated);
    };

    const removeMaterial = (index: number) => {
        setSelectedMaterials(selectedMaterials.filter((_, i) => i !== index));
    };

    // ─── Validation ───────────────────────────────────────────
    const canProceed = (step: number): boolean => {
        switch (step) {
            case 1:
                return !!selectedOrderId;
            case 2:
                return (
                    assignedMachines.length > 0 &&
                    assignedMachines.every(m => !!m.machineId) &&
                    assignedOperators.length > 0 &&
                    assignedOperators.every(o => !!o.operatorId)
                );
            case 3:
                return (
                    selectedMaterials.length > 0 &&
                    selectedMaterials.every((m) => m.inventoryId && m.quantityUsed > 0)
                );
            case 4:
                return (
                    Number(expectedOutput) > 0
                );
            default:
                return false;
        }
    };

    // ─── Submit ───────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!selectedOrder) return;
        setSubmitting(true);

        try {
            const payload = {
                orderId: selectedOrder.id,
                orderProductName: selectedOrder.product_name ?? selectedOrder.productName ?? "",
                orderQuantity: selectedOrder.quantity,
                clientName: selectedOrder.clients?.name ?? selectedOrder.clientName ?? "—",
                deliveryDate: selectedOrder.delivery_date ?? selectedOrder.deliveryDate ?? null,
                materials: selectedMaterials,
                machineId: assignedMachines[0]?.machineId || "",
                machineName: assignedMachines[0]?.machineName || "",
                machineIds: assignedMachines.map(m => m.machineId),
                machineNames: assignedMachines.map(m => m.machineName),
                operatorId: assignedOperators[0]?.operatorId || "",
                operatorName: assignedOperators[0]?.operatorName || "",
                operatorIds: assignedOperators.map(o => o.operatorId),
                operatorNames: assignedOperators.map(o => o.operatorName),
                expectedOutput: Number(expectedOutput),
                startTime: startTime || null,
                shift,
                targetCompletion: targetCompletion || null,
                notes,
            };

            const res = await fetch("/api/production", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
                return;
            }

            toast.success(tToast("createSuccess"));
            clearDraft();

            router.push(`/dashboard/production/${data.id}`);
        } catch {
            toast.error(tToast("createFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Animation ────────────────────────────────────────────
    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 80 : -80,
            opacity: 0,
        }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({
            x: dir < 0 ? 80 : -80,
            opacity: 0,
        }),
    };

    const [slideDirection, setSlideDirection] = useState(0);

    const goNext = () => {
        if (currentStep < 4 && canProceed(currentStep)) {
            setSlideDirection(1);
            setCurrentStep(currentStep + 1);
        }
    };

    const goBack = () => {
        if (currentStep > 1) {
            setSlideDirection(-1);
            setCurrentStep(currentStep - 1);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        );
    }

    return (
        <div className="w-full min-w-0 overflow-x-hidden flex flex-col min-h-full pb-28">
        {/* ─── Scrollable content area ─── */}
        <div className="flex-1 px-4 pt-4">
        <div className="space-y-6 max-w-4xl mx-auto pb-6">
            {/* ─── Breadcrumb ──────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                    onClick={() => router.push("/dashboard/production")}
                    className="hover:text-foreground transition-colors"
                >
                    {t("breadcrumbProduction")}
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{t("breadcrumbCreate")}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>

            {/* ─── Stepper ──────────────────────────────────────── */}
            <div className="pb-5">
              {/* Desktop — horizontal stepper */}
              <div className="hidden sm:flex items-start justify-between relative">
                {steps.map((step, index) => {
                  const isCompleted = currentStep > step.id;
                  const isActive    = currentStep === step.id;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1 relative">
                      {index > 0 && (
                        <div className="absolute top-[22px] right-[50%] left-[-50%] h-[2px] z-0">
                          <div className={cn(
                            "h-full w-full transition-all duration-500",
                            isCompleted ? "bg-[#10B981]" : "bg-[rgba(255,255,255,0.08)]"
                          )} />
                        </div>
                      )}
                      <div className={cn(
                        "relative z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                        isCompleted
                          ? "bg-[#10B981] shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                          : isActive
                            ? "bg-[#2563EB] shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            : "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]"
                      )}>
                        {isCompleted
                          ? <Check size={18} className="text-white" strokeWidth={2.5} />
                          : <StepIcon size={18} className={isActive ? "text-white" : "text-[#475569]"} />}
                      </div>
                      <p className={cn(
                        "mt-2.5 text-[11.5px] font-medium text-center leading-tight max-w-[80px] transition-colors duration-200",
                        isActive ? "text-foreground" : isCompleted ? "text-[#10B981]" : "text-[#475569]"
                      )}>
                        {step.title}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Mobile — compact dot indicator */}
              <div className="flex sm:hidden items-center justify-between">
                <div className="flex items-center gap-2">
                  {steps.map((step) => (
                    <div key={step.id} className={cn(
                      "transition-all duration-300 rounded-full",
                      currentStep === step.id ? "w-6 h-2 bg-[#2563EB]"
                        : currentStep > step.id ? "w-2 h-2 bg-[#10B981]"
                        : "w-2 h-2 bg-[rgba(255,255,255,0.12)]"
                    )} />
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">{t("stepCounter", { current: currentStep, total: steps.length })}</p>
                  <p className="text-[13px] font-semibold text-foreground">{steps[currentStep - 1]?.title}</p>
                </div>
              </div>
            </div>

            {/* ─── Step Content ────────────────────────────────────── */}
            <div className="rounded-[20px] border bg-card dark:bg-[rgba(255,255,255,0.04)] border-border dark:border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden min-h-[380px]">
                <AnimatePresence mode="wait" custom={slideDirection}>
                    <motion.div
                        key={currentStep}
                        custom={slideDirection}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="p-6"
                    >
                        {/* ═══ STEP 1: Order Selection ═══ */}
                        {currentStep === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">{t("stepOrder")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("stepOrderDesc")}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t("searchOrdersPlaceholder")}
                                            className="pl-10 h-10"
                                            value={orderSearchTerm}
                                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                                            id="order-search"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-10 w-[160px] bg-card" id="status-filter">
                                            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                            <SelectValue placeholder={t("filterAllStatuses")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("filterAllStatuses")}</SelectItem>
                                            <SelectItem value="pending">{t("orderStatusPending")}</SelectItem>
                                            <SelectItem value="confirmed">{t("orderStatusConfirmed")}</SelectItem>
                                            <SelectItem value="processing">{t("orderStatusInProduction")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {confirmedOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
                                        <h3 className="font-semibold mb-1">{t("noConfirmedOrdersTitle")}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("noConfirmedOrdersDesc")}
                                        </p>
                                    </div>
                                ) : filteredOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <Search className="h-8 w-8 text-muted-foreground mb-3" />
                                        <h3 className="font-semibold mb-1">{t("noMatchingOrdersTitle")}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t("noMatchingOrdersDesc")}
                                        </p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[300px]">
                                        <div className="space-y-2 pr-3">
                                            {filteredOrders.map((order) => {
                                                const isSelected = selectedOrderId === order.id;
                                                const displayName = order.product_name ?? order.productName ?? "—";
                                                const clientDisplayName = order.clients?.name ?? order.clientName ?? "—";
                                                const deliveryDate = order.delivery_date ?? order.deliveryDate;
                                                return (
                                                    <button
                                                        key={order.id}
                                                        className={cn(
                                                            "w-full text-left rounded-[14px] border p-3.5 transition-all duration-200",
                                                            isSelected
                                                                ? "border-[rgba(37,99,235,0.4)] bg-[rgba(37,99,235,0.08)] dark:bg-[rgba(37,99,235,0.12)] ring-1 ring-[rgba(37,99,235,0.2)] shadow-[0_0_16px_rgba(37,99,235,0.08)]"
                                                                : "border-border dark:border-[rgba(255,255,255,0.06)] hover:border-[rgba(37,99,235,0.2)] hover:bg-muted/30 dark:hover:bg-[rgba(255,255,255,0.04)]"
                                                        )}
                                                        onClick={() => setSelectedOrderId(order.id)}
                                                        id={`order-option-${order.id}`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-sm">
                                                                        {displayName}
                                                                    </span>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[9px] font-bold uppercase"
                                                                    >
                                                                        {order.status}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="h-3 w-3" />
                                                                        {clientDisplayName}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Package className="h-3 w-3" />
                                                                        {t("orderQtyUnits", { qty: order.quantity })}
                                                                    </span>
                                                                    {deliveryDate && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="h-3 w-3" />
                                                                            {new Date(
                                                                                deliveryDate
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    "flex items-center justify-center flex-shrink-0 ml-3 mt-0.5 transition-all",
                                                                    isSelected
                                                                        ? "w-6 h-6 rounded-full bg-[#2563EB]"
                                                                        : "w-5 h-5 rounded-full border-2 border-border dark:border-[rgba(255,255,255,0.12)]"
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <Check className="h-3 w-3 text-white" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        )}

                        {/* ═══ STEP 2: Production Setup ═══ */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">{t("stepSetup")}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("stepSetupDesc")}
                                    </p>
                                </div>

                                {/* Selected order summary */}
                                {selectedOrder && (
                                    <div className="rounded-[12px] bg-[rgba(37,99,235,0.06)] dark:bg-[rgba(37,99,235,0.08)] border border-[rgba(37,99,235,0.15)] p-3 flex items-center gap-3">
                                        <ShoppingCart className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                        <div className="text-xs">
                                            <span className="font-bold">
                                                {selectedOrder.product_name ?? selectedOrder.productName}
                                            </span>
                                            <span className="text-muted-foreground mx-2">•</span>
                                            <span className="text-muted-foreground">
                                                {t("orderQtyUnits", { qty: selectedOrder.quantity })}
                                            </span>
                                            <span className="text-muted-foreground mx-2">•</span>
                                            <span className="text-muted-foreground">
                                                {selectedOrder.clients?.name ?? selectedOrder.clientName ?? "—"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Machines Assignment */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Cpu className="h-3.5 w-3.5" />
                                            {t("lblMachine")}
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-8 text-xs gap-1"
                                            onClick={addMachineRow}
                                        >
                                            <Plus className="h-3 w-3" />
                                            {t("btnAddMachine")}
                                        </Button>
                                    </div>
                                    {machines.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                                            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{t("noMachinesTitle")}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("noMachinesDesc")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedMachines.map((row) => (
                                                <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted/20">
                                                    <div className="flex-1 min-w-0">
                                                        <Select value={row.machineId} onValueChange={(v) => updateMachineRow(row.id, v)}>
                                                            <SelectTrigger className="h-9 bg-card" id={`machine-select-${row.id}`}>
                                                                <SelectValue placeholder={t("placeholderSelectMachine")} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin">
                                                                {machines.map((m) => (
                                                                    <SelectItem key={m.id} value={m.id} disabled={m.status !== "active"}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={cn("w-1.5 h-1.5 rounded-full", m.status === "active" ? "bg-emerald-400" : m.status === "maintenance" ? "bg-amber-400" : "bg-red-400")} />
                                                                            {m.machineName}
                                                                            {m.machineType && <span className="text-[10px] text-muted-foreground">({m.machineType})</span>}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                                                        onClick={() => removeMachineRow(row.id)}
                                                        disabled={assignedMachines.length <= 1}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Operators Assignment */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <User className="h-3.5 w-3.5" />
                                            {t("lblOperator")}
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-8 text-xs gap-1"
                                            onClick={addOperatorRow}
                                        >
                                            <Plus className="h-3 w-3" />
                                            {t("btnAddOperator")}
                                        </Button>
                                    </div>
                                    {operators.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                                            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{t("noStaffTitle")}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{t("noStaffDesc")}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedOperators.map((row) => (
                                                <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted/20">
                                                    <div className="flex-1 min-w-0">
                                                        <Select value={row.operatorId} onValueChange={(v) => updateOperatorRow(row.id, v)}>
                                                            <SelectTrigger className="h-9 bg-card" id={`operator-select-${row.id}`}>
                                                                <SelectValue placeholder={t("placeholderSelectOperator")} />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin">
                                                                {operators.map((op) => (
                                                                    <SelectItem key={op.id} value={op.id}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                            {op.fullName}
                                                                            {op.designation && <span className="text-[10px] text-muted-foreground">({op.designation})</span>}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                                                        onClick={() => removeOperatorRow(row.id)}
                                                        disabled={assignedOperators.length <= 1}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══ STEP 3: Materials ═══ */}
                        {currentStep === 3 && (
                            <MaterialsStep
                                inventory={inventory}
                                productName={selectedOrder?.product_name ?? selectedOrder?.productName ?? ""}
                                onMaterialsChange={(mats) => setSelectedMaterials(mats)}
                            />
                        )}

                        {/* ═══ STEP 4: Production Configuration ═══ */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">
                                        {t("lblConfig")}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {t("lblConfigDesc")}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblExpectedOutput")}
                                        </Label>
                                        <NumericInput
                                            value={expectedOutput}
                                            onValueChange={(v) => setExpectedOutput(v)}
                                            placeholder={selectedOrder ? String(selectedOrder.quantity) : "0"}
                                            className="h-12 text-xl font-black bg-card"
                                            id="expected-output"
                                            allowDecimal={false}
                                            min={0}
                                        />
                                        {selectedOrder && (
                                            <p className="text-[10px] text-muted-foreground">
                                                {t("summaryOrderRequires", { qty: selectedOrder.quantity })}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            {t("lblStartDate")}
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="h-12 bg-card"
                                            id="start-time"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblShift")}
                                        </Label>
                                        <Select
                                            value={shift}
                                            onValueChange={(v) => setShift(v as ShiftType)}
                                        >
                                            <SelectTrigger className="h-12 bg-card" id="shift-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="morning">
                                                    {t("shiftMorning")}
                                                </SelectItem>
                                                <SelectItem value="afternoon">
                                                    {t("shiftAfternoon")}
                                                </SelectItem>
                                                <SelectItem value="night">
                                                    {t("shiftNight")}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {t("lblTargetCompletion")}
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            value={targetCompletion}
                                            onChange={(e) => setTargetCompletion(e.target.value)}
                                            className="h-12 bg-card"
                                            id="target-completion"
                                        />
                                    </div>
                                </div>

                                {/* ─── Cost Inputs ─── */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblLabourCost")}
                                        </Label>
                                        <NumericInput
                                            value={labourCost || ""}
                                            onValueChange={(v) => setLabourCost(Number(v) || 0)}
                                            placeholder="0"
                                            className="h-11 bg-card"
                                            id="labour-cost"
                                            allowDecimal={true}
                                            min={0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblOverheadCost")}
                                        </Label>
                                        <NumericInput
                                            value={overhead || ""}
                                            onValueChange={(v) => setOverhead(Number(v) || 0)}
                                            placeholder="0"
                                            className="h-11 bg-card"
                                            id="overhead-cost"
                                            allowDecimal={true}
                                            min={0}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {t("lblSaleValue")}
                                        </Label>
                                        <NumericInput
                                            value={saleValue || ""}
                                            onValueChange={(v) => setSaleValue(Number(v) || 0)}
                                            placeholder="0"
                                            className="h-11 bg-card"
                                            id="sale-value"
                                            allowDecimal={true}
                                            min={0}
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("lblNotes")}
                                    </Label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t("placeholderNotes")}
                                        rows={3}
                                        className={cn(
                                            "flex w-full rounded-xl border px-4 py-3 text-sm shadow-xs transition-colors resize-none",
                                            "bg-card border-border",
                                            "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                                        )}
                                    />
                                </div>

                                {/* ─── Cost & Profit Summary ─── */}
                                <div
                                    style={{
                                        background: 'hsl(var(--card))',
                                        borderRadius: '14px',
                                        border: '0.5px solid hsl(var(--border))',
                                        padding: '14px',
                                        marginBottom: '10px',
                                    }}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>
                                            {t("costSummaryTitle")}
                                        </span>
                                        <span style={{ fontSize: '9px', background: '#0f3d2e', color: '#1D9E75', padding: '2px 7px', borderRadius: '10px', fontWeight: 600 }}>
                                            live
                                        </span>
                                    </div>

                                    {/* Cost rows */}
                                    {[
                                        { label: t("costMaterial"), value: materialCost },
                                        { label: t("costLabour"), value: labourCost },
                                        { label: t("costOverhead"), value: overhead },
                                    ].map(row => (
                                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{row.label}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                                                {"\u20B9"}{row.value.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}

                                    {/* Divider */}
                                    <div style={{ height: '0.5px', background: 'hsl(var(--border))', margin: '8px 0' }} />

                                    {/* Total + Sale */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{t("costTotal")}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{"\u20B9"}{totalCost.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{t("costSale")}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{"\u20B9"}{saleValue.toLocaleString('en-IN')}</span>
                                    </div>

                                    <div style={{ height: '0.5px', background: 'hsl(var(--border))', margin: '8px 0' }} />

                                    {/* Net margin */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>{t("costMargin")}</span>
                                        <span style={{ fontSize: '16px', fontWeight: 500, color: marginPercent < 0 ? '#E24B4A' : '#1D9E75' }}>
                                            {marginPercent.toFixed(1)}%
                                        </span>
                                    </div>

                                    {/* Margin progress bar */}
                                    <div style={{ height: '4px', background: 'hsl(var(--border))', borderRadius: '3px', marginTop: '8px' }}>
                                        <div style={{
                                            height: '4px',
                                            background: marginPercent > 30 ? '#1D9E75' : marginPercent > 15 ? '#BA7517' : '#E24B4A',
                                            borderRadius: '3px',
                                            width: `${Math.min(Math.max(marginPercent, 0), 100)}%`,
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                </div>

                                {/* ─── Production Summary ─── */}
                                <div className="rounded-[14px] bg-[rgba(37,99,235,0.06)] dark:bg-[rgba(37,99,235,0.06)] border border-[rgba(37,99,235,0.15)] p-4 space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#60A5FA]">
                                        {t("secProductionSummary")}
                                    </h3>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("lblProduct")}: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {selectedOrder?.product_name ?? selectedOrder?.productName ?? "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("lblClient")}: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {selectedOrder?.clients?.name ?? selectedOrder?.clientName ?? "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("stepMaterials")}: </span>
                                            <span className="font-semibold text-right flex-1">
                                                {tMat("summaryItemsCount", { count: selectedMaterials.length })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("lblMachineAssigned")}: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {assignedMachines.filter(m => m.machineName).map(m => m.machineName).join(', ') || "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("lblOperatorAssigned")}: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {assignedOperators.filter(o => o.operatorName).map(o => o.operatorName).join(', ') || "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">{t("lblTarget")}: </span>
                                            <span className="font-semibold text-right flex-1">
                                                {t("orderQtyUnits", { qty: expectedOutput || "—" })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
        </div>

        {/* ─── Bottom Actions ─── */}
        <div className="shrink-0 px-4 pt-4 pb-2">
            <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
                <Button
                    variant="outline"
                    className="gap-2 rounded-[12px] h-11"
                    onClick={currentStep === 1 ? handleCancel : goBack}
                >
                    <ChevronLeft className="h-4 w-4" />
                    {currentStep === 1 ? t("btnCancel") : t("btnBack")}
                </Button>

                {currentStep < 4 ? (
                    <Button
                        className="gap-2 rounded-[12px] h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)]"
                        onClick={goNext}
                        disabled={!canProceed(currentStep)}
                        id="next-step-btn"
                    >
                        {t("btnContinue")}
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!canProceed(currentStep) || submitting}
                        id="submit-production-btn"
                        className={cn(
                            "flex-[2] max-w-[220px] h-12 rounded-[12px] text-[14px] font-medium text-white",
                            "transition-all duration-200 active:scale-[0.98]",
                            "flex items-center justify-center gap-2",
                            (!canProceed(currentStep) || submitting)
                                ? "bg-[rgba(16,185,129,0.4)] cursor-not-allowed"
                                : "bg-[#10B981] hover:bg-[#059669] shadow-[0_4px_20px_rgba(16,185,129,0.3)] cursor-pointer"
                        )}
                    >
                        {submitting ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t("btnLaunching")}
                            </>
                        ) : (
                            <>
                                {t("btnLaunch")}
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
        </div>
    );
}
