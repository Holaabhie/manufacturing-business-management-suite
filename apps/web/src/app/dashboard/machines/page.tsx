"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCachedPage } from "@/hooks/useCachedPage";
import { useRouter } from "next/navigation";
import {
    Cpu,
    Plus,
    PenLine,
    Trash2,
    ArrowLeft,
    Search,
    AlertCircle,
    Check,
    X,
    Power,
    Wrench,
    Cog,
    Play,
    Pause,
    Loader2,
} from "lucide-react";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { IOSInput } from "@/components/ui/ios/IOSFormElements";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSBadge } from "@/components/ui/ios/IOSBadge";
import { StatWidget } from "@/components/ui/StatWidget";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/hooks/useFormatters";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Machine {
    id: string;
    machineName: string;
    machineType: string;
    capacity: string;
    status: "active" | "inactive" | "maintenance" | "running" | "idle";
    adminId: string;
    createdAt: string;
    updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    active: {
        label: "Active",
        color: "text-emerald-600",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        icon: Check,
    },
    running: {
        label: "Running",
        color: "text-emerald-600",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        icon: Play,
    },
    idle: {
        label: "Idle",
        color: "text-slate-500",
        bg: "bg-slate-500/10 border-slate-500/20",
        icon: Pause,
    },
    inactive: {
        label: "Disabled",
        color: "text-red-500",
        bg: "bg-red-500/10 border-red-500/20",
        icon: Power,
    },
    maintenance: {
        label: "Maintenance",
        color: "text-amber-500",
        bg: "bg-amber-500/10 border-amber-500/20",
        icon: Wrench,
    },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const },
    },
};

