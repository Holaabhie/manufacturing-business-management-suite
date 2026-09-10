"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ChevronRight, ArrowLeft, Shield, ShieldAlert, UserCog, Mail, Phone,
    Calendar, Activity, Clock, BadgeCheck, Building2, KeyRound, Copy,
    Check, Power, PowerOff, AlertTriangle, Loader2, Lock, Unlock,
    MonitorSmartphone, Globe, Hash, Edit3, Save, X, Trash2, Eye, EyeOff,
    LogOut, Settings, Package, ShoppingCart, Cog, Users, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/LocaleProvider";
import { AccessDenied } from "@/components/AccessDenied";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";

// ─── Types ──────────────────────────────────────────────────────
interface EmployeeDetail {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    role: string;
    status: string;
    permissions: Record<string, Record<string, boolean>> | null;
    permissionTemplate: string;
    avatar_url: string | null;
    lastLogin: string | null;
    lastActiveAt: string | null;
    firstLoginCompleted: boolean;
    tempPasswordActive: boolean;
    failedLoginAttempts: number;
    lockedUntil: string | null;
    createdAt: string;
    updatedAt: string;
}

interface ActivityEntry {
    id: string;
    action: string;
    actionType: string;
    module: string;
    timestamp: string;
    ipAddress: string;
    deviceType: string;
    browser: string;
    severity: string;
}

interface SessionInfo {
    id: string;
    ipAddress: string;
    userAgent: string;
    deviceType: string;
    lastActiveAt: string;
    createdAt: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
    full_access: "Full Access Staff",
    operations: "Operations Staff",
    sales: "Sales Executive",
    view_only: "View Only",
    custom: "Custom Permissions",
};

const DEPARTMENTS = [
    "General", "Production", "Warehouse", "Quality Control",
    "Sales", "Accounts", "Logistics", "Administration",
];

const MODULE_ICONS: Record<string, any> = {
    orders: ShoppingCart,
    production: Cog,
    inventory: Package,
    clients: Users,
    finance: BarChart3,
    assistant: Settings,
    team: Users,
    settings: Settings,
    audit: Eye,
};

const MODULE_LABELS: Record<string, string> = {
    orders: "Orders",
    production: "Production",
    inventory: "Inventory",
    clients: "Clients",
    finance: "Finance",
    assistant: "AI Assistant",
    team: "Team",
    settings: "Settings",
    audit: "Audit Logs",
};

const ACTION_TYPE_COLORS: Record<string, string> = {
    create: "#22C55E",
    read: "#3B82F6",
    update: "#F59E0B",
    delete: "#EF4444",
    login: "#8B5CF6",
    logout: "#6B7280",
    export: "#06B6D4",
    permission_change: "#EC4899",
    security: "#EF4444",
    system: "#6B7280",
};

