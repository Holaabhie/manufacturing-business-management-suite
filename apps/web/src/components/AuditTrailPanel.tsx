'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Search,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Filter,
    Clock,
    User,
    AlertTriangle,
    Info,
    AlertCircle,
    LogIn,
    LogOut,
    Plus,
    Edit,
    Trash2,
    Download,
    Eye,
    Lock,
    Settings,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────
interface AuditLog {
    _id: string;
    organizationId: string;
    userId: string;
    userName: string;
    userRole: 'Admin' | 'Staff';
    action: string;
    actionType: string;
    module: string;
    resourceId?: string;
    resourceType?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    browser?: string;
    severity: 'info' | 'warning' | 'critical';
    details?: string;
    timestamp: string;
}

interface AuditResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ─── Constants ──────────────────────────────────────────
const MODULES = ['All', 'orders', 'inventory', 'clients', 'billing', 'auth', 'team', 'production', 'settings'] as const;
const ACTION_TYPES = ['All', 'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'permission_change', 'security'] as const;
const SEVERITIES = ['All', 'info', 'warning', 'critical'] as const;

const ACTION_ICONS: Record<string, React.ReactNode> = {
    create: <Plus size={14} />,
    read: <Eye size={14} />,
    update: <Edit size={14} />,
    delete: <Trash2 size={14} />,
    login: <LogIn size={14} />,
    logout: <LogOut size={14} />,
    export: <Download size={14} />,
    permission_change: <Lock size={14} />,
    security: <Shield size={14} />,
    system: <Settings size={14} />,
};

const SEVERITY_STYLES: Record<string, { bg: string; color: string }> = {
    info: { bg: 'rgba(0, 122, 255, 0.1)', color: 'var(--ios-blue)' },
    warning: { bg: 'rgba(255, 149, 0, 0.1)', color: 'var(--ios-orange)' },
    critical: { bg: 'rgba(255, 59, 48, 0.1)', color: 'var(--ios-red)' },
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
    info: <Info size={14} />,
    warning: <AlertTriangle size={14} />,
    critical: <AlertCircle size={14} />,
};

// ─── Component ──────────────────────────────────────────
export default function AuditTrailPanel() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [actionFilter, setActionFilter] = useState('All');
    const [severityFilter, setSeverityFilter] = useState('All');
    const [showFilters, setShowFilters] = useState(false);

    // ── Fetch logs ────────────────────────────────────
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: '20' });
            if (moduleFilter !== 'All') params.set('module', moduleFilter);
            if (actionFilter !== 'All') params.set('actionType', actionFilter);
            if (severityFilter !== 'All') params.set('severity', severityFilter);
            if (searchQuery.trim()) params.set('search', searchQuery.trim());

            const res = await fetch(`/api/audit?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');

            const data: AuditResponse = await res.json();
            setLogs(data.logs);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page, moduleFilter, actionFilter, severityFilter, searchQuery]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [moduleFilter, actionFilter, severityFilter, searchQuery]);

    // ── Helpers ───────────────────────────────────────
    function formatDate(ts: string): string {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(ts: string): string {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function formatModuleName(mod: string): string {
        return mod.charAt(0).toUpperCase() + mod.slice(1);
    }

    return (
        <div className="space-y-4">
            {/* ── Header Row ──────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                        {total.toLocaleString()} events recorded
                    </p>
                </div>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{
                        background: showFilters ? 'var(--ios-blue)' : 'var(--fill-quaternary)',
                        color: showFilters ? '#FFFFFF' : 'var(--ios-blue)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        fontSize: '15px',
                        fontWeight: 600,
                    }}
                >
                    <Filter size={16} />
                    Filters
                </motion.button>
            </div>

            {/* ── Search Bar ──────────────────────────────── */}
            <div
                className="flex items-center gap-3 px-4"
                style={{
                    background: 'var(--fill-quaternary)',
                    borderRadius: '12px',
                    height: '44px',
                }}
            >
                <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search audit logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '17px',
                        color: 'var(--text-heading)',
                    }}
                />
            </div>

            {/* ── Filter Bar ─────────────────────────────── */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div
                            className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
                        >
                            {/* Module filter */}
                            <div>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                    Module
                                </label>
                                <div className="relative">
                                    <select
                                        value={moduleFilter}
                                        onChange={(e) => setModuleFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            background: 'var(--fill-quaternary)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '15px',
                                            color: 'var(--text-heading)',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {MODULES.map((m) => (
                                            <option key={m} value={m}>{m === 'All' ? 'All Modules' : formatModuleName(m)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                </div>
                            </div>

                            {/* Action Type filter */}
                            <div>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                    Action Type
                                </label>
                                <div className="relative">
                                    <select
                                        value={actionFilter}
                                        onChange={(e) => setActionFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            background: 'var(--fill-quaternary)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '15px',
                                            color: 'var(--text-heading)',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {ACTION_TYPES.map((a) => (
                                            <option key={a} value={a}>{a === 'All' ? 'All Actions' : a.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                </div>
                            </div>

                            {/* Severity filter */}
                            <div>
                                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                                    Severity
                                </label>
                                <div className="relative">
                                    <select
                                        value={severityFilter}
                                        onChange={(e) => setSeverityFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            background: 'var(--fill-quaternary)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '15px',
                                            color: 'var(--text-heading)',
                                            appearance: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {SEVERITIES.map((s) => (
                                            <option key={s} value={s}>{s === 'All' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Log Table ──────────────────────────────── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-card)',
                }}
            >
                {loading ? (
                    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        <div
                            className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                            style={{ borderColor: 'var(--ios-blue)', borderTopColor: 'transparent' }}
                        />
                        <p className="mt-3" style={{ fontSize: '15px' }}>Loading audit trail...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div
                            className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: 'var(--fill-quaternary)' }}
                        >
                            <Shield size={28} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '4px' }}>
                            No audit logs found
                        </p>
                        <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                            Try adjusting your filters or search query
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Table Header (desktop) */}
                        <div
                            className="hidden md:grid px-5 py-3"
                            style={{
                                gridTemplateColumns: '1fr 120px 100px 100px 140px 40px',
                                gap: '12px',
                                borderBottom: '1px solid var(--border-divider)',
                                background: 'var(--fill-quaternary)',
                            }}
                        >
                            {['Action', 'Module', 'Type', 'Severity', 'Time', ''].map((h) => (
                                <span key={h} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {h}
                                </span>
                            ))}
                        </div>

                        {/* Log Rows */}
                        {logs.map((log, i) => (
                            <motion.div
                                key={log._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03, duration: 0.3 }}
                            >
                                {/* Row */}
                                <div
                                    onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)}
                                    className="cursor-pointer"
                                    style={{
                                        borderBottom: '1px solid var(--border-divider)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover-light)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {/* Desktop layout */}
                                    <div
                                        className="hidden md:grid px-5 py-3 items-center"
                                        style={{ gridTemplateColumns: '1fr 120px 100px 100px 140px 40px', gap: '12px' }}
                                    >
                                        {/* Action */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{
                                                    background: SEVERITY_STYLES[log.severity]?.bg || 'var(--fill-quaternary)',
                                                    color: SEVERITY_STYLES[log.severity]?.color || 'var(--text-muted)',
                                                }}
                                            >
                                                {ACTION_ICONS[log.actionType] || <Settings size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-heading)' }}>
                                                    {log.action}
                                                </p>
                                                <p className="truncate" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    <User size={11} className="inline mr-1" style={{ verticalAlign: '-1px' }} />
                                                    {log.userName} · {log.userRole}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Module */}
                                        <span
                                            className="inline-flex items-center px-2 py-1 rounded-md"
                                            style={{ fontSize: '13px', fontWeight: 500, background: 'var(--fill-quaternary)', color: 'var(--text-heading)', width: 'fit-content' }}
                                        >
                                            {formatModuleName(log.module)}
                                        </span>

                                        {/* Action Type */}
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                                            style={{ fontSize: '13px', fontWeight: 500, background: 'rgba(0, 122, 255, 0.08)', color: 'var(--ios-blue)', width: 'fit-content' }}
                                        >
                                            {ACTION_ICONS[log.actionType]}
                                            {log.actionType.replace('_', ' ')}
                                        </span>

                                        {/* Severity */}
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
                                            style={{
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                background: SEVERITY_STYLES[log.severity]?.bg,
                                                color: SEVERITY_STYLES[log.severity]?.color,
                                                width: 'fit-content',
                                            }}
                                        >
                                            {SEVERITY_ICONS[log.severity]}
                                            {log.severity}
                                        </span>

                                        {/* Time */}
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {formatTime(log.timestamp)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {formatDate(log.timestamp)}
                                            </div>
                                        </div>

                                        {/* Expand */}
                                        <ChevronRight
                                            size={16}
                                            style={{
                                                color: 'var(--text-muted)',
                                                transition: 'transform 0.2s',
                                                transform: expandedRow === log._id ? 'rotate(90deg)' : 'none',
                                            }}
                                        />
                                    </div>

                                    {/* Mobile layout */}
                                    <div className="md:hidden px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                    style={{
                                                        background: SEVERITY_STYLES[log.severity]?.bg,
                                                        color: SEVERITY_STYLES[log.severity]?.color,
                                                    }}
                                                >
                                                    {ACTION_ICONS[log.actionType] || <Settings size={14} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-heading)' }}>
                                                        {log.action}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                        <span>{log.userName}</span>
                                                        <span>·</span>
                                                        <span>{formatModuleName(log.module)}</span>
                                                        <span>·</span>
                                                        <span>{formatTime(log.timestamp)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    transition: 'transform 0.2s',
                                                    transform: expandedRow === log._id ? 'rotate(90deg)' : 'none',
                                                    flexShrink: 0,
                                                    marginTop: '4px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                <AnimatePresence>
                                    {expandedRow === log._id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div
                                                className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                                                style={{ background: 'var(--fill-quaternary)' }}
                                            >
                                                {/* Details Card */}
                                                <div className="space-y-3">
                                                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Details
                                                    </h4>
                                                    <div className="space-y-2" style={{ fontSize: '14px' }}>
                                                        {log.resourceType && (
                                                            <div className="flex justify-between">
                                                                <span style={{ color: 'var(--text-secondary)' }}>Resource</span>
                                                                <span style={{ color: 'var(--text-heading)', fontWeight: 500 }}>{log.resourceType}</span>
                                                            </div>
                                                        )}
                                                        {log.resourceId && (
                                                            <div className="flex justify-between">
                                                                <span style={{ color: 'var(--text-secondary)' }}>Resource ID</span>
                                                                <span style={{ color: 'var(--text-heading)', fontFamily: 'monospace', fontSize: '13px' }}>{log.resourceId}</span>
                                                            </div>
                                                        )}
                                                        {log.ipAddress && (
                                                            <div className="flex justify-between">
                                                                <span style={{ color: 'var(--text-secondary)' }}>IP Address</span>
                                                                <span style={{ color: 'var(--text-heading)', fontFamily: 'monospace', fontSize: '13px' }}>{log.ipAddress}</span>
                                                            </div>
                                                        )}
                                                        {log.browser && (
                                                            <div className="flex justify-between">
                                                                <span style={{ color: 'var(--text-secondary)' }}>Browser</span>
                                                                <span style={{ color: 'var(--text-heading)' }}>{log.browser} ({log.deviceType})</span>
                                                            </div>
                                                        )}
                                                        {log.details && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>Notes</span>
                                                                <p style={{ color: 'var(--text-heading)', marginTop: '4px' }}>{log.details}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* State Diff Card */}
                                                {(log.beforeState || log.afterState) && (
                                                    <div className="space-y-3">
                                                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            State Changes
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {log.beforeState && (
                                                                <div
                                                                    className="p-3 rounded-xl"
                                                                    style={{ background: 'rgba(255, 59, 48, 0.06)', border: '1px solid rgba(255, 59, 48, 0.1)' }}
                                                                >
                                                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ios-red)', marginBottom: '6px' }}>Before</p>
                                                                    <pre style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                                                                        {JSON.stringify(log.beforeState, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                            {log.afterState && (
                                                                <div
                                                                    className="p-3 rounded-xl"
                                                                    style={{ background: 'rgba(52, 199, 89, 0.06)', border: '1px solid rgba(52, 199, 89, 0.1)' }}
                                                                >
                                                                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ios-green)', marginBottom: '6px' }}>After</p>
                                                                    <pre style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                                                                        {JSON.stringify(log.afterState, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Pagination ─────────────────────────────── */}
            {totalPages > 1 && (
                <div
                    className="flex items-center justify-between"
                    style={{ padding: '0 4px' }}
                >
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Page {page} of {totalPages} · {total.toLocaleString()} total entries
                    </p>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            className="cursor-pointer disabled:opacity-30"
                            style={{
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--fill-quaternary)',
                                border: 'none',
                                borderRadius: '10px',
                            }}
                        >
                            <ChevronLeft size={18} style={{ color: 'var(--text-heading)' }} />
                        </motion.button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (page <= 3) {
                                pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = page - 2 + i;
                            }
                            return (
                                <motion.button
                                    key={pageNum}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setPage(pageNum)}
                                    className="cursor-pointer"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: page === pageNum ? 'var(--ios-blue)' : 'var(--fill-quaternary)',
                                        color: page === pageNum ? '#FFFFFF' : 'var(--text-heading)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                    }}
                                >
                                    {pageNum}
                                </motion.button>
                            );
                        })}

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            className="cursor-pointer disabled:opacity-30"
                            style={{
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--fill-quaternary)',
                                border: 'none',
                                borderRadius: '10px',
                            }}
                        >
                            <ChevronRight size={18} style={{ color: 'var(--text-heading)' }} />
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
}
