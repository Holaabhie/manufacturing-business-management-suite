"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCachedPage } from "@/hooks/useCachedPage";
import { useLongPress } from "@/hooks/useLongPress";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { AccessDenied } from "@/components/AccessDenied";
import {
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  User,
  AlertCircle,
  MoreVertical,
  X,
  Calendar,
  Trash2,
  IndianRupee,
  Landmark,
  Banknote,
  QrCode,
  FileText,
  CreditCard,
  ChevronDown,
  Receipt,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

// --- iOS Components ---
import {
  IOSButton,
  IOSCard,
  IOSCardHeader,
  IOSCardContent,
  IOSBadge,
  IOSSearchBar,
  IOSInput,
  IOSSelect
} from "@/components/ui/ios";
import { StatWidget } from "@/components/ui/StatWidget";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";

// Animations
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/styles/animations";

// React Query hooks — cached, optimistic
import {
  useOrders,
  useClients,
  usePayments,
  useCreatePayment,
  useDeletePayment,
} from "@/lib/hooks/use-orders";
import { useRole } from "@/lib/hooks/use-role";

// ─── Types ──────────────────────────────────────────────
interface Client { id: string; name: string; }
interface Order {
  id: string;
  clientId: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  client?: Client;
}
interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceId: string;
  notes: string;
  clientId: string | null;
  orderId: string | null;
  client?: { name: string };
  order?: { productName: string };
}

// ─── Indian Number Formatter ────────────────────────────
function formatIndianNumber(n: number): string {
  if (isNaN(n) || n === 0) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

// ─── Method color helper ────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  'Bank Transfer': '#3b82f6', 'Cash': '#10b981', 'UPI': '#a855f7',
  'Cheque': '#f59e0b', 'Credit/Due': '#ef4444',
};
const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Bank Transfer': Landmark, 'Cash': Banknote, 'UPI': QrCode,
  'Cheque': FileText, 'Credit/Due': CreditCard,
};