// ═════════════════════════════════════════════════════════════════
// EMPLOYEE DETAIL PAGE
// ═════════════════════════════════════════════════════════════════
export default function EmployeeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;
    const t = useTranslations("users");
    const tCommon = useTranslations("common");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const getTemplateLabel = (key: string) => t(`templates.${key}` as any) || TEMPLATE_LABELS[key] || key;
    const getDepartmentLabel = (key: string) => t(`departments.${key}` as any) || key;

    const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
    const [activity, setActivity] = useState<ActivityEntry[]>([]);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

    // Edit mode
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editDept, setEditDept] = useState("");
    const [editDesignation, setEditDesignation] = useState("");
    const [saving, setSaving] = useState(false);

    // Dialogs
    const [showResetPwd, setShowResetPwd] = useState(false);
    const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Change Password Dialog
    const [showChangePwd, setShowChangePwd] = useState(false);
    const [changePwdStep, setChangePwdStep] = useState<"form" | "success">("form");
    const [changePwdNewPassword, setChangePwdNewPassword] = useState("");
    const [changePwdConfirm, setChangePwdConfirm] = useState("");
    const [changePwdAdminPassword, setChangePwdAdminPassword] = useState("");
    const [changePwdShowNew, setChangePwdShowNew] = useState(false);
    const [changePwdShowConfirm, setChangePwdShowConfirm] = useState(false);
    const [changePwdShowAdmin, setChangePwdShowAdmin] = useState(false);
    const [changePwdLoading, setChangePwdLoading] = useState(false);

    // Permission editing
    const [editingPerms, setEditingPerms] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [permSaving, setPermSaving] = useState(false);

    // ─── Fetch ──────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const meRes = await fetch("/api/auth/me");
            const meData = await meRes.json();
            setCurrentUserRole(meData?.user?.role || null);

            if (meData?.user?.role !== "Admin") { setLoading(false); return; }

            const res = await fetch(`/api/employees/${employeeId}`);
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to fetch employee");
            }
            const data = await res.json();
            setEmployee(data.employee);
            setActivity(data.recentActivity || []);
            setSessions(data.activeSessions || []);

            // Pre-fill edit fields
            setEditName(data.employee.fullName);
            setEditEmail(data.employee.email.endsWith("@staff.local") ? "" : data.employee.email);
            setEditPhone(data.employee.phone);
            setEditDept(data.employee.department);
            setEditDesignation(data.employee.designation);
            setSelectedTemplate(data.employee.permissionTemplate);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Actions ────────────────────────────────────────
    const handleToggleStatus = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle_status" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEmployee(prev => prev ? { ...prev, status: json.status } : null);
            toast.success(json.status === "active" ? t("btnActivate") : t("btnDeactivate"));
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset_password" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setResetPwdResult(json.tempPassword);
            toast.success(t("toasts.passwordReset"));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Change Password (admin-typed) ───────────────
    const handleChangePassword = async () => {
        if (changePwdNewPassword.length < 8) { toast.error(t("toasts.passwordMin")); return; }
        if (!/[A-Z]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordUpper")); return; }
        if (!/[a-z]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordLower")); return; }
        if (!/[0-9]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordNumber")); return; }
        if (changePwdNewPassword !== changePwdConfirm) { toast.error(t("toasts.passwordMismatch")); return; }

        setChangePwdLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "change_password",
                    newPassword: changePwdNewPassword,
                    adminPassword: changePwdAdminPassword || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to change password");
            setChangePwdStep("success");
            toast.success(json.message || `Password updated for ${employee?.fullName}`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setChangePwdLoading(false);
        }
    };

    const resetChangePwdDialog = () => {
        setShowChangePwd(false);
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

    const handleUnlockAccount = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "unlock_account" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEmployee(prev => prev ? { ...prev, failedLoginAttempts: 0, lockedUntil: null } : null);
            toast.success(t("toasts.accountUnlocked"));
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleTerminateSessions = async () => {
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "terminate_sessions" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setSessions([]);
            toast.success(t("toasts.sessionsTerminated"));
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_profile",
                    fullName: editName,
                    email: editEmail,
                    phone: editPhone,
                    department: editDept,
                    designation: editDesignation,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t("toasts.profileUpdated"));
            setEditing(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePermissions = async () => {
        setPermSaving(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update_permissions", templateId: selectedTemplate }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEmployee(prev => prev ? { ...prev, permissions: json.permissions, permissionTemplate: json.templateId } : null);
            toast.success(t("toasts.permissionsUpdated"));
            setEditingPerms(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setPermSaving(false);
        }
    };

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/employees/${employeeId}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            toast.success(t("toasts.employeeDeleted"));
            router.push("/dashboard/users");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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

    // ─── Guards ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
        );
    }

    if (currentUserRole !== "Admin") {
        return <AccessDenied title={t("restrictedAccess")} description="Employee details are restricted to administrators." />;
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <h2 className="text-xl font-bold">{t("employeeNotFound")}</h2>
                <Button variant="outline" onClick={() => router.push("/dashboard/users")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />{t("btnBackToEmployees")}
                </Button>
            </div>
        );
    }

    const isLocked = employee.lockedUntil && new Date(employee.lockedUntil) > new Date();

    return (
        <TooltipProvider delayDuration={0}>
            <div className="space-y-6">
                {/* ─── Breadcrumb ──────────────────────────────────── */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <button onClick={() => router.push("/dashboard/users")} className="hover:text-foreground transition-colors">
                        {t("breadcrumbEmployees")}
                    </button>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{employee.fullName}</span>
                    <Badge variant="outline" className="ml-2 font-mono text-[10px]">{employee.employeeId}</Badge>
                </nav>

                {/* ─── Header ──────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                            style={{ background: "var(--primary)", boxShadow: "0 4px 14px rgba(74,58,255,0.3)" }}
                        >
                            {employee.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{employee.fullName}</h1>
                                <StatusBadge status={employee.status} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" /> {getDepartmentLabel(employee.department)}
                                </span>
                                {employee.designation && (
                                    <span className="flex items-center gap-1">• {employee.designation}</span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> {t("addedOn")} {new Date(employee.createdAt).toLocaleDateString(dateLocale)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setShowChangePwd(true)}
                            className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20"
                        >
                            <KeyRound className="mr-1.5 h-3.5 w-3.5" />{t("btnChangePassword")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleStatus}
                            disabled={actionLoading}
                            className={employee.status === "active" ? "border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"}
                        >
                            {employee.status === "active" ? (
                                <><PowerOff className="mr-1.5 h-3.5 w-3.5" />{t("btnDeactivate")}</>
                            ) : (
                                <><Power className="mr-1.5 h-3.5 w-3.5" />{t("btnActivate")}</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* ─── Warning Banners ─────────────────────────────── */}
                <AnimatePresence>
                    {!employee.firstLoginCompleted && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300"
                        >
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>{t("firstLoginNotice")}</span>
                        </motion.div>
                    )}
                    {isLocked && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between text-sm text-red-800 dark:text-red-300"
                        >
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 flex-shrink-0" />
                                <span>{t("accountLockedNotice", { count: employee.failedLoginAttempts })}</span>
                            </div>
                            <Button size="sm" variant="outline" className="border-red-300 text-red-600" onClick={handleUnlockAccount}>
                                <Unlock className="mr-1.5 h-3.5 w-3.5" />{t("btnUnlock")}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Tabs ────────────────────────────────────────── */}
                <Tabs defaultValue="profile" className="space-y-4">
                    <TabsList className="bg-muted/30 p-1">
                        <TabsTrigger value="profile" className="gap-1.5 data-[state=active]:shadow-sm">
                            <UserCog className="h-3.5 w-3.5" />{t("tabProfile")}
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="gap-1.5 data-[state=active]:shadow-sm">
                            <Shield className="h-3.5 w-3.5" />{t("tabPermissions")}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="gap-1.5 data-[state=active]:shadow-sm">
                            <Activity className="h-3.5 w-3.5" />{t("tabActivity")}
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="gap-1.5 data-[state=active]:shadow-sm">
                            <MonitorSmartphone className="h-3.5 w-3.5" />{t("tabSessions")}
                        </TabsTrigger>
                    </TabsList>

                    {/* ═══ PROFILE TAB ═══════════════════════════════ */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{t("secProfileTitle")}</CardTitle>
                                    <CardDescription>{t("secProfileSubtitle")}</CardDescription>
                                </div>
                                {!editing ? (
                                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />{t("btnEdit")}
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditName(employee.fullName); }}>
                                            <X className="mr-1 h-3.5 w-3.5" />{t("btnCancel")}
                                        </Button>
                                        <Button size="sm" onClick={handleSaveProfile} disabled={saving}
                                            className="text-white" style={{ background: "var(--primary)" }}
                                        >
                                            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                                            {t("btnSave")}
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblEmployeeId")}</Label>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="font-mono text-lg font-bold" style={{ color: "var(--primary)" }}>
                                                    {employee.employeeId}
                                                </span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(employee.employeeId)}>
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t("btnCopyId")}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblName")}</Label>
                                            {editing ? (
                                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 h-10" />
                                            ) : (
                                                <p className="mt-1 font-medium">{employee.fullName}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblEmail")}</Label>
                                            {editing ? (
                                                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1 h-10" placeholder={t("placeholderEmail")} />
                                            ) : (
                                                <p className="mt-1 text-sm">
                                                    {employee.email.endsWith("@staff.local") ? (
                                                        <span className="text-muted-foreground italic">{t("lblNotProvided")}</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{employee.email}</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblPhone")}</Label>
                                            {editing ? (
                                                <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="mt-1 h-10" placeholder="+91..." />
                                            ) : (
                                                <p className="mt-1 text-sm">
                                                    {employee.phone ? (
                                                        <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{employee.phone}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">{t("lblNotProvided")}</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblDepartment")}</Label>
                                            {editing ? (
                                                <Select value={editDept} onValueChange={setEditDept}>
                                                    <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{getDepartmentLabel(d)}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <p className="mt-1"><span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{getDepartmentLabel(employee.department)}</span></p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblDesignation")}</Label>
                                            {editing ? (
                                                <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} className="mt-1 h-10" placeholder={t("placeholderDesignation")} />
                                            ) : (
                                                <p className="mt-1 text-sm">{employee.designation || <span className="text-muted-foreground italic">{t("lblNotSet")}</span>}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblLastLogin")}</Label>
                                            <p className="mt-1 text-sm flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {employee.lastLogin ? new Date(employee.lastLogin).toLocaleString(dateLocale) : t("lblNotSet")}
                                            </p>
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblLastActive")}</Label>
                                            <p className="mt-1 text-sm flex items-center gap-1">
                                                <Activity className="h-3.5 w-3.5" />
                                                {timeAgo(employee.lastActiveAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="mt-8 pt-6 border-t border-border">
                                    <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4" />
                                        {t("secDangerZone")}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            onClick={() => setShowDeleteConfirm(true)}
                                        >
                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />{t("btnDelete")}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ═══ PERMISSIONS TAB ════════════════════════════ */}
                    <TabsContent value="permissions">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{t("secPermissionsTitle")}</CardTitle>
                                    <CardDescription>
                                        {t("lblTemplatePrefix")} <span className="font-semibold text-foreground">{getTemplateLabel(employee.permissionTemplate)}</span>
                                    </CardDescription>
                                </div>
                                {!editingPerms ? (
                                    <Button variant="outline" size="sm" onClick={() => setEditingPerms(true)}>
                                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />{t("btnChangeTemplate")}
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setEditingPerms(false)}>{t("btnCancel")}</Button>
                                        <Button size="sm" onClick={handleUpdatePermissions} disabled={permSaving}
                                            className="text-white" style={{ background: "var(--primary)" }}
                                        >
                                            {permSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                                            {t("btnApplyTemplate")}
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent>
                                {editingPerms && (
                                    <div className="mb-6 p-4 rounded-lg border bg-muted/20">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{t("selectTemplateTitle")}</Label>
                                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TEMPLATE_LABELS).filter(([k]) => k !== "custom").map(([key]) => (
                                                    <SelectItem key={key} value={key}>{getTemplateLabel(key)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Permission Matrix */}
                                {employee.permissions ? (
                                    <div className="space-y-2">
                                        {Object.entries(employee.permissions).map(([module, actions]) => {
                                            const Icon = MODULE_ICONS[module] || Settings;
                                            const hasAny = Object.values(actions).some(v => v);
                                            return (
                                                <div key={module} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${hasAny ? "bg-card border-border" : "bg-muted/20 border-transparent opacity-50"}`}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{MODULE_LABELS[module] || module}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {Object.entries(actions).map(([action, enabled]) => (
                                                            <Badge
                                                                key={action}
                                                                variant="outline"
                                                                className={`text-[10px] px-1.5 py-0 capitalize ${enabled
                                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400"
                                                                    : "border-transparent bg-muted/50 text-muted-foreground/50"
                                                                    }`}
                                                            >
                                                                {enabled ? <Check className="h-2.5 w-2.5 mr-0.5" /> : <X className="h-2.5 w-2.5 mr-0.5" />}
                                                                {action}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p>{t("noPermissionsNotice")}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ═══ ACTIVITY TAB ══════════════════════════════ */}
                    <TabsContent value="activity">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("secActivityTitle")}</CardTitle>
                                <CardDescription>{t("secActivitySubtitle")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {activity.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p>{t("noActivity")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {activity.map((entry, idx) => (
                                            <motion.div
                                                key={entry.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ background: ACTION_TYPE_COLORS[entry.actionType] || "#6B7280" }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm">{entry.action}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                        <span className="capitalize">{entry.module}</span>
                                                        <span>•</span>
                                                        <span>{new Date(entry.timestamp).toLocaleString(dateLocale)}</span>
                                                        {entry.ipAddress && entry.ipAddress !== "unknown" && (
                                                            <><span>•</span><span>{entry.ipAddress}</span></>
                                                        )}
                                                    </div>
                                                </div>
                                                {entry.severity === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                                                {entry.severity === "critical" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ═══ SESSIONS TAB ═════════════════════════════ */}
                    <TabsContent value="sessions">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">{t("secSessionsTitle")}</CardTitle>
                                    <CardDescription>{t("sessionsCount", { count: sessions.length })}</CardDescription>
                                </div>
                                {sessions.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={handleTerminateSessions}
                                        className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    >
                                        <LogOut className="mr-1.5 h-3.5 w-3.5" />{t("btnTerminateAll")}
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <MonitorSmartphone className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p>{t("noSessions")}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessions.map(session => (
                                            <div key={session.id} className="p-4 rounded-lg border bg-card flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">{session.deviceType || "Unknown Device"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t("sessionIp")} {session.ipAddress} • {t("sessionLastActive")} {timeAgo(session.lastActiveAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ═══ CHANGE PASSWORD DIALOG ═════════════════════════ */}
                <Dialog open={showChangePwd} onOpenChange={(open) => { if (!open) resetChangePwdDialog(); }}>
                    <DialogContent fullScreenMobile className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg" style={{ background: "#F59E0B" }}>
                                    <KeyRound className="h-4 w-4 text-white" />
                                </div>
                                {changePwdStep === "success" ? t("passwordUpdatedTitle") : t("changePasswordTitle")}
                            </DialogTitle>
                            <DialogDescription>
                                {changePwdStep === "success"
                                    ? `Password updated successfully for ${employee.fullName}. All sessions have been terminated.`
                                    : `Set a new password for ${employee.fullName} (${employee.employeeId}). All active sessions will be terminated.`}
                            </DialogDescription>
                        </DialogHeader>

                        {changePwdStep === "form" ? (
                            <div className="space-y-5 py-2">
                                {/* New Password */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblNewPassword")}</Label>
                                    <div className="relative">
                                        <Input
                                            type={changePwdShowNew ? "text" : "password"}
                                            value={changePwdNewPassword}
                                            onChange={(e) => setChangePwdNewPassword(e.target.value)}
                                            placeholder={t("placeholderNewPassword")}
                                            className="h-11 pr-10"
                                            autoFocus
                                        />
                                        <button type="button" onClick={() => setChangePwdShowNew(!changePwdShowNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {changePwdShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {/* Strength Meter */}
                                    {changePwdNewPassword && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${changePwdStrength.color}`} style={{ width: `${changePwdStrength.score}%` }} />
                                                </div>
                                                <span className={`text-xs font-bold ${changePwdStrength.score < 30 ? "text-red-500" : changePwdStrength.score < 55 ? "text-amber-500" : changePwdStrength.score < 80 ? "text-blue-500" : "text-emerald-500"}`}>
                                                    {changePwdStrength.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                <span className={`text-[10px] flex items-center gap-0.5 ${changePwdNewPassword.length >= 8 ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                    {changePwdNewPassword.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {t("reqMinChars")}
                                                </span>
                                                <span className={`text-[10px] flex items-center gap-0.5 ${/[A-Z]/.test(changePwdNewPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                    {/[A-Z]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {t("reqUppercase")}
                                                </span>
                                                <span className={`text-[10px] flex items-center gap-0.5 ${/[a-z]/.test(changePwdNewPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                    {/[a-z]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {t("reqLowercase")}
                                                </span>
                                                <span className={`text-[10px] flex items-center gap-0.5 ${/[0-9]/.test(changePwdNewPassword) ? "text-emerald-500" : "text-muted-foreground"}`}>
                                                    {/[0-9]/.test(changePwdNewPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {t("reqNumber")}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblConfirmNewPassword")}</Label>
                                    <div className="relative">
                                        <Input
                                            type={changePwdShowConfirm ? "text" : "password"}
                                            value={changePwdConfirm}
                                            onChange={(e) => setChangePwdConfirm(e.target.value)}
                                            placeholder={t("placeholderConfirmNewPassword")}
                                            className="h-11 pr-10"
                                        />
                                        <button type="button" onClick={() => setChangePwdShowConfirm(!changePwdShowConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {changePwdShowConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {changePwdConfirm && changePwdNewPassword !== changePwdConfirm && (
                                        <p className="text-[10px] text-red-400 flex items-center gap-1"><X className="h-3 w-3" /> {t("passwordsMismatch")}</p>
                                    )}
                                    {changePwdConfirm && changePwdNewPassword === changePwdConfirm && (
                                        <p className="text-[10px] text-emerald-500 flex items-center gap-1"><Check className="h-3 w-3" /> {t("passwordsMatch")}</p>
                                    )}
                                </div>

                                {/* Admin Password Confirmation */}
                                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPasswordRecommend")}</Label>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type={changePwdShowAdmin ? "text" : "password"}
                                            value={changePwdAdminPassword}
                                            onChange={(e) => setChangePwdAdminPassword(e.target.value)}
                                            placeholder={t("placeholderAdminPassword")}
                                            className="h-11 pr-10"
                                        />
                                        <button type="button" onClick={() => setChangePwdShowAdmin(!changePwdShowAdmin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                            {changePwdShowAdmin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{t("adminPasswordRecommendHint")}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-center space-y-3">
                                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 w-fit mx-auto">
                                    <BadgeCheck className="h-8 w-8 text-emerald-600" />
                                </div>
                                <p className="font-semibold text-lg">{t("passwordUpdatedTitle")}</p>
                                <p className="text-sm text-muted-foreground">
                                    {t("passwordUpdatedDesc")}
                                </p>
                                <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                                    <p className="flex items-center justify-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5" style={{ color: "var(--primary)" }} />
                                        {t("auditRecordedNotice")}
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {changePwdStep === "success" ? (
                                <Button className="w-full text-white" style={{ background: "var(--primary)" }} onClick={resetChangePwdDialog}>{t("btnDone")}</Button>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={resetChangePwdDialog}>{t("btnCancel")}</Button>
                                    <Button
                                        onClick={handleChangePassword}
                                        disabled={changePwdLoading || changePwdNewPassword.length < 8 || changePwdNewPassword !== changePwdConfirm}
                                        style={{ background: "#F59E0B", color: "white" }}
                                    >
                                        {changePwdLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                                        {t("changePasswordTitle")}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ═══ AUTO-RESET PASSWORD DIALOG (legacy) ═══════════ */}
                <Dialog open={showResetPwd} onOpenChange={(open) => { if (!open) { setShowResetPwd(false); setResetPwdResult(null); } }}>
                    <DialogContent fullScreenMobile className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t("autoGeneratePasswordTitle")}</DialogTitle>
                            <DialogDescription>
                                {resetPwdResult
                                    ? `New password generated for ${employee.fullName}.`
                                    : `Generate a random temporary password for ${employee.fullName}. All active sessions will be terminated.`}
                            </DialogDescription>
                        </DialogHeader>

                        {resetPwdResult ? (
                            <div className="py-4">
                                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-3 border">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("newTempPassword")}</p>
                                        <p className="font-mono font-bold text-lg">{resetPwdResult}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(resetPwdResult)}>
                                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        <DialogFooter>
                            {resetPwdResult ? (
                                <Button className="w-full" onClick={() => { setShowResetPwd(false); setResetPwdResult(null); }}>{t("btnDone")}</Button>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => setShowResetPwd(false)}>{t("btnCancel")}</Button>
                                    <Button onClick={handleResetPassword} disabled={actionLoading} style={{ background: "#F59E0B", color: "white" }}>
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                                        {t("btnGeneratePassword")}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ═══ DELETE CONFIRMATION ═══════════════════════════ */}
                <ConfirmDeleteSheet
                    open={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDelete}
                    isDeleting={actionLoading}
                    entityLabel={t("deleteEntityLabel")}
                    entityName={employee ? `${employee.fullName} (${employee.employeeId})` : undefined}
                    consequenceText={t("deleteConsequence")}
                />
            </div>
        </TooltipProvider>
    );
}

// ─── Inline Status Badge ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const t = useTranslations("users");
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: { label: t("statusActive"), classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400", icon: Check },
        inactive: { label: t("statusInactive"), classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400", icon: PowerOff },
        suspended: { label: t("statusSuspended"), classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400", icon: AlertTriangle },
        pending_setup: { label: t("statusPendingSetup"), classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400", icon: Clock },
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
        <Badge variant="outline" className={`gap-1 pl-1.5 pr-2.5 py-0.5 rounded-full font-semibold text-[11px] ${c.classes}`}>
            <Icon className="h-3 w-3" />{c.label}
        </Badge>
    );
}
