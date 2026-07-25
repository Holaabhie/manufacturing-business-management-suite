"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner"; // Sonner toast notification library
import {
    Users, Search, Plus, Shield, ShieldAlert, UserCog, Mail, Calendar,
    ChevronRight, MoreHorizontal, Power, PowerOff, KeyRound, Copy, Check,
    AlertTriangle, Clock, Activity, BadgeCheck, Building2, Phone, CheckCircle,
    Filter, ArrowUpDown, Eye, EyeOff, Trash2, Loader2, Hash, X,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- iOS Components ---
import {
    IOSButton,
    IOSCard,
    IOSCardHeader,
    IOSCardContent,
    IOSBadge,
    IOSInput,
    IOSSelect
} from "@/components/ui/ios";

// Import staggered animations
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { StatWidget } from "@/components/ui/StatWidget";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportToExcel } from "@/lib/excel-export";
import { AccessDenied } from "@/components/AccessDenied";

// ─── Types ──────────────────────────────────────────────────────
interface Employee {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    role: "Admin" | "Staff";
    status: "active" | "inactive" | "suspended" | "pending_setup";
    permissionTemplate: string;
    lastLogin: string | null;
    lastActiveAt: string | null;
    createdAt: string;
    firstLoginCompleted: boolean;
    avatar_url: string | null;
}

type StatusFilter = "all" | "active" | "inactive" | "pending_setup";
type DepartmentFilter = string;

const TEMPLATE_LABELS: Record<string, string> = {
    full_access: "Full Access",
    operations: "Operations",
    sales: "Sales Executive",
    view_only: "View Only",
    custom: "Custom",
};

const DEPARTMENTS = [
    "General", "Production", "Warehouse", "Quality Control",
    "Sales", "Accounts", "Logistics", "Administration",
];

// ─── Status Badge Component ─────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: {
            label: "Active",
            classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
            icon: Check,
        },
        inactive: {
            label: "Disabled",
            classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
            icon: PowerOff,
        },
        suspended: {
            label: "Suspended",
            classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
            icon: AlertTriangle,
        },
        pending_setup: {
            label: "Pending Setup",
            classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
            icon: Clock,
        },
    };

    const c = config[status] || config.active;
    const Icon = c.icon;

    return (
        <IOSBadge variant="tinted" color={c.classes.includes('emerald') ? 'green' : c.classes.includes('red') ? 'red' : c.classes.includes('amber') ? 'orange' : 'blue'} className="gap-1 px-1.5 py-0.5 rounded-[6px] font-semibold text-[11px] uppercase tracking-wider">
            <Icon className="h-3 w-3" />
            {c.label}
        </IOSBadge>
    );
}