// ─── PaymentHistoryCard — wrapper for useLongPress hook ─
function PaymentHistoryCard({
  payment,
  onLongPress,
}: {
  payment: Payment;
  onLongPress: (p: Payment) => void;
}) {
  const color = METHOD_COLORS[payment.paymentMethod] || '#6366f1';
  const MethodIcon = METHOD_ICONS[payment.paymentMethod] || Banknote;

  const longPressHandlers = useLongPress(
    () => onLongPress(payment),
    undefined,
  );

  return (
    <div
      className="bg-white dark:bg-[#1C2333] rounded-[14px] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      {...longPressHandlers}
    >
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Client + amount */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)] truncate flex-1">
            {payment.client?.name || 'Unknown'}
          </span>
          <span className="text-[15px] font-bold text-emerald-500 dark:text-emerald-400 tabular-nums whitespace-nowrap">
            +{"\u20B9"}{Number(payment.amount ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
        {/* Row 2: Method badge + Completed badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            <MethodIcon className="h-3 w-3" />
            {payment.paymentMethod}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        </div>
        {/* Row 3: Product/ref · date */}
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted-foreground)]">
          <span className="truncate">
            {payment.order?.productName || payment.referenceId || 'General'}
          </span>
          {payment.paymentDate && (
            <span className="whitespace-nowrap">
              {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────
function PaymentsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-[36px] w-[260px] rounded-[10px] bg-[var(--muted)] shimmer" />
          <div className="h-[18px] w-[400px] rounded-[8px] bg-[var(--muted)] shimmer mt-2" />
        </div>
        <div className="h-[40px] w-[160px] rounded-[12px] bg-[var(--muted)] shimmer" />
      </div>

      {/* KPI skeleton */}
      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="kpi-card flex flex-col justify-center min-h-[140px]">
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

      {/* Tab + table skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-[44px] w-[320px] rounded-[12px] bg-[var(--muted)] shimmer" />
          <div className="h-[44px] flex-1 max-w-xs rounded-[12px] bg-[var(--muted)] shimmer ml-auto" />
        </div>
        <div className="rounded-[16px] overflow-hidden border border-[var(--border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border)]">
              <div className="h-[40px] flex-1 rounded-[8px] bg-[var(--muted)] shimmer" />
              <div className="h-[20px] w-[100px] rounded-[6px] bg-[var(--muted)] shimmer" />
              <div className="h-[20px] w-[80px] rounded-[6px] bg-[var(--muted)] shimmer" />
              <div className="h-[20px] w-[100px] rounded-[6px] bg-[var(--muted)] shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  // ─── React Query: cached data ────────────────────────
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();

  // ─── React Query: mutations ────────────────────────
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  // ─── Role ────────────────────────────────────────────
  const { isStaff, loading: roleLoading } = useRole();

  // ─── Local UI State ──────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"receivables" | "history" | "clients">("receivables");

  // ── Long-press action sheet state ─────────────────────
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentActions, setShowPaymentActions] = useState(false);

  const closePaymentSheet = useCallback(() => {
    setShowPaymentActions(false);
    setTimeout(() => setSelectedPayment(null), 350);
  }, []);

  const handlePaymentLongPress = useCallback((p: Payment) => {
    setSelectedPayment(p);
    setShowPaymentActions(true);
  }, []);

  // ── Page State Persistence ───────────────────────────
  const { restoreState, persist, scrollYRef } = useCachedPage({ pageKey: "payments" });
  const persistRef = useRef({ searchTerm, viewType });
  useEffect(() => { persistRef.current = { searchTerm, viewType }; });
  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.searchTerm) setSearchTerm(cached.searchTerm as string);
      if (cached.viewType) setViewType(cached.viewType as "receivables" | "history" | "clients");
    }
    return () => {
      persist({ ...persistRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formData, setFormData] = useState({
    clientId: "",
    orderId: "",
    amount: "",
    paymentMethod: "Cash",
    paymentDate: new Date().toISOString().split('T')[0],
    referenceId: "",
    notes: ""
  });

  // ─── Modal animation state ───────────────────────────
  const [animateOpen, setAnimateOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => setPortalMounted(true), []);

  useEffect(() => {
    if (isDialogOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      // Trigger entrance animation on next frame
      const frameId = requestAnimationFrame(() => {
        setAnimateOpen(true);
      });
      // Focus first input
      setTimeout(() => firstInputRef.current?.focus(), 250);
      return () => {
        cancelAnimationFrame(frameId);
      };
    } else {
      setAnimateOpen(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDialogOpen]);

  // ─── Escape key handler for modal ────────────────────
  const handleModalClose = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  useEffect(() => {
    if (!isDialogOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleModalClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isDialogOpen, handleModalClose]);

  // ─── Derived data (memoized) ─────────────────────────
  const loading = clientsLoading || ordersLoading || paymentsLoading;

  const totalRevenue = useMemo(
    () => orders.reduce((acc: number, o: any) => acc + Number(o.totalAmount), 0),
    [orders],
  );

  const totalReceived = useMemo(
    () => payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0),
    [payments],
  );

  const totalOutstanding = totalRevenue - totalReceived;

  const filteredHistory = useMemo(
    () =>
      payments.filter((p: any) =>
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.order?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [payments, searchTerm],
  );

  const clientSummaries = useMemo(
    () =>
      clients
        .map((client: any) => {
          const clientOrders = orders.filter((o: any) => o.clientId === client.id);
          const clientPayments = payments.filter((p: any) => p.clientId === client.id);
          const billed = clientOrders.reduce((acc: number, o: any) => acc + Number(o.totalAmount), 0);
          const received = clientPayments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
          return { ...client, billed, received, outstanding: billed - received };
        })
        .filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [clients, orders, payments, searchTerm],
  );

  // ─── Modal derived state (for summary card) ──────────
  const selectedClient = clients.find((c: any) => c.id === formData.clientId);
  const clientName = selectedClient?.name || "";

  const selectedOrder = formData.orderId && formData.orderId !== "none"
    ? orders.find((o: any) => o.id === formData.orderId)
    : null;
  const orderName = selectedOrder?.productName || "";

  const outstandingAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    const paidForOrder = payments
      .filter((p: any) => p.orderId === selectedOrder.id)
      .reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    return Number(selectedOrder.totalAmount) - paidForOrder;
  }, [selectedOrder, payments]);

  const enteredAmount = formData.amount;
  const remaining = (outstandingAmount ?? 0) - (Number(enteredAmount) || 0);

  // Payment mode pill mapping
  const paymentModePill = formData.paymentMethod === 'Bank Transfer' ? 'Bank' : formData.paymentMethod;

  // ─── Handlers ────────────────────────────────────────
  const getClientOrders = (clientId: string) =>
    orders.filter((o: any) => o.clientId === clientId && o.paymentStatus !== 'paid');

  const handleCardClick = (order: any, due: number) => {
    setFormData({
      ...formData,
      clientId: order.clientId,
      orderId: order.id,
      amount: due.toString(),
      paymentMethod: "Cash",
      paymentDate: new Date().toISOString().split('T')[0],
      referenceId: "",
      notes: ""
    });
    setIsDialogOpen(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);

    if (!formData.clientId || !amountNum || amountNum <= 0) {
      return toast.error("Please select a client and enter a valid amount");
    }

    // Validation for order-specific payment
    if (formData.orderId && formData.orderId !== "none") {
      const selectedOrder = orders.find((o: any) => o.id === formData.orderId);
      if (!selectedOrder) return toast.error("Selected order not found");

      const paidForOrder = payments
        .filter((p: any) => p.orderId === formData.orderId)
        .reduce((acc: number, p: any) => acc + Number(p.amount), 0);
      const remaining = Number(selectedOrder.totalAmount) - paidForOrder;

      if (amountNum > remaining + 0.01) {
        return toast.error(`Amount exceeds remaining balance for this order (\u20B9${remaining.toLocaleString()})`);
      }
    }

    // Use the React Query mutation — handles optimistic update + cache invalidation
    createPayment.mutate(
      {
        client_id: formData.clientId,
        order_id: formData.orderId && formData.orderId !== "none" ? formData.orderId : null,
        amount: amountNum,
        payment_method: formData.paymentMethod,
        payment_date: formData.paymentDate,
        reference_id: formData.referenceId,
        notes: formData.notes,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({
            clientId: "",
            orderId: "",
            amount: "",
            paymentMethod: "Cash",
            paymentDate: new Date().toISOString().split('T')[0],
            referenceId: "",
            notes: "",
          });
        },
      },
    );
  };

  const handleDeletePayment = (paymentId: string) => {
    deletePayment.mutate(paymentId, {
      onSettled: () => {
        setIsDeleteDialogOpenConfirm(false);
        setPaymentToDeleteId(null);
      },
    });
  };

  // ─── Access Control ──────────────────────────────────
  if (!roleLoading && isStaff) {
    return (
      <AccessDenied
        title="Payments Access Restricted"
        description="The payments section is only accessible to administrators. Please contact your admin if you need access to financial features."
      />
    );
  }

  // ─── Loading Skeleton ────────────────────────────────
  if (loading) {
    return <PaymentsSkeleton />;
  }

  // ─── Mutation state ──────────────────────────────────
  const isMutating = createPayment.isPending || deletePayment.isPending;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments & Ledger</h1>
          <p className="text-zinc-500">Manage client settlements, track outstanding balances, and view transaction history.</p>
        </div>
        <IOSButton variant="filled" className="px-5" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Payment Entry
        </IOSButton>
      </div>

      {/* ════════════════════════════════════════════════════════════
          RECORD PAYMENT MODAL — Custom overlay + panel
          ════════════════════════════════════════════════════════════ */}
      {portalMounted && isDialogOpen && createPortal(
        <div
          className={cn(
            "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-[220ms] ease-out",
            animateOpen ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={handleModalClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
            className={cn(
              "relative w-full sm:max-w-[780px] xl:max-w-[860px] bg-white dark:bg-[#161B27] rounded-none sm:rounded-[20px] shadow-2xl flex flex-col transition-all duration-[220ms] ease-out",
              "h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh]",
              animateOpen ? "translate-y-0 sm:scale-100" : "translate-y-full sm:translate-y-5 sm:scale-95"
            )}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Scrollable content area ── */}
            <form onSubmit={handleAddPayment} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 overscroll-contain">

                {/* ── HEADER ── */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <line x1="2" y1="10" x2="22" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <h2 id="record-payment-title" className="text-[17px] font-semibold text-[#0F172A] dark:text-white leading-tight">
                        Record Payment
                      </h2>
                      <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">
                        Track client payments and outstanding balances
                      </p>
                    </div>
                  </div>

                  {/* Outstanding badge — show only when order is selected */}
                  {selectedOrder && (
                    <div className="flex flex-col items-end gap-0.5 mr-8 hidden sm:flex">
                      <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Outstanding</span>
                      <span className="text-[18px] font-bold text-[#0F172A] dark:text-white tabular-nums">
                        {"\u20B9"}{formatIndianNumber(outstandingAmount)}
                      </span>
                    </div>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:bg-[rgba(15,23,42,0.06)] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* ── SECTION 1: Client & Order ── */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Client field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Client</label>
                      <div className="relative">
                        <select
                          ref={firstInputRef}
                          value={formData.clientId}
                          onChange={(e: any) => setFormData({ ...formData, clientId: e.target.value, orderId: "" })}
                          className="w-full h-[46px] rounded-[12px] appearance-none border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] text-[15px] text-[#0F172A] dark:text-white outline-none focus:border-[#2563EB] focus:ring-0 transition-colors pl-4 pr-10 cursor-pointer"
                          required
                        >
                          <option value="" disabled>Select Client</option>
                          {clients.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Linked Order field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Linked Order</label>
                      <div className="relative">
                        <select
                          value={formData.orderId || "none"}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            const selOrder = orders.find((o: any) => o.id === v);
                            const paidForOrder = payments
                              .filter((p: any) => p.orderId === v)
                              .reduce((acc: number, p: any) => acc + Number(p.amount), 0);
                            const rem = selOrder ? Number(selOrder.totalAmount) - paidForOrder : 0;

                            setFormData({
                              ...formData,
                              orderId: v === "none" ? "" : v,
                              amount: v && v !== "none" ? rem.toString() : formData.amount
                            });
                          }}
                          disabled={!formData.clientId}
                          className="w-full h-[46px] rounded-[12px] appearance-none border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] text-[15px] text-[#0F172A] dark:text-white outline-none focus:border-[#2563EB] focus:ring-0 transition-colors pl-4 pr-10 cursor-pointer disabled:opacity-40"
                        >
                          <option value="none">General Payment</option>
                          {formData.clientId && getClientOrders(formData.clientId).map((o: any) => {
                            const orderPaid = payments.filter((p: any) => p.orderId === o.id).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
                            const orderDue = Number(o.totalAmount) - orderPaid;
                            return (
                              <option key={o.id} value={o.id}>
                                {o.productName} (Due: {"\u20B9"}{formatIndianNumber(orderDue)})
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-6 border-t border-[rgba(15,23,42,0.06)] dark:border-white/[0.06]" />

                {/* ── SECTION 2: Payment Details (2×2 grid) ── */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Amount field — visually strong */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-bold text-[#0F172A] dark:text-white select-none pointer-events-none">{"\u20B9"}</span>
                        <NumericInput
                          value={formData.amount}
                          onValueChange={(v) => setFormData({ ...formData, amount: v })}
                          className="w-full pl-9 h-[56px] rounded-[12px] text-[22px] font-bold tabular-nums text-[#0F172A] dark:text-white border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] focus:border-[#2563EB] focus:ring-0 outline-none transition-colors"
                          placeholder="0.00"
                          allowDecimal={true}
                          min={0}
                          required
                        />
                      </div>
                    </div>

                    {/* Payment Mode — pill selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Mode</label>
                      <div className="grid grid-cols-4 gap-2 h-[56px]">
                        {(['Cash', 'UPI', 'Bank', 'Cheque'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFormData({ ...formData, paymentMethod: mode === 'Bank' ? 'Bank Transfer' : mode })}
                            className={cn(
                              "h-full rounded-[10px] text-[13px] font-medium transition-all duration-150 border",
                              paymentModePill === mode
                                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                                : 'bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] text-[#64748B] dark:text-slate-400 border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] hover:border-[rgba(59,130,246,0.4)] hover:text-[#2563EB]'
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Date</label>
                      <input
                        type="date"
                        value={formData.paymentDate}
                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        required
                        className="w-full h-[46px] rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 text-[15px] text-[#0F172A] dark:text-white outline-none focus:border-[#2563EB] focus:ring-0 transition-colors"
                      />
                    </div>

                    {/* Reference field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Reference / UTR</label>
                      <input
                        type="text"
                        placeholder="TXN..."
                        value={formData.referenceId}
                        onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                        className="w-full h-[46px] rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 text-[15px] text-[#0F172A] dark:text-white placeholder:text-[#94a3b8] dark:placeholder:text-slate-500 outline-none focus:border-[#2563EB] focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-6 border-t border-[rgba(15,23,42,0.06)] dark:border-white/[0.06]" />

                {/* ── SECTION 3: Notes ── */}
                <div className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Notes</label>
                    <textarea
                      placeholder="Note about the payment..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full rounded-[12px] border border-[rgba(15,23,42,0.08)] dark:border-white/[0.08] bg-[rgba(255,255,255,0.72)] dark:bg-white/[0.04] px-4 py-3 text-[14px] text-[#0F172A] dark:text-white placeholder:text-[#94a3b8] dark:placeholder:text-slate-500 resize-none min-h-[80px] focus:border-[#2563EB] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* ── SECTION 4: Live Summary Card ── */}
                {selectedClient && selectedOrder && (
                  <div className="mx-6 mb-6">
                    <div className="rounded-[16px] bg-[rgba(37,99,235,0.04)] dark:bg-blue-950/20 border border-[rgba(37,99,235,0.12)] dark:border-blue-800/30 p-4">
                      <p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-widest mb-3">Payment Summary</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                        <div>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Client</p>
                          <p className="text-[13px] font-medium text-[#0F172A] dark:text-white">{clientName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Order</p>
                          <p className="text-[13px] font-medium text-[#0F172A] dark:text-white">{orderName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Outstanding</p>
                          <p className="text-[13px] font-medium text-[#0F172A] dark:text-white tabular-nums">{"\u20B9"}{formatIndianNumber(outstandingAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Recording</p>
                          <p className="text-[13px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">{"\u20B9"}{formatIndianNumber(Number(enteredAmount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Remaining</p>
                          <p className={cn(
                            "text-[13px] font-bold tabular-nums",
                            remaining === 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : remaining > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          )}>
                            {"\u20B9"}{formatIndianNumber(Math.abs(remaining))}
                            {remaining < 0 && ' over'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* ── PINNED FOOTER — always visible at bottom, never scrolls ── */}
              <div className="shrink-0 bg-white dark:bg-[#161B27] border-t border-[rgba(15,23,42,0.06)] dark:border-white/[0.06] px-6 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-5 py-2.5 rounded-[10px] text-[14px] font-medium text-[#64748B] dark:text-slate-400 hover:bg-[rgba(15,23,42,0.04)] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isMutating}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] text-[14px] font-semibold text-white bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
                  >
                    {createPayment.isPending ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {createPayment.isPending ? 'Recording\u2026' : 'Record Payment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
          <StatWidget
            label="Total Collected"
            value={totalReceived}
            change={8}
            icon={CheckCircle2}
            color="green"
            prefix={"\u20B9"}
            delay={0}
          />
          <StatWidget
            label="Outstanding Arrears"
            value={totalOutstanding}
            change={0}
            icon={Clock}
            color="orange"
            prefix={"\u20B9"}
            delay={1}
          />
          <StatWidget
            label="Recovery Efficiency"
            value={totalRevenue > 0 ? Math.round((totalReceived / totalRevenue) * 100) : 100}
            change={5}
            icon={TrendingUp}
            color="purple"
            suffix="%"
            delay={2}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-[var(--muted)] rounded-[12px] w-full sm:w-auto h-[44px]">
            <button
              className={cn(
                "flex-1 sm:flex-none h-full px-5 text-[15px] font-semibold transition-all rounded-[10px]",
                viewType === "receivables" ? "bg-white dark:bg-[rgba(255,255,255,0.1)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
              onClick={() => setViewType("receivables")}
            >
              Active Due
            </button>
            <button
              className={cn(
                "flex-1 sm:flex-none h-full px-5 text-[15px] font-semibold transition-all rounded-[10px]",
                viewType === "clients" ? "bg-white dark:bg-[rgba(255,255,255,0.1)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
              onClick={() => setViewType("clients")}
            >
              Client Summary
            </button>
            <button
              className={cn(
                "flex-1 sm:flex-none h-full px-5 text-[15px] font-semibold transition-all rounded-[10px]",
                viewType === "history" ? "bg-white dark:bg-[rgba(255,255,255,0.1)] text-[var(--foreground)] shadow-[var(--shadow-sm)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
              onClick={() => setViewType("history")}
            >
              Full History
            </button>
          </div>

          <div className="w-full sm:max-w-xs">
            <IOSSearchBar
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Search financials..."
            />
          </div>
        </div>

        {viewType === "receivables" && (
          <>
          {/* Mobile Cards — Clickable */}
          <div className="flex flex-col gap-3 md:hidden">
            {orders.filter((o: any) => o.paymentStatus !== 'paid').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: '#34d399' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#34d399' }}>All orders fully settled! 🥳</p>
              </div>
            ) : orders.filter((o: any) => o.paymentStatus !== 'paid' && (o.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.productName.toLowerCase().includes(searchTerm.toLowerCase()))).map((order: any) => {
              const paid = payments.filter((p: any) => p.orderId === order.id).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
              const due = Number(order.totalAmount) - paid;
              return (
                <div
                  key={order.id}
                  onClick={() => handleCardClick(order, due)}
                  className="bg-white dark:bg-[#1C2333] rounded-[14px] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
                  style={{ borderLeftWidth: 4, borderLeftColor: order.paymentStatus === 'partial' ? '#3b82f6' : '#f59e0b' }}
                >
                  <div className="px-4 py-3 space-y-1.5">
                    {/* Row 1: Client + due amount */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-semibold text-[var(--foreground)] truncate flex-1">
                        {order.client?.name || 'Unknown'}
                      </span>
                      <span className="text-[15px] font-bold text-amber-500 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        {"\u20B9"}{Number(due ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {/* Row 2: Billed + Paid badge + Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        Billed: {"\u20B9"}{Number(order.totalAmount ?? 0).toLocaleString('en-IN')}
                      </span>
                      {paid > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                          Paid: {"\u20B9"}{Number(paid ?? 0).toLocaleString('en-IN')}
                        </span>
                      )}
                      <IOSBadge
                        variant={order.paymentStatus === 'partial' ? 'tinted' : 'outline'}
                        color={order.paymentStatus === 'partial' ? 'blue' : 'orange'}
                        className="uppercase text-[10px] tracking-wider"
                      >
                        {order.paymentStatus === 'partial' ? 'Partial' : 'Pending'}
                      </IOSBadge>
                    </div>
                    {/* Row 3: Product name */}
                    <div className="text-[12px] text-[var(--muted-foreground)] truncate">
                      {order.productName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop Table — Clickable rows */}
          <IOSCard className="overflow-hidden bg-white dark:bg-[var(--card)] hidden md:block">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">Client / Order</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Total Billed</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Paid</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Outstanding</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-center">Status</th>
                    <th scope="col" className="px-6 py-4 rounded-tr-[16px]"></th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-[var(--border)]"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {orders.filter((o: any) => o.paymentStatus !== 'paid').length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-24 text-[var(--erp-success)] font-semibold bg-[var(--erp-success)]/10">All orders fully settled! 🥳</td></tr>
                  ) : orders.filter((o: any) =>
                    o.paymentStatus !== 'paid' && (o.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.productName.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).map((order: any) => {
                    const paid = payments.filter((p: any) => p.orderId === order.id).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
                    const due = Number(order.totalAmount) - paid;
                    return (
                      <motion.tr
                        variants={staggerItem}
                        key={order.id}
                        className="group cursor-pointer hover:bg-[var(--muted)]/50 hover:-translate-y-[1px] hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-150"
                        onClick={() => handleCardClick(order, due)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[15px] text-[var(--foreground)]">{order.client?.name}</span>
                            <span className="text-[13px] text-[var(--muted-foreground)]">{order.productName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-[var(--muted-foreground)]">{"\u20B9"}{Number(order.totalAmount).toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold text-[var(--erp-success)]">{"\u20B9"}{paid.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[var(--erp-warning)]">{"\u20B9"}{due.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <IOSBadge
                            variant={order.paymentStatus === 'partial' ? 'tinted' : 'outline'}
                            color={order.paymentStatus === 'partial' ? 'blue' : 'orange'}
                            className="uppercase text-[10px] tracking-wider"
                          >
                            {order.paymentStatus === 'partial' ? 'Partially Paid' : 'Pending'}
                          </IOSBadge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <IOSButton
                            variant="plain"
                            className="h-8 w-8 !p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleCardClick(order, due);
                            }}
                          >
                            <ArrowUpRight className="h-5 w-5 text-[var(--erp-success)]" />
                          </IOSButton>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          </IOSCard>
          </>
        )}

        {viewType === "clients" && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {clientSummaries.map((summary: any) => (
              <motion.div key={summary.id} variants={staggerItem}>
                <IOSCard variant="elevated" className="h-full cursor-pointer hover:-translate-y-0.5 hover:border-blue-400/40 active:scale-[0.98] transition-all duration-150"
                  onClick={() => {
                    setFormData({ ...formData, clientId: summary.id, orderId: "" });
                    setIsDialogOpen(true);
                  }}
                >
                  <IOSCardHeader
                    title={summary.name}
                    className="[&_h3]:text-[17px] [&_h3]:font-semibold mb-2"
                    action={<User className="h-5 w-5 text-[var(--muted-foreground)]" />}
                  />
                  <IOSCardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div className="text-[var(--muted-foreground)]">Orders Billed</div>
                      <div className="text-right font-semibold text-[var(--foreground)]">{"\u20B9"}{summary.billed.toLocaleString()}</div>
                      <div className="text-[var(--muted-foreground)]">Payments Recv.</div>
                      <div className="text-right font-semibold text-[var(--erp-success)]">{"\u20B9"}{summary.received.toLocaleString()}</div>
                    </div>
                    <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] block tracking-wider mb-1">Status</span>
                        <IOSBadge
                          variant="tinted"
                          color={summary.outstanding > 0 ? "orange" : (summary.outstanding < 0 ? "green" : "gray")}
                          className="uppercase text-[10px] tracking-wider"
                        >
                          {summary.outstanding > 0 ? 'Due' : (summary.outstanding < 0 ? 'Advance' : 'Settled')}
                        </IOSBadge>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] block tracking-wider mb-0.5">
                          {summary.outstanding >= 0 ? 'Outstanding' : 'Credit Balance'}
                        </span>
                        <span className={cn(
                          "font-bold text-[20px] tracking-tight",
                          summary.outstanding > 0 ? "text-[var(--erp-warning)]" : (summary.outstanding < 0 ? "text-[var(--erp-success)]" : "text-[var(--muted-foreground)]")
                        )}>
                          {"\u20B9"}{Math.abs(summary.outstanding).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <IOSButton
                        variant="gray"
                        className="w-full"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setFormData({ ...formData, clientId: summary.id, orderId: "" });
                          setIsDialogOpen(true);
                        }}
                      >
                        Record Payment
                      </IOSButton>
                    </div>
                  </IOSCardContent>
                </IOSCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {viewType === "history" && (
          <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 15, color: '#948e9c' }}>No payment records found.</p>
              </div>
            ) : filteredHistory.map((p: any) => (
              <PaymentHistoryCard
                key={p.id}
                payment={p as Payment}
                onLongPress={handlePaymentLongPress}
              />
            ))}
          </div>
          {/* Desktop Table */}
          <IOSCard className="overflow-hidden bg-white dark:bg-[var(--card)] hidden md:block">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">Date</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Client</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Mode</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Reference / Remark</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <motion.tbody
                  className="divide-y divide-[var(--border)]"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-20 text-[var(--muted-foreground)]">No payment records found.</td></tr>
                  ) : filteredHistory.map((p: any) => (
                    <motion.tr
                      variants={staggerItem}
                      key={p.id}
                      className="group hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                          <span className="font-medium text-[15px] text-[var(--foreground)]">{new Date(p.paymentDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[15px] text-[var(--foreground)]">{p.client?.name}</span>
                          <span className="text-[13px] text-[var(--muted-foreground)]">{p.order?.productName || 'General Payment'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <IOSBadge variant="tinted" color="green" className="font-semibold px-2 border-transparent">
                          {p.paymentMethod}
                        </IOSBadge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-[12px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded w-fit">{p.referenceId || '-'}</span>
                          <span className="text-[13px] text-[var(--muted-foreground)] truncate max-w-[150px] mt-1 pr-4">{p.notes}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="font-bold text-[17px] text-[var(--erp-success)] tracking-tight">{"\u20B9"}{Number(p.amount).toLocaleString()}</span>
                          <IOSButton
                            variant="plain"
                            className="h-8 w-8 !p-0 opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                            onClick={() => {
                              setPaymentToDeleteId(p.id);
                              setIsDeleteDialogOpenConfirm(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IOSButton>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </IOSCard>
          </>
        )}
      </div>

      <ConfirmDeleteSheet
        open={isDeleteDialogOpenConfirm}
        onClose={() => setIsDeleteDialogOpenConfirm(false)}
        onConfirm={async () => {
          if (paymentToDeleteId) {
            await handleDeletePayment(paymentToDeleteId);
          }
        }}
        isDeleting={deletePayment.isPending}
        entityLabel="payment"
        entityName={
          payments.find((p) => p.id === paymentToDeleteId)?.id ||
          payments.find((p) => p.id === paymentToDeleteId)?.transaction_id
        }
        consequenceText="transaction record will be permanently removed. This cannot be undone."
      />

      {/* ── Long Press Action Sheet ── */}
      <MobileSheet open={showPaymentActions} onClose={closePaymentSheet}>
        {selectedPayment && (
          <div className="flex flex-col gap-2 pb-4">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <p className="font-semibold text-[var(--foreground)]">
                {selectedPayment.client?.name || 'Unknown'}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {"\u20B9"}{Number(selectedPayment.amount ?? 0).toLocaleString('en-IN')} · {selectedPayment.paymentMethod}
              </p>
            </div>

            {/* Actions */}
            <button
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
              onClick={() => {
                closePaymentSheet();
                toast.info('Payment detail view coming soon');
              }}
            >
              <Receipt className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              View Details
            </button>

            <button
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
              onClick={() => {
                closePaymentSheet();
                if (selectedPayment.clientId) {
                  setFormData(prev => ({
                    ...prev,
                    clientId: selectedPayment.clientId || '',
                    orderId: selectedPayment.orderId || '',
                  }));
                }
                setTimeout(() => setIsDialogOpen(true), 400);
              }}
            >
              <IndianRupee className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              Record Payment
            </button>

            <button
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-[var(--foreground)] text-left w-full"
              onClick={() => {
                closePaymentSheet();
                toast.info('Reminder feature coming soon');
              }}
            >
              <Send className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              Send Reminder
            </button>

            <button
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] active:bg-[var(--muted)] text-red-500 text-left w-full"
              onClick={() => {
                closePaymentSheet();
                setPaymentToDeleteId(selectedPayment.id);
                setIsDeleteDialogOpenConfirm(true);
              }}
            >
              <Trash2 className="h-[18px] w-[18px]" />
              Delete Payment
            </button>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}