export default function MachinesPage() {
    const router = useRouter();
    const { isAdmin } = useRole();
    const t = useTranslations("machines");
    const tCommon = useTranslations("common");
    const { formatDate } = useFormatters();

    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [restoredFromCache, setRestoredFromCache] = useState(false);

    // ── Page State Persistence ───────────────────────────
    const { restoreState, persist, scrollYRef } = useCachedPage({ pageKey: "machines" });
    const persistRef = useRef({ searchTerm, machines });
    useEffect(() => { persistRef.current = { searchTerm, machines }; });
    useEffect(() => {
        const cached = restoreState();
        if (cached) {
            if (cached.searchTerm) setSearchTerm(cached.searchTerm as string);
            if (Array.isArray(cached.machines) && (cached.machines as any[]).length > 0) {
                setMachines(cached.machines as Machine[]);
                setLoading(false);
                setRestoredFromCache(true);
            }
        }
        return () => {
            persist({ ...persistRef.current, scrollY: scrollYRef.current });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
    const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

    // Form fields
    const [formName, setFormName] = useState("");
    const [formType, setFormType] = useState("");
    const [formCapacity, setFormCapacity] = useState("");
    const [formStatus, setFormStatus] = useState("active");
    const [saving, setSaving] = useState(false);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch machines
    const fetchMachines = useCallback(async () => {
        try {
            const res = await fetch("/api/machines");
            const data = await res.json();
            setMachines(Array.isArray(data) ? data : []);
        } catch {
            toast.error(t("failedToLoad"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!restoredFromCache) fetchMachines();
    }, [fetchMachines, restoredFromCache]);

    // Filtered machines
    const filteredMachines = machines.filter(
        (m) =>
            m.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.machineType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Open Add dialog
    const openAddDialog = () => {
        setDialogMode("add");
        setEditingMachine(null);
        setFormName("");
        setFormType("");
        setFormCapacity("");
        setFormStatus("active");
        setDialogOpen(true);
    };

    // Open Edit dialog
    const openEditDialog = (machine: Machine) => {
        setDialogMode("edit");
        setEditingMachine(machine);
        setFormName(machine.machineName);
        setFormType(machine.machineType);
        setFormCapacity(machine.capacity);
        setFormStatus(machine.status);
        setDialogOpen(true);
    };

    // Submit form (add or edit)
    const handleSubmit = async () => {
        if (!formName.trim()) {
            toast.error(t("machineNameRequired"));
            return;
        }

        setSaving(true);
        try {
            if (dialogMode === "add") {
                const res = await fetch("/api/machines", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        machineName: formName.trim(),
                        machineType: formType.trim(),
                        capacity: formCapacity.trim(),
                    }),
                });
                const data = await res.json();
                if (data.error) {
                    toast.error(data.error);
                    return;
                }
                toast.success(t("machineAdded"));
            } else if (editingMachine) {
                const res = await fetch(`/api/machines/${editingMachine.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        machineName: formName.trim(),
                        machineType: formType.trim(),
                        capacity: formCapacity.trim(),
                        status: formStatus,
                    }),
                });
                const data = await res.json();
                if (data.error) {
                    toast.error(data.error);
                    return;
                }
                toast.success(t("machineUpdated"));
            }

            setDialogOpen(false);
            fetchMachines();
        } catch {
            toast.error(t("operationFailed"));
        } finally {
            setSaving(false);
        }
    };

    // Delete machine
    const handleDelete = async () => {
        if (!deletingMachine) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/machines/${deletingMachine.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
                return;
            }
            toast.success(t("machineDeleted"));
            setDeleteDialogOpen(false);
            setDeletingMachine(null);
            fetchMachines();
        } catch {
            toast.error(t("failedToDelete"));
        } finally {
            setDeleting(false);
        }
    };

    // Access check
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <AlertCircle className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
                <h2 className="text-[20px] font-semibold text-[var(--foreground)] mb-2">{t("adminRequired")}</h2>
                <p className="text-[15px] text-[var(--muted-foreground)] mb-6">
                    {t("adminRequiredDesc")}
                </p>
                <IOSButton
                    variant="gray"
                    onClick={() => router.push("/dashboard/production")}
                    className="px-6 h-[44px] text-[15px] font-medium"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("goBack")}
                </IOSButton>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                {/* KPI Stats Skeleton — matches real .kpi-panel / .kpi-grid auto-fit layout */}
                <div className="kpi-panel">
                    <div className="kpi-panel__glow"></div>
                    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="kpi-card flex flex-col justify-center min-h-[140px]"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="h-[48px] w-[48px] rounded-[14px] bg-[var(--muted)] shimmer" />
                                    <div className="h-[24px] w-[50px] rounded-full bg-[var(--muted)] shimmer" />
                                </div>
                                <div className="h-[34px] w-[120px] rounded-[8px] bg-[var(--muted)] shimmer mb-2" />
                                <div className="h-[16px] w-[90px] rounded-[6px] bg-[var(--muted)] shimmer" />
                            </div>
                        ))}
                    </div>
                </div>
                <Skeleton className="h-10 w-96" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Header ──────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)] mb-2 font-medium">
                        <button
                            onClick={() => router.push("/dashboard/production")}
                            className="hover:text-[var(--foreground)] transition-colors"
                        >
                            {t("breadcrumbProduction")}
                        </button>
                        <span>/</span>
                        <span className="text-[var(--muted-foreground)]">{t("breadcrumbMachines")}</span>
                    </div>
                    <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
                        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#007AFF]/20 to-[#5AC8FA]/20 dark:from-[#0A84FF]/20 dark:to-[#5AC8FA]/20 flex items-center justify-center">
                            <Cog className="h-6 w-6 text-[#007AFF] dark:text-[#5AC8FA]" />
                        </div>
                        {t("title")}
                    </h1>
                    <p className="text-[15px] sm:text-[17px] text-[var(--muted-foreground)] pt-1 w-full max-w-xl text-balance">
                        {t("subtitle")}
                    </p>
                </div>

                <IOSButton
                    variant="filled"
                    color="blue"
                    className="px-6 h-[44px] text-[15px] font-semibold"
                    onClick={openAddDialog}
                    id="add-machine-btn"
                >
                    <Plus className="h-5 w-5 mr-1" />
                    {t("addMachine")}
                </IOSButton>
            </motion.div>

            {/* ─── Stats ──────────────────────────────────────────── */}
            <div className="kpi-panel">
                <div className="kpi-panel__glow"></div>
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <StatWidget
                        label={t("totalMachines")}
                        value={machines.length}
                        change={0}
                        icon={Cpu}
                        color="blue"
                        delay={0}
                    />
                    <StatWidget
                        label={t("activeRunning")}
                        value={machines.filter((m) => m.status === "active" || m.status === "running").length}
                        change={14}
                        icon={Play}
                        color="green"
                        delay={1}
                    />
                    <StatWidget
                        label={t("idle")}
                        value={machines.filter((m) => m.status === "idle").length}
                        change={0}
                        icon={Pause}
                        color="gray"
                        delay={2}
                    />
                    <StatWidget
                        label={t("maintenance")}
                        value={machines.filter((m) => m.status === "maintenance").length}
                        change={-2}
                        icon={Wrench}
                        color="orange"
                        delay={3}
                    />
                    <StatWidget
                        label={t("disabled")}
                        value={machines.filter((m) => m.status === "inactive").length}
                        change={0}
                        icon={Power}
                        color="red"
                        delay={4}
                    />
                </div>
            </div>

            {/* ─── Search ─────────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
                <div className="relative max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]" />
                    <IOSInput
                        placeholder={t("searchMachines")}
                        className="pl-11 h-[48px] bg-white dark:bg-[#1C1C1E] shadow-sm"
                        value={searchTerm}
                        onChange={(e: any) => setSearchTerm(e.target.value)}
                        id="search-machines"
                    />
                </div>
            </motion.div>

            {/* ─── Machine List ────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
                {filteredMachines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center rounded-[24px] border-2 border-dashed border-[var(--border)]">
                        <Cpu className="h-10 w-10 text-[var(--muted-foreground)] mb-3" />
                        <h3 className="text-[17px] font-semibold text-[var(--foreground)] mb-1">
                            {machines.length === 0
                                ? t("noMachinesYet")
                                : t("noMachinesMatch")}
                        </h3>
                        <p className="text-[15px] text-[var(--muted-foreground)]">
                            {machines.length === 0
                                ? t("noMachinesYetDesc")
                                : t("noMachinesMatchDesc")}
                        </p>
                        {machines.length === 0 && (
                            <IOSButton
                                variant="filled"
                                color="blue"
                                className="mt-4 px-6 h-[44px] text-[15px] font-semibold"
                                onClick={openAddDialog}
                            >
                                <Plus className="h-5 w-5 mr-1" />
                                {t("addMachine")}
                            </IOSButton>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMachines.map((machine) => {
                            const sc = statusConfig[machine.status] || statusConfig.active;
                            const StatusIcon = sc.icon;
                            return (
                                <IOSCard
                                    key={machine.id}
                                    className="p-4 flex items-center justify-between hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30 transition-colors group cursor-pointer"
                                    onClick={() => openEditDialog(machine)}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div
                                            className={cn(
                                                "rounded-[12px] p-2.5 flex-shrink-0 border border-black/5 dark:border-white/5",
                                                sc.bg
                                            )}
                                        >
                                            <Cpu className={cn("h-6 w-6", sc.color)} />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-[17px] text-[var(--foreground)] truncate">
                                                    {machine.machineName}
                                                </span>
                                                <div className={cn("flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-current/20", sc.color, sc.bg)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {({ active: t("statusActive"), running: t("statusRunning"), idle: t("statusIdle"), inactive: t("statusDisabled"), maintenance: t("statusMaintenance") } as Record<string, string>)[machine.status] || sc.label}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-[13px] text-[var(--muted-foreground)]">
                                                {machine.machineType && (
                                                    <span>{machine.machineType}</span>
                                                )}
                                                {machine.capacity && (
                                                    <>
                                                        <span className="text-[var(--muted-foreground)]">•</span>
                                                        <span>{machine.capacity}</span>
                                                    </>
                                                )}
                                                <span className="text-[var(--muted-foreground)]">•</span>
                                                <span>
                                                    {t("added")}{" "}
                                                    {formatDate(machine.createdAt, "short")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                        <button
                                            className="h-9 w-9 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditDialog(machine);
                                            }}
                                            id={`edit-machine-${machine.id}`}
                                        >
                                            <PenLine className="h-4 w-4" />
                                        </button>
                                        <button
                                            className="h-9 w-9 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingMachine(machine);
                                                setDeleteDialogOpen(true);
                                            }}
                                            id={`delete-machine-${machine.id}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </IOSCard>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* ─── Add/Edit Dialog ─────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent fullScreenMobile className="sm:max-w-[480px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] overflow-hidden p-0">
                    <div className="p-6">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, marginBottom: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Cpu className="h-[18px] w-[18px] text-[#60a5fa]" />
                          </div>
                          <div>
                            <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: '22px', margin: 0 }}>
                              {dialogMode === "add" ? t("addMachine") : t("editMachine")}
                            </DialogTitle>
                            <DialogDescription style={{ fontSize: 13, color: '#64748b', lineHeight: '18px', margin: '2px 0 0' }}>
                              {dialogMode === "add" ? t("addMachineDesc") : t("editMachineDesc")}
                            </DialogDescription>
                          </div>
                        </div>

                        <div className="space-y-4 py-6">
                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                                    {t("machineName")} <span className="text-[#FF3B30]">*</span>
                                </label>
                                <IOSInput
                                    value={formName}
                                    onChange={(e: any) => setFormName(e.target.value)}
                                    placeholder={t("machineNamePlaceholder")}
                                    className="h-[44px]"
                                    id="machine-name-input"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                                    {t("machineType")}
                                </label>
                                <IOSInput
                                    value={formType}
                                    onChange={(e: any) => setFormType(e.target.value)}
                                    placeholder={t("machineTypePlaceholder")}
                                    className="h-[44px]"
                                    id="machine-type-input"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                                    {t("capacityDescription")}
                                </label>
                                <IOSInput
                                    value={formCapacity}
                                    onChange={(e: any) => setFormCapacity(e.target.value)}
                                    placeholder={t("capacityPlaceholder")}
                                    className="h-[44px]"
                                    id="machine-capacity-input"
                                />
                            </div>

                            {dialogMode === "edit" && (
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">
                                        {t("status")}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={formStatus}
                                            onChange={(e) => setFormStatus(e.target.value)}
                                            className="w-full h-[44px] px-4 rounded-[12px] bg-[var(--muted)] hover:bg-[var(--accent)] border-transparent text-[15px] font-medium focus:ring-[3px] focus:ring-[#007AFF]/30 focus:border-[#007AFF] outline-none transition-all appearance-none text-[var(--foreground)]"
                                            id="machine-status-select"
                                        >
                                            <option value="active">{t("statusActive")}</option>
                                            <option value="running">{t("statusRunning")}</option>
                                            <option value="idle">{t("statusIdle")}</option>
                                            <option value="maintenance">{t("statusMaintenance")}</option>
                                            <option value="inactive">{t("statusDisabled")}</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24, paddingBottom: 8 }}>
                            <button
                                onClick={() => setDialogOpen(false)}
                                style={{ flex: 1, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.10)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                            >
                                {tCommon("cancel")}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !formName.trim()}
                                id="save-machine-btn"
                                style={{ flex: 1, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 4px 16px rgba(59,130,246,0.25)', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: (saving || !formName.trim()) ? 0.5 : 1 }}
                            >
                                {saving ? t("saving") : dialogMode === "add" ? t("addMachine") : t("saveChanges")}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation Dialog ─────────────────────── */}
            <ConfirmDeleteSheet
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                isDeleting={deleting}
                entityLabel="machine"
                entityName={selectedMachine?.name}
                consequenceText="will be permanently removed from machine management. This cannot be undone."
            />
        </motion.div>
    );
}