// ═════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════
export default function EmployeeManagementPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>("all");
    const [sortField, setSortField] = useState<"fullName" | "createdAt" | "lastActiveAt">("createdAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // Add Employee Dialog
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpEmail, setNewEmpEmail] = useState("");
    const [newEmpPhone, setNewEmpPhone] = useState("");
    const [newEmpDept, setNewEmpDept] = useState("General");
    const [newEmpDesignation, setNewEmpDesignation] = useState("");
    const [newEmpTemplate, setNewEmpTemplate] = useState("operations");
    const [newEmpPassword, setNewEmpPassword] = useState("");
    const [newEmpConfirmPassword, setNewEmpConfirmPassword] = useState("");
    const [showNewEmpPassword, setShowNewEmpPassword] = useState(false);

    // Success / Credential Display
    const [showCredentials, setShowCredentials] = useState(false);
    const [createdEmployee, setCreatedEmployee] = useState<{
        employeeId: string; email: string; fullName: string;
    } | null>(null);
    const [copiedId, setCopiedId] = useState(false);
    const [copiedPwd, setCopiedPwd] = useState(false);

    // Action Dialog
    const [actionTarget, setActionTarget] = useState<Employee | null>(null);
    const [actionType, setActionType] = useState<"deactivate" | "activate" | "delete" | "reset_password" | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

    // Change Password Dialog
    const [changePwdTarget, setChangePwdTarget] = useState<Employee | null>(null);
    const [changePwdStep, setChangePwdStep] = useState<"form" | "success">("form");
    const [changePwdNewPassword, setChangePwdNewPassword] = useState("");
    const [changePwdConfirm, setChangePwdConfirm] = useState("");
    const [changePwdAdminPassword, setChangePwdAdminPassword] = useState("");
    const [changePwdShowNew, setChangePwdShowNew] = useState(false);
    const [changePwdShowConfirm, setChangePwdShowConfirm] = useState(false);
    const [changePwdShowAdmin, setChangePwdShowAdmin] = useState(false);
    const [changePwdLoading, setChangePwdLoading] = useState(false);

    // ─── Fetch Data ─────────────────────────────────────
    const fetchData = async () => {
        try {
            const meRes = await fetch("/api/auth/me");
            const meData = await meRes.json();
            const myRole = meData?.user?.role || null;
            setCurrentUserRole(myRole);
            setRoleLoading(false);

            if (myRole === "Admin") {
                const empRes = await fetch("/api/employees");
                if (empRes.ok) {
                    const empData = await empRes.json();
                    setEmployees(empData.employees || []);
                }
            }
        } catch {
            sonnerToast.error("Failed to load employee data");
        } finally {
            setLoading(false);
            setRoleLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ─── Add Employee ───────────────────────────────────
    const handleAddEmployee = async () => {
        if (!newEmpName.trim()) { sonnerToast.error("Employee name is required"); return; }
        if (!newEmpEmail.trim()) { sonnerToast.error("Email is required for staff accounts"); return; }
        if (!newEmpPassword) { sonnerToast.error("Password is required"); return; }
        if (newEmpPassword.length < 8) { sonnerToast.error("Password must be at least 8 characters"); return; }
        if (!/[A-Z]/.test(newEmpPassword)) { sonnerToast.error("Password must contain an uppercase letter"); return; }
        if (!/[a-z]/.test(newEmpPassword)) { sonnerToast.error("Password must contain a lowercase letter"); return; }
        if (!/[0-9]/.test(newEmpPassword)) { sonnerToast.error("Password must contain a number"); return; }
        if (newEmpPassword !== newEmpConfirmPassword) { sonnerToast.error("Passwords do not match"); return; }

        setAdding(true);
        try {
            const res = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: newEmpName.trim(),
                    email: newEmpEmail.trim(),
                    phone: newEmpPhone.trim(),
                    department: newEmpDept,
                    designation: newEmpDesignation.trim(),
                    permissionTemplate: newEmpTemplate,
                    password: newEmpPassword,
                }),
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.message || "Failed to create employee");

            // Show credentials
            setCreatedEmployee({
                employeeId: json.employee.employeeId,
                email: json.employee.email,
                fullName: json.employee.fullName,
            });
            setShowAddDialog(false);
            setShowCredentials(true);

            // Reset
            setNewEmpName(""); setNewEmpEmail(""); setNewEmpPhone("");
            setNewEmpDept("General"); setNewEmpDesignation(""); setNewEmpTemplate("operations");
            setNewEmpPassword(""); setNewEmpConfirmPassword("");

            // Refresh list
            fetchData();
            sonnerToast.success(`Employee ${json.employee.fullName} created!`);
        } catch (error: any) {
            sonnerToast.error(error.message);
        } finally {
            setAdding(false);
        }
    };

    // ─── Handle Actions ─────────────────────────────────
    const handleAction = async () => {
        if (!actionTarget || !actionType) return;

        setActionLoading(true);
        try {
            if (actionType === "delete") {
                const res = await fetch(`/api/employees/${actionTarget.id}`, { method: "DELETE" });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Failed to delete employee");
                sonnerToast.success(`${actionTarget.fullName} permanently removed`); // uses local state, not json
                setEmployees(prev => prev.filter(e => e.id !== actionTarget.id));
            } else if (actionType === "deactivate" || actionType === "activate") {
                const res = await fetch(`/api/employees/${actionTarget.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "toggle_status" }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Failed to update status");
                sonnerToast.success(`${actionTarget.fullName} ${json.status === "active" ? "activated" : "deactivated"}`);
                setEmployees(prev =>
                    prev.map(e => e.id === actionTarget.id ? { ...e, status: json.status } : e)
                );
            } else if (actionType === "reset_password") {
                const res = await fetch(`/api/employees/${actionTarget.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reset_password" }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message || "Failed to reset password");
                setResetPasswordResult(json.tempPassword);
                sonnerToast.success("Password reset successfully");
                return; // Don't close dialog yet
            }
        } catch (error: any) {
            sonnerToast.error(error.message);
        } finally {
            setActionLoading(false);
            if (actionType !== "reset_password") {
                setActionTarget(null);
                setActionType(null);
            }
        }
    };

    // ─── Change Password (admin-typed) ────────────────────
    const handleChangePassword = async () => {
        if (!changePwdTarget) return;
        if (changePwdNewPassword.length < 8) { sonnerToast.error("Password must be at least 8 characters"); return; }
        if (!/[A-Z]/.test(changePwdNewPassword)) { sonnerToast.error("Password must contain an uppercase letter"); return; }
        if (!/[a-z]/.test(changePwdNewPassword)) { sonnerToast.error("Password must contain a lowercase letter"); return; }
        if (!/[0-9]/.test(changePwdNewPassword)) { sonnerToast.error("Password must contain a number"); return; }
        if (changePwdNewPassword !== changePwdConfirm) { sonnerToast.error("Passwords do not match"); return; }

        setChangePwdLoading(true);
        try {
            const res = await fetch(`/api/employees/${changePwdTarget.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "change_password",
                    newPassword: changePwdNewPassword,
                    adminPassword: changePwdAdminPassword || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to change password");
            setChangePwdStep("success");
            sonnerToast.success(json.message || `Password updated for ${changePwdTarget.fullName}`);
        } catch (error: any) {
            sonnerToast.error(error.message);
        } finally {
            setChangePwdLoading(false);
        }
    };

    const resetChangePwdDialog = () => {
        setChangePwdTarget(null);
        setChangePwdStep("form");
        setChangePwdNewPassword("");
        setChangePwdConfirm("");
        setChangePwdAdminPassword("");
        setChangePwdShowNew(false);
        setChangePwdShowConfirm(false);
        setChangePwdShowAdmin(false);
    };

    const changePwdStrength = useMemo(() => {
        const p = changePwdNewPassword;
        if (!p) return { score: 0, label: "", color: "" };
        let score = 0;
        if (p.length >= 8) score += 20;
        if (p.length >= 12) score += 10;
        if (p.length >= 16) score += 10;
        if (/[A-Z]/.test(p)) score += 15;
        if (/[a-z]/.test(p)) score += 10;
        if (/[0-9]/.test(p)) score += 15;
        if (/[^A-Za-z0-9]/.test(p)) score += 20;
        score = Math.min(100, score);
        if (score < 30) return { score, label: "Weak", color: "bg-red-500" };
        if (score < 55) return { score, label: "Fair", color: "bg-amber-500" };
        if (score < 80) return { score, label: "Good", color: "bg-blue-500" };
        return { score, label: "Strong", color: "bg-emerald-500" };
    }, [changePwdNewPassword]);

    // ─── Computed ───────────────────────────────────────
    const filteredEmployees = useMemo(() => {
        let list = [...employees];

        // Search
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(e =>
                e.fullName.toLowerCase().includes(q) ||
                e.employeeId.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.department.toLowerCase().includes(q) ||
                e.designation.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            if (statusFilter === "pending_setup") {
                list = list.filter(e => !e.firstLoginCompleted);
            } else {
                list = list.filter(e => e.status === statusFilter);
            }
        }

        // Department filter
        if (departmentFilter !== "all") {
            list = list.filter(e => e.department === departmentFilter);
        }

        // Sort
        list.sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortField === "fullName") { aVal = a.fullName; bVal = b.fullName; }
            else if (sortField === "lastActiveAt") { aVal = a.lastActiveAt || ""; bVal = b.lastActiveAt || ""; }
            else { aVal = a.createdAt; bVal = b.createdAt; }

            const cmp = String(aVal).localeCompare(String(bVal));
            return sortDir === "asc" ? cmp : -cmp;
        });

        return list;
    }, [employees, searchTerm, statusFilter, departmentFilter, sortField, sortDir]);

    const stats = useMemo(() => ({
        total: employees.length,
        active: employees.filter(e => e.status === "active").length,
        inactive: employees.filter(e => e.status === "inactive").length,
        pendingSetup: employees.filter(e => !e.firstLoginCompleted).length,
    }), [employees]);

    const departments = useMemo(() => {
        const set = new Set(employees.map(e => e.department));
        return Array.from(set).sort();
    }, [employees]);

    // ─── Copy helper ─────────────────────────────
    const copyToClipboard = async (text: string, type: "id" | "pwd") => {
        await navigator.clipboard.writeText(text);
        if (type === "id") { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
        else { setCopiedPwd(true); setTimeout(() => setCopiedPwd(false), 2000); }
    };

    // ─── Time ago helper ─────────────────────────
    const timeAgo = (date: string | null) => {
        if (!date) return "Never";
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    const exportToXLSX = () => {
        const columns = [
            { header: "Name", key: "fullName" },
            { header: "Role", key: "role_display" },
            { header: "Join Date", key: "createdAt" },
            { header: "Status", key: "status" },
        ];

        const dataToExport = employees.map(emp => ({
            ...emp,
            role_display: emp.designation || emp.role,
            createdAt: new Date(emp.createdAt).toLocaleDateString("en-IN")
        }));

        exportToExcel(
            `staff_${new Date().toISOString().split("T")[0]}.xlsx`,
            "Staff",
            dataToExport,
            columns
        );
        sonnerToast.success("Staff Excel downloaded!");
    };

    // ─── Guards ─────────────────────────────────────────
    if (roleLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
                    <p className="text-sm text-muted-foreground">Loading employee management...</p>
                </div>
            </div>
        );
    }

    if (currentUserRole !== "Admin") {
        return (
            <AccessDenied
                title="Restricted Access"
                description="Employee management is restricted to administrators only."
            />
        );
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="space-y-6 max-w-[1400px] mx-auto pb-20">
                {/* ─── Legacy Accounts Banner ─────────────────────── */}
                {employees.some(e => e.email?.endsWith("@staff.local") || !e.email) && (
                    <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[14px] font-semibold text-amber-500 dark:text-amber-400">Legacy Staff Accounts Detected</p>
                            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                                {employees.filter(e => e.email?.endsWith("@staff.local") || !e.email).length} staff account(s) are missing email addresses and use legacy Employee ID login.
                                Update their profiles with a real email for secure authentication.
                            </p>
                        </div>
                    </div>
                )}

                {/* ─── Header ──────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-[28px] font-bold tracking-tight flex items-center gap-3 text-[var(--foreground)]">
                            <div className="h-10 w-10 rounded-[12px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-lg shadow-[#007AFF]/30">
                                <Users className="h-5 w-5 text-white" />
                            </div>
                            Employee Management
                        </h1>
                        <p className="text-[13px] text-[var(--muted-foreground)] mt-1.5">Create, manage, and monitor your workforce.</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={exportToXLSX}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-[rgba(255,255,255,0.08)] hover:bg-white/15 text-white text-xs font-medium cursor-pointer transition-all duration-150"
                            title="Excel Export"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                                <rect width="24" height="24" rx="4" fill="#217346"/>
                                <path d="M14 3v5h4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5"/>
                                <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">XLS</text>
                            </svg>
                            <span>Export</span>
                        </button>
                        <IOSButton
                            variant="filled"
                            color="blue"
                            onClick={() => setShowAddDialog(true)}
                            className="shadow-md"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Employee
                        </IOSButton>
                    </div>
                </div>

                {/* ─── KPI Summary ─────────────────────────────────── */}
                <div className="kpi-panel">
                    <div className="kpi-panel__glow"></div>
                    <div className="kpi-grid">
                        <StatWidget
                            label="Total Staff"
                            value={stats.total}
                            change={0}
                            icon={Users}
                            color="blue"
                            delay={0}
                        />
                        <StatWidget
                            label="Active"
                            value={stats.active}
                            change={0}
                            icon={BadgeCheck}
                            color="green"
                            delay={1}
                        />
                        <StatWidget
                            label="Disabled"
                            value={stats.inactive}
                            change={0}
                            icon={PowerOff}
                            color="red"
                            delay={2}
                        />
                        <StatWidget
                            label="Pending Setup"
                            value={stats.pendingSetup}
                            change={0}
                            icon={Clock}
                            color="orange"
                            delay={3}
                        />
                    </div>
                </div>

                {/* ─── Toolbar ─────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center w-full">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] z-10" />
                        <IOSInput
                            placeholder="Search by name, ID, email, dept..."
                            className="pl-9 h-11 bg-[var(--muted)] dark:bg-[var(--muted)] text-[15px]"
                            value={searchTerm}
                            onChange={(e: any) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        <div className="w-[140px] flex-shrink-0">
                            <IOSSelect
                                value={statusFilter}
                                onChange={(e: any) => setStatusFilter(e.target.value)}
                                label={<div className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Status</div>}
                                options={[
                                    { value: "all", label: "All Status" },
                                    { value: "active", label: "Active" },
                                    { value: "inactive", label: "Disabled" },
                                    { value: "pending_setup", label: "Pending Setup" },
                                ]}
                            />
                        </div>

                        <div className="w-[150px] flex-shrink-0">
                            <IOSSelect
                                value={departmentFilter}
                                onChange={(e: any) => setDepartmentFilter(e.target.value)}
                                label={<div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dept</div>}
                                options={[
                                    { value: "all", label: "All Depts" },
                                    ...departments.map(d => ({ value: d, label: d }))
                                ]}
                            />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className="h-[44px] w-[44px] flex items-center justify-center rounded-[10px] bg-[var(--muted)] dark:bg-[var(--muted)] hover:bg-[var(--muted)] transition-colors border border-[var(--border)] flex-shrink-0 text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                                    onClick={() => {
                                        if (sortField === "createdAt") { setSortField("fullName"); setSortDir("asc"); }
                                        else if (sortField === "fullName") { setSortField("lastActiveAt"); setSortDir("desc"); }
                                        else { setSortField("createdAt"); setSortDir("desc"); }
                                    }}
                                >
                                    <ArrowUpDown className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[11px] font-semibold tracking-wide bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-md border-zinc-200 dark:border-zinc-700">
                                Sort: {sortField === "createdAt" ? "Date Added" : sortField === "fullName" ? "Name (A→Z)" : "Last Active"} {sortDir === "asc" ? "↑" : "↓"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* ─── Employee Table ──────────────────────────────── */}
                <IOSCard variant="elevated" className="border-0 shadow-[var(--shadow-sm)] overflow-hidden bg-[var(--muted)] dark:bg-[var(--muted)] p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 min-w-[80px]">ID</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 w-full">Employee</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell min-w-[120px]">Department</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden lg:table-cell min-w-[140px]">Permissions</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 min-w-[120px]">Status</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell min-w-[120px]">Last Active</th>
                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="h-48 text-center text-[var(--muted-foreground)]">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--primary)]" />
                                            <p className="text-[13px]">Loading employees...</p>
                                        </td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="h-48 text-center">
                                            <Users className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
                                            <p className="font-semibold text-[var(--muted-foreground)]">
                                                {employees.length === 0 ? "No employees yet" : "No employees match filters"}
                                            </p>
                                            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">
                                                {employees.length === 0
                                                    ? "Click \"Add Employee\" to create your first staff member."
                                                    : "Try adjusting your search or filters."}
                                            </p>
                                            {employees.length === 0 && (
                                                <IOSButton
                                                    variant="filled"
                                                    color="blue"
                                                    className="mt-4 mx-auto"
                                                    onClick={() => setShowAddDialog(true)}
                                                >
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    Add First Employee
                                                </IOSButton>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((emp, idx) => (
                                        <motion.tr
                                            key={emp.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 30 }}
                                            className="group border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors cursor-pointer"
                                            onClick={() => router.push(`/dashboard/users/${emp.id}`)}
                                        >
                                            <td className="px-6 py-3.5">
                                                <span className="font-mono text-[11px] text-[var(--muted-foreground)] font-semibold bg-[var(--muted)] px-1.5 py-0.5 rounded-[6px]">
                                                    {emp.employeeId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-[15px] flex-shrink-0 bg-gradient-to-br from-[#007AFF] to-[#5856D6] shadow-sm">
                                                        {emp.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-[15px] text-[var(--foreground)] truncate">{emp.fullName}</span>
                                                            {!emp.firstLoginCompleted && (
                                                                <IOSBadge variant="outline" color="orange" className="text-[9px] px-1 py-0 border-amber-300">NEW</IOSBadge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                                                            {emp.email && !emp.email.endsWith("@staff.local") && (
                                                                <span className="flex items-center gap-0.5 truncate">
                                                                    <Mail className="h-3 w-3" />{emp.email}
                                                                </span>
                                                            )}
                                                            {emp.designation && (
                                                                <span className="hidden lg:inline truncate">{emp.designation}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 hidden md:table-cell text-[14px] text-[var(--muted-foreground)]">
                                                {emp.department}
                                            </td>
                                            <td className="px-6 py-3.5 hidden lg:table-cell">
                                                <IOSBadge variant="outline" color="gray" className="text-[11px] font-medium uppercase tracking-wider">
                                                    {TEMPLATE_LABELS[emp.permissionTemplate] || emp.permissionTemplate}
                                                </IOSBadge>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <StatusBadge status={emp.status} />
                                            </td>
                                            <td className="px-6 py-3.5 hidden md:table-cell text-[12px] text-[var(--muted-foreground)]">
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="h-3 w-3" />
                                                    {timeAgo(emp.lastActiveAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--muted)] text-[var(--muted-foreground)] focus:opacity-100">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-[14px] shadow-[var(--shadow-lg)] border-[var(--border)]">
                                                        <DropdownMenuItem className="text-[13px] rounded-[8px] cursor-pointer" onClick={() => router.push(`/dashboard/users/${emp.id}`)}>
                                                            <Eye className="mr-2 h-4 w-4" />View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-[var(--border)]" />
                                                        <DropdownMenuItem className="text-[13px] rounded-[8px] cursor-pointer" onClick={() => setChangePwdTarget(emp)}>
                                                            <KeyRound className="mr-2 h-4 w-4 text-[var(--erp-warning)]" />Change Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-[13px] rounded-[8px] cursor-pointer" onClick={() => { setActionTarget(emp); setActionType("reset_password"); }}>
                                                            <KeyRound className="mr-2 h-4 w-4" />Auto-Reset Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-[13px] rounded-[8px] cursor-pointer" onClick={() => { setActionTarget(emp); setActionType(emp.status === "active" ? "deactivate" : "activate"); }}>
                                                            {emp.status === "active" ? (
                                                                <><PowerOff className="mr-2 h-4 w-4 text-[var(--destructive)]" /><span className="text-[var(--destructive)]">Deactivate</span></>
                                                            ) : (
                                                                <><Power className="mr-2 h-4 w-4 text-[var(--erp-success)]" /><span className="text-[var(--erp-success)]">Activate</span></>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-[var(--border)]" />
                                                        <DropdownMenuItem
                                                            className="text-[13px] rounded-[8px] cursor-pointer text-[var(--destructive)] focus:bg-[var(--destructive)]/10 focus:text-[var(--destructive)]"
                                                            onClick={() => { setActionTarget(emp); setActionType("delete"); }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />Delete Employee
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </IOSCard>

                {filteredEmployees.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                        Showing {filteredEmployees.length} of {employees.length} employees
                    </p>
                )}

                {/* ═══════════════════════════════════════════════════════
            ADD EMPLOYEE DIALOG
        ═══════════════════════════════════════════════════════ */}
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="sm:max-w-lg bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Plus className="h-[18px] w-[18px] text-[#60a5fa]" />
                                </div>
                                <div>
                                    <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Add New Employee</DialogTitle>
                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Set up login credentials for new staff</DialogDescription>
                                </div>
                            </div>

                            <div className="grid gap-4 py-6">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Full Name *</label>
                                    <IOSInput
                                        placeholder="e.g. Rajesh Kumar"
                                        value={newEmpName}
                                        onChange={(e: any) => setNewEmpName(e.target.value)}
                                        className="h-11"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Email *</label>
                                        <IOSInput
                                            type="email"
                                            placeholder="employee@company.com"
                                            value={newEmpEmail}
                                            onChange={(e: any) => setNewEmpEmail(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Phone</label>
                                        <IOSInput
                                            type="tel"
                                            placeholder="+91..."
                                            value={newEmpPhone}
                                            onChange={(e: any) => setNewEmpPhone(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <IOSSelect
                                            value={newEmpDept}
                                            onChange={(e: any) => setNewEmpDept(e.target.value)}
                                            label="Department"
                                            options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Designation</label>
                                        <IOSInput
                                            placeholder="e.g. Machine Operator"
                                            value={newEmpDesignation}
                                            onChange={(e: any) => setNewEmpDesignation(e.target.value)}
                                            className="h-[44px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <IOSSelect
                                        value={newEmpTemplate}
                                        onChange={(e: any) => setNewEmpTemplate(e.target.value)}
                                        label="Permission Template"
                                        options={[
                                            { value: "full_access", label: "Full Access Staff - All operational modules" },
                                            { value: "operations", label: "Operations Staff - Orders, Production, Inventory" },
                                            { value: "sales", label: "Sales Executive - Orders & Clients focus" },
                                            { value: "view_only", label: "View Only - Read-only access everywhere" },
                                        ]}
                                    />
                                </div>

                                {/* Password Fields */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Password *</label>
                                        <div className="relative">
                                            <IOSInput
                                                type={showNewEmpPassword ? "text" : "password"}
                                                placeholder="Min 8 chars"
                                                value={newEmpPassword}
                                                onChange={(e: any) => setNewEmpPassword(e.target.value)}
                                                className="h-11 pr-10"
                                            />
                                            <button type="button" onClick={() => setShowNewEmpPassword(!showNewEmpPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                                                {showNewEmpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Confirm Password *</label>
                                        <IOSInput
                                            type="password"
                                            placeholder="Re-enter password"
                                            value={newEmpConfirmPassword}
                                            onChange={(e: any) => setNewEmpConfirmPassword(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                {/* Password Strength */}
                                {newEmpPassword && (
                                    <div className="px-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${
                                                    newEmpPassword.length < 8 ? 'w-[20%] bg-red-500' :
                                                    !/[A-Z]/.test(newEmpPassword) || !/[a-z]/.test(newEmpPassword) ? 'w-[50%] bg-amber-500' :
                                                    !/[0-9]/.test(newEmpPassword) ? 'w-[75%] bg-blue-500' : 'w-full bg-emerald-500'
                                                }`} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                                            <span className={newEmpPassword.length >= 8 ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}>✓ 8+ chars</span>
                                            <span className={/[A-Z]/.test(newEmpPassword) ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}>✓ Uppercase</span>
                                            <span className={/[a-z]/.test(newEmpPassword) ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}>✓ Lowercase</span>
                                            <span className={/[0-9]/.test(newEmpPassword) ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}>✓ Number</span>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 rounded-[12px] bg-[var(--muted)] dark:bg-[var(--muted)] border border-[var(--border)]">
                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Shield className="h-3 w-3 text-[#007AFF]" />
                                        </div>
                                        <div className="text-[13px] text-[var(--muted-foreground)] space-y-2">
                                            <p className="font-semibold text-[var(--foreground)]">What happens next?</p>
                                            <ul className="space-y-1">
                                                <li>• A unique Employee ID (EMP-XXXX) will be generated</li>
                                                <li>• Staff will log in using their email and password</li>
                                                <li>• Share the email and password securely</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex gap-2 pt-2 border-t border-[var(--border)] border-x-[-24px] mx-[-24px] px-6 pb-2">
                                <IOSButton variant="gray" onClick={() => setShowAddDialog(false)} className="flex-1">Cancel</IOSButton>
                                <IOSButton
                                    variant="filled"
                                    color="blue"
                                    onClick={handleAddEmployee}
                                    disabled={adding || !newEmpName.trim() || !newEmpEmail.trim() || !newEmpPassword || newEmpPassword !== newEmpConfirmPassword}
                                    className="flex-1"
                                >
                                    {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                                    {adding ? "Creating..." : "Create Employee"}
                                </IOSButton>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ═══════════════════════════════════════════════════════
            CREDENTIALS DIALOG (shown after creation)
        ═══════════════════════════════════════════════════════ */}
                <Dialog open={showCredentials} onOpenChange={(open) => { if (!open) { setShowCredentials(false); setCreatedEmployee(null); setCopiedId(false); setCopiedPwd(false); } }}>
                    <DialogContent className="sm:max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6 text-center space-y-4">
                            <div className="h-14 w-14 rounded-[16px] bg-[#34C759]/10 mx-auto flex items-center justify-center mb-2">
                                <BadgeCheck className="h-7 w-7 text-[#34C759]" />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <CheckCircle className="h-[18px] w-[18px] text-[#4ade80]" />
                                </div>
                                <div>
                                    <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Employee Created</DialogTitle>
                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Share login details with {createdEmployee?.fullName}</DialogDescription>
                                </div>
                            </div>

                            {createdEmployee && (
                                <div className="space-y-4 pt-2">
                                    <div className="p-4 rounded-[16px] bg-[#34C759]/10 border border-[#34C759]/20 text-left">
                                        <div className="flex items-center gap-2 mb-3 px-1">
                                            <CheckCircle className="h-4 w-4 text-[#34C759]" />
                                            <p className="text-[13px] font-semibold text-[#34C759]">Account created successfully!</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between bg-white dark:bg-black rounded-[12px] px-3.5 py-3 shadow-sm border border-[var(--border)]">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">Login Email</p>
                                                    <p className="font-medium text-[15px] text-[var(--foreground)]">{createdEmployee.email}</p>
                                                </div>
                                                <button
                                                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                                                    onClick={() => copyToClipboard(createdEmployee.email, "pwd")}
                                                >
                                                    {copiedPwd ? <Check className="h-4 w-4 text-[#34C759]" /> : <Copy className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between bg-white dark:bg-black rounded-[12px] px-3.5 py-3 shadow-sm border border-[var(--border)]">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">Employee ID (Internal)</p>
                                                    <p className="font-mono font-bold text-[17px] text-[var(--foreground)]">{createdEmployee.employeeId}</p>
                                                </div>
                                                <button
                                                    className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                                                    onClick={() => copyToClipboard(createdEmployee.employeeId, "id")}
                                                >
                                                    {copiedId ? <Check className="h-4 w-4 text-[#34C759]" /> : <Copy className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-[13px] text-[var(--muted-foreground)]">
                                        Staff will log in using their <strong>email and password</strong> on the Staff Portal.
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <IOSButton
                                    variant="filled"
                                    color="blue"
                                    className="w-full text-[15px] font-semibold"
                                    onClick={() => { setShowCredentials(false); setCreatedEmployee(null); }}
                                >
                                    Done
                                </IOSButton>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ═══════════════════════════════════════════════════════
            ACTION CONFIRMATION DIALOG
        ═══════════════════════════════════════════════════════ */}
                <Dialog
                    open={!!actionTarget && !!actionType}
                    onOpenChange={(open) => {
                        if (!open) { setActionTarget(null); setActionType(null); setResetPasswordResult(null); }
                    }}
                >
                    <DialogContent className="sm:max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] p-6 text-center overflow-hidden">
                        {/* Icon Header */}
                        <div className={`h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-2 ${actionType === "delete" ? "bg-[#FF3B30]/10 text-[#FF3B30]" : actionType === "deactivate" ? "bg-[#FF9500]/10 text-[#FF9500]" : actionType === "activate" ? "bg-[#34C759]/10 text-[#34C759]" : "bg-[#007AFF]/10 text-[#007AFF]"}`}>
                            {actionType === "delete" && <Trash2 className="h-7 w-7" />}
                            {actionType === "deactivate" && <PowerOff className="h-7 w-7" />}
                            {actionType === "activate" && <Power className="h-7 w-7" />}
                            {actionType === "reset_password" && <KeyRound className="h-7 w-7" />}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: actionType === "delete" ? "linear-gradient(135deg, rgba(239,68,68,0.4), rgba(255,255,255,0.06))" : actionType === "activate" ? "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))" : "linear-gradient(135deg, rgba(245,158,11,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {actionType === "delete" ? <Trash2 className="h-[18px] w-[18px] text-[#f87171]" /> : actionType === "activate" ? <CheckCircle className="h-[18px] w-[18px] text-[#4ade80]" /> : <AlertTriangle className="h-[18px] w-[18px] text-[#fbbf24]" />}
                            </div>
                            <div>
                            <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>
                                {actionType === "delete" && "Delete Employee"}
                                {actionType === "deactivate" && "Deactivate Employee"}
                                {actionType === "activate" && "Activate Employee"}
                                {actionType === "reset_password" && (resetPasswordResult ? "Password Reset Complete" : "Reset Password")}
                            </DialogTitle>
                            <DialogDescription className="text-[15px] pt-1 text-[var(--muted-foreground)]">
                                {actionType === "delete" && (
                                    <>This will permanently remove <strong>{actionTarget?.fullName}</strong> ({actionTarget?.employeeId}) and delete all their data. This cannot be undone.</>
                                )}
                                {actionType === "deactivate" && (
                                    <>This will disable <strong>{actionTarget?.fullName}</strong>&apos;s account and terminate active sessions. They will be unable to log in.</>
                                )}
                                {actionType === "activate" && (
                                    <>This will re-enable <strong>{actionTarget?.fullName}</strong>&apos;s account. They will be able to log in again.</>
                                )}
                                {actionType === "reset_password" && !resetPasswordResult && (
                                    <>This will generate a new password for <strong>{actionTarget?.fullName}</strong> ({actionTarget?.employeeId}) and terminate all their active sessions.</>
                                )}
                            </DialogDescription>
                        </div></div>

                        {/* Reset Password Result */}
                        {actionType === "reset_password" && resetPasswordResult && (
                            <div className="py-5">
                                <div className="flex items-center justify-between bg-white dark:bg-black rounded-[12px] px-3.5 py-3 shadow-[var(--shadow-sm)] border border-[var(--border)] mx-2">
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">New Password</p>
                                        <p className="font-mono font-bold text-[18px] text-[var(--foreground)]">{resetPasswordResult}</p>
                                    </div>
                                    <button
                                        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
                                        onClick={() => copyToClipboard(resetPasswordResult, "pwd")}
                                    >
                                        {copiedPwd ? <Check className="h-4 w-4 text-[#34C759]" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                                <p className="text-[13px] text-[var(--muted-foreground)] mt-3">
                                    Share this password securely with the employee.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-6">
                            {resetPasswordResult ? (
                                <IOSButton
                                    variant="filled"
                                    color="blue"
                                    className="w-full text-[15px] font-semibold"
                                    onClick={() => { setActionTarget(null); setActionType(null); setResetPasswordResult(null); }}
                                >
                                    Done
                                </IOSButton>
                            ) : (
                                <>
                                    <IOSButton variant="gray" className="flex-1 text-[15px] font-semibold" onClick={() => { setActionTarget(null); setActionType(null); }}>
                                        Cancel
                                    </IOSButton>
                                    <IOSButton
                                        variant="filled"
                                        color={actionType === "delete" ? "red" : actionType === "deactivate" ? "orange" : actionType === "activate" ? "green" : "blue"}
                                        className="flex-1 text-[15px] font-semibold"
                                        onClick={handleAction}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                                        {actionType === "delete" && "Delete"}
                                        {actionType === "deactivate" && "Deactivate"}
                                        {actionType === "activate" && "Activate"}
                                        {actionType === "reset_password" && "Reset"}
                                    </IOSButton>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ═══════════════════════════════════════════════════════
            CHANGE PASSWORD DIALOG
        ═══════════════════════════════════════════════════════ */}
                <Dialog open={!!changePwdTarget} onOpenChange={(open) => { if (!open) resetChangePwdDialog(); }}>
                    <DialogContent className="sm:max-w-lg bg-[var(--muted)] dark:bg-[var(--muted)] backdrop-blur-[40px] border border-[var(--border)] shadow-[var(--shadow-lg)] rounded-[24px] p-0 overflow-hidden">
                        <div className="p-6">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(245,158,11,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <KeyRound className="h-[18px] w-[18px] text-[#fbbf24]" />
                                </div>
                                <div>
                                    <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>{changePwdStep === "success" ? "Password Changed" : "Change Password"}</DialogTitle>
                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>{changePwdStep === "success" ? `Updated for ${changePwdTarget?.fullName}` : `Set new password for ${changePwdTarget?.fullName}`}</DialogDescription>
                                </div>
                            </div>

                            {changePwdStep === "form" ? (
                                <div className="space-y-5 py-4">
                                    {/* New Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">New Password</label>
                                        <div className="relative">
                                            <IOSInput
                                                type={changePwdShowNew ? "text" : "password"}
                                                value={changePwdNewPassword}
                                                onChange={(e: any) => setChangePwdNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                className="h-[44px] pr-10"
                                                autoFocus
                                            />
                                            <button type="button" onClick={() => setChangePwdShowNew(!changePwdShowNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                                                {changePwdShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {changePwdNewPassword && (
                                            <div className="space-y-1.5 px-1 pb-1 pt-1 opacity-90">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${changePwdStrength.color.replace('bg-', '') === 'red-500' ? 'bg-[#FF3B30]' : changePwdStrength.color.replace('bg-', '') === 'amber-500' ? 'bg-[#FF9500]' : changePwdStrength.color.replace('bg-', '') === 'blue-500' ? 'bg-[#5AC8FA]' : 'bg-[#34C759]'}`} style={{ width: `${changePwdStrength.score}%` }} />
                                                    </div>
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${changePwdStrength.score < 30 ? "text-[#FF3B30]" : changePwdStrength.score < 55 ? "text-[#FF9500]" : changePwdStrength.score < 80 ? "text-[#5AC8FA]" : "text-[#34C759]"}`}>
                                                        {changePwdStrength.label}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                                                    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${changePwdNewPassword.length >= 8 ? "text-[#34C759]" : "text-[var(--muted-foreground)]"}`}>
                                                        {changePwdNewPassword.length >= 8 ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full border border-current opacity-50 ml-0.5 mr-0.5" />} 8+ chars
                                                    </span>
                                                    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${/[A-Z]/.test(changePwdNewPassword) ? "text-[#34C759]" : "text-[var(--muted-foreground)]"}`}>
                                                        {/[A-Z]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full border border-current opacity-50 ml-0.5 mr-0.5" />} Uppercase
                                                    </span>
                                                    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${/[a-z]/.test(changePwdNewPassword) ? "text-[#34C759]" : "text-[var(--muted-foreground)]"}`}>
                                                        {/[a-z]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full border border-current opacity-50 ml-0.5 mr-0.5" />} Lowercase
                                                    </span>
                                                    <span className={`text-[10px] flex items-center gap-0.5 font-medium ${/[0-9]/.test(changePwdNewPassword) ? "text-[#34C759]" : "text-[var(--muted-foreground)]"}`}>
                                                        {/[0-9]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <span className="h-2 w-2 rounded-full border border-current opacity-50 ml-0.5 mr-0.5" />} Number
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Confirm New Password</label>
                                        <div className="relative">
                                            <IOSInput
                                                type={changePwdShowConfirm ? "text" : "password"}
                                                value={changePwdConfirm}
                                                onChange={(e: any) => setChangePwdConfirm(e.target.value)}
                                                placeholder="Re-enter new password"
                                                className="h-[44px] pr-10"
                                            />
                                            <button type="button" onClick={() => setChangePwdShowConfirm(!changePwdShowConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                                                {changePwdShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {changePwdConfirm && changePwdNewPassword !== changePwdConfirm && (
                                            <p className="text-[11px] font-medium text-[#FF3B30] flex items-center gap-1 px-1 pt-0.5"><X className="h-3 w-3" /> Passwords do not match</p>
                                        )}
                                        {changePwdConfirm && changePwdNewPassword === changePwdConfirm && (
                                            <p className="text-[11px] font-medium text-[#34C759] flex items-center gap-1 px-1 pt-0.5"><Check className="h-3 w-3" /> Passwords match</p>
                                        )}
                                    </div>

                                    {/* Admin Password Confirmation */}
                                    <div className="space-y-2 p-4 rounded-[16px] border border-[var(--border)] bg-white/40 dark:bg-black/20">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield className="h-4 w-4 text-[#007AFF]" />
                                            <label className="text-[13px] font-semibold text-[var(--foreground)]">Admin Verification</label>
                                        </div>
                                        <div className="relative">
                                            <IOSInput
                                                type={changePwdShowAdmin ? "text" : "password"}
                                                value={changePwdAdminPassword}
                                                onChange={(e: any) => setChangePwdAdminPassword(e.target.value)}
                                                placeholder="Enter YOUR admin password"
                                                className="h-[44px] pr-10"
                                            />
                                            <button type="button" onClick={() => setChangePwdShowAdmin(!changePwdShowAdmin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                                                {changePwdShowAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[12px] text-[var(--muted-foreground)] pl-1">Required to authorize this high-privilege action.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-[#34C759]/10 mx-auto flex items-center justify-center">
                                        <BadgeCheck className="h-8 w-8 text-[#34C759]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[18px] font-semibold text-[var(--foreground)]">Password Updated Successfully</p>
                                        <p className="text-[14px] text-[var(--muted-foreground)] max-w-[280px] mx-auto">
                                            The password has been changed and existing sessions terminated.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <DialogFooter className="flex gap-2 pt-2 border-t border-[var(--border)] border-x-[-24px] mx-[-24px] px-6 pb-2">
                                {changePwdStep === "success" ? (
                                    <IOSButton variant="filled" color="blue" onClick={resetChangePwdDialog} className="w-full text-[15px] font-semibold">Done</IOSButton>
                                ) : (
                                    <>
                                        <IOSButton variant="gray" onClick={resetChangePwdDialog} className="flex-1 text-[15px] font-semibold">Cancel</IOSButton>
                                        <IOSButton
                                            variant="filled"
                                            color="blue"
                                            onClick={handleChangePassword}
                                            disabled={changePwdLoading || changePwdNewPassword.length < 8 || changePwdNewPassword !== changePwdConfirm}
                                            className="flex-[1.5] text-[15px] font-semibold"
                                        >
                                            {changePwdLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                                            Change Password
                                        </IOSButton>
                                    </>
                                )}
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
