"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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

// ─── Step definitions ───────────────────────────────────────────────
const steps = [
    { id: 1, title: "Order Selection", icon: ShoppingCart, description: "Select a confirmed order" },
    { id: 2, title: "Production Setup", icon: Settings, description: "Machine & operator" },
    { id: 3, title: "Materials", icon: Package, description: "Raw materials & stock" },
    { id: 4, title: "Configuration", icon: Sliders, description: "Output targets & schedule" },
];

// ─── Page Component ─────────────────────────────────────────────────
export default function CreateProductionPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data from API
    const [orders, setOrders] = useState<Order[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [machines, setMachines] = useState<MachineData[]>([]);
    const [operators, setOperators] = useState<OperatorData[]>([]);

    // Step 1 — Order selection
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [orderSearchTerm, setOrderSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Step 2 — Materials, machines, operators
    const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
    const [assignedMachines, setAssignedMachines] = useState<{ id: number; machineId: string; machineName: string }[]>([{ id: Date.now(), machineId: '', machineName: '' }]);
    const [assignedOperators, setAssignedOperators] = useState<{ id: number; operatorId: string; operatorName: string }[]>([{ id: Date.now(), operatorId: '', operatorName: '' }]);

    // Step 3 — Config
    const [expectedOutput, setExpectedOutput] = useState("");
    // Auto-fill Start Time with current datetime (user can clear/change it)
    const [startTime, setStartTime] = useState(() => {
        const now = new Date();
        // Format as YYYY-MM-DDTHH:MM for datetime-local input
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    });
    const [shift, setShift] = useState<ShiftType>("morning");
    const [targetCompletion, setTargetCompletion] = useState("");
    const [notes, setNotes] = useState("");

    // Cost & Profit fields
    const [labourCost, setLabourCost] = useState(0);
    const [overhead, setOverhead] = useState(0);
    const [saleValue, setSaleValue] = useState(0);

    // ─── Fetch data ───────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ordersRes, inventoryRes, machinesRes, employeesRes] = await Promise.all([
                    fetch("/api/v1/orders").then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
                    fetch("/api/inventory").then((r) => r.ok ? r.json() : []).catch(() => []),
                    fetch("/api/machines").then((r) => r.ok ? r.json() : []).catch(() => []),
                    fetch("/api/employees").then((r) => r.ok ? r.json() : { employees: [] }).catch(() => ({ employees: [] })),
                ]);
                // v1 API wraps data in { success, data } envelope
                const orderData = ordersRes?.data ?? (Array.isArray(ordersRes) ? ordersRes : []);
                setOrders(Array.isArray(orderData) ? orderData : []);
                setInventory(Array.isArray(inventoryRes) ? inventoryRes : []);
                setMachines(Array.isArray(machinesRes) ? machinesRes : []);
                // Employees API returns { employees: [...] }
                const empList = Array.isArray(employeesRes?.employees)
                    ? employeesRes.employees
                    : Array.isArray(employeesRes) ? employeesRes : [];
                setOperators(empList.filter((e: any) => e.status === "active"));
            } catch {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

            toast.success("Production created successfully!", {
                description: `Batch ${data.batchNumber} is ready.`,
            });

            router.push(`/dashboard/production/${data.id}`);
        } catch {
            toast.error("Failed to create production");
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
        <div className="flex flex-col min-h-full pb-28">
        {/* ─── Scrollable content area ─── */}
        <div className="flex-1 px-4 pt-4">
        <div className="space-y-6 max-w-4xl mx-auto pb-6">
            {/* ─── Breadcrumb ──────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                    onClick={() => router.push("/dashboard/production")}
                    className="hover:text-foreground transition-colors"
                >
                    Production
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">Create Production</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">New Production Run</h1>

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
                  <p className="text-[11px] text-muted-foreground">Step {currentStep} of {steps.length}</p>
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
                                    <h2 className="text-lg font-bold mb-1">Select Order</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a confirmed order to start production for.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search orders by product or client..."
                                            className="pl-10 h-10"
                                            value={orderSearchTerm}
                                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                                            id="order-search"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-10 w-[160px] bg-card" id="status-filter">
                                            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="processing">In Production</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {confirmedOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
                                        <h3 className="font-semibold mb-1">No confirmed orders</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Create an order first, then come back to start production.
                                        </p>
                                    </div>
                                ) : filteredOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <Search className="h-8 w-8 text-muted-foreground mb-3" />
                                        <h3 className="font-semibold mb-1">No matching orders</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Try adjusting your search or filter.
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
                                                                        {order.quantity} units
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
                                    <h2 className="text-lg font-bold mb-1">Production Setup</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Assign machines and operators for this production run.
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
                                                {selectedOrder.quantity} units
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
                                            Assign Machines
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-8 text-xs gap-1"
                                            onClick={addMachineRow}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Machine
                                        </Button>
                                    </div>
                                    {machines.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                                            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">No machines found</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Admin must add machines in Machine Management first.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedMachines.map((row) => (
                                                <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted/20">
                                                    <div className="flex-1 min-w-0">
                                                        <Select value={row.machineId} onValueChange={(v) => updateMachineRow(row.id, v)}>
                                                            <SelectTrigger className="h-9 bg-card" id={`machine-select-${row.id}`}>
                                                                <SelectValue placeholder="Select machine..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
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
                                            Assign Operators
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-8 text-xs gap-1"
                                            onClick={addOperatorRow}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add Operator
                                        </Button>
                                    </div>
                                    {operators.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                                            <AlertCircle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">No staff found</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Admin must add staff members first.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {assignedOperators.map((row) => (
                                                <div key={row.id} className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted/20">
                                                    <div className="flex-1 min-w-0">
                                                        <Select value={row.operatorId} onValueChange={(v) => updateOperatorRow(row.id, v)}>
                                                            <SelectTrigger className="h-9 bg-card" id={`operator-select-${row.id}`}>
                                                                <SelectValue placeholder="Select operator..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
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
                                        Production Configuration
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Set targets, schedule, and shift details.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Expected Output (Units)
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
                                                Order requires {selectedOrder.quantity} units
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            Start Time
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
                                            Shift
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
                                                    Morning (6 AM — 2 PM)
                                                </SelectItem>
                                                <SelectItem value="afternoon">
                                                    Afternoon (2 PM — 10 PM)
                                                </SelectItem>
                                                <SelectItem value="night">
                                                    Night (10 PM — 6 AM)
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Target Completion
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
                                            Labour Cost (INR)
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
                                            Overhead (INR)
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
                                            Sale Value (INR)
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
                                        Production Notes (Optional)
                                    </Label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Special instructions, quality requirements, etc..."
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
                                            Cost & Profit Summary
                                        </span>
                                        <span style={{ fontSize: '9px', background: '#0f3d2e', color: '#1D9E75', padding: '2px 7px', borderRadius: '10px', fontWeight: 600 }}>
                                            live
                                        </span>
                                    </div>

                                    {/* Cost rows */}
                                    {[
                                        { label: 'Material cost', value: materialCost },
                                        { label: 'Labour cost', value: labourCost },
                                        { label: 'Overhead', value: overhead },
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
                                        <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>Total cost</span>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{"\u20B9"}{totalCost.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>Sale value</span>
                                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{"\u20B9"}{saleValue.toLocaleString('en-IN')}</span>
                                    </div>

                                    <div style={{ height: '0.5px', background: 'hsl(var(--border))', margin: '8px 0' }} />

                                    {/* Net margin */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Net margin</span>
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
                                        Production Summary
                                    </h3>
                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Product: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {selectedOrder?.product_name ?? selectedOrder?.productName ?? "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Client: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {selectedOrder?.clients?.name ?? selectedOrder?.clientName ?? "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Materials: </span>
                                            <span className="font-semibold text-right flex-1">
                                                {selectedMaterials.length} items
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Machines: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {assignedMachines.filter(m => m.machineName).map(m => m.machineName).join(', ') || "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Operators: </span>
                                            <span className="font-semibold text-right flex-1" style={{ overflowWrap: 'break-word' }}>
                                                {assignedOperators.filter(o => o.operatorName).map(o => o.operatorName).join(', ') || "—"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">Target: </span>
                                            <span className="font-semibold text-right flex-1">
                                                {expectedOutput || "—"} units
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
                    onClick={currentStep === 1 ? () => router.push("/dashboard/production") : goBack}
                >
                    <ChevronLeft className="h-4 w-4" />
                    {currentStep === 1 ? "Cancel" : "Back"}
                </Button>

                {currentStep < 4 ? (
                    <Button
                        className="gap-2 rounded-[12px] h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)]"
                        onClick={goNext}
                        disabled={!canProceed(currentStep)}
                        id="next-step-btn"
                    >
                        Continue
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
                                Creating...
                            </>
                        ) : (
                            <>
                                Launch Production
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
