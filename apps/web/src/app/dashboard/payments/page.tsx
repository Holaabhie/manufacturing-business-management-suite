"use client";

import { useMemo, useState } from "react";
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
  CreditCard
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

  const [formData, setFormData] = useState({
    clientId: "",
    orderId: "",
    amount: "",
    paymentMethod: "Cash",
    paymentDate: new Date().toISOString().split('T')[0],
    referenceId: "",
    notes: ""
  });

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

  // ─── Handlers ────────────────────────────────────────
  const getClientOrders = (clientId: string) =>
    orders.filter((o: any) => o.clientId === clientId && o.paymentStatus !== 'paid');

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
        return toast.error(`Amount exceeds remaining balance for this order (₹${remaining.toLocaleString()})`);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <IOSButton variant="filled" className="px-5">
              <Plus className="mr-2 h-4 w-4" /> New Payment Entry
            </IOSButton>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]">
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IndianRupee className="h-[18px] w-[18px] text-[#4ade80]" />
              </div>
              <div>
                <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Record Payment</DialogTitle>
                <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Link to clients or orders for tracking</DialogDescription>
              </div>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Client Name</label>
                  <IOSSelect
                    value={formData.clientId}
                    onChange={(e: any) => setFormData({ ...formData, clientId: e.target.value, orderId: "" })}
                    placeholder="Select Client"
                    options={clients.map((c: any) => ({ label: c.name, value: c.id }))}
                  />
                </div>

                {formData.clientId && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Linked Order (Optional)</label>
                    <IOSSelect
                      value={formData.orderId || "none"}
                      onChange={(e: any) => {
                        const v = e.target.value;
                        const selectedOrder = orders.find((o: any) => o.id === v);
                        const paidForOrder = payments
                          .filter((p: any) => p.orderId === v)
                          .reduce((acc: number, p: any) => acc + Number(p.amount), 0);
                        const remaining = selectedOrder ? Number(selectedOrder.totalAmount) - paidForOrder : 0;

                        setFormData({
                          ...formData,
                          orderId: v === "none" ? "" : v,
                          amount: v && v !== "none" ? remaining.toString() : formData.amount
                        });
                      }}
                      placeholder="General Payment (No specific order)"
                      options={[
                        { label: "General Payment", value: "none" },
                        ...getClientOrders(formData.clientId).map((o: any) => ({
                          label: `${o.productName} (Due: ₹${Number(Number(o.totalAmount) - payments.filter((p: any) => p.orderId === o.id).reduce((acc: number, p: any) => acc + Number(p.amount), 0)).toLocaleString()})`,
                          value: o.id
                        }))
                      ]}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Amount (₹)</label>
                    <NumericInput
                      value={formData.amount}
                      onValueChange={(v) => setFormData({ ...formData, amount: v })}
                      className="h-[44px] bg-[var(--muted)] border-transparent rounded-[12px] font-semibold text-[17px] text-[var(--erp-success)] focus-visible:ring-[var(--erp-success)]"
                      placeholder="0.00"
                      prefix="₹"
                      allowDecimal={true}
                      min={0}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Mode</label>
                    <IOSSelect
                      value={formData.paymentMethod}
                      onChange={(e: any) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "UPI / Digital", value: "UPI" },
                        { label: "Bank Transfer", value: "Bank Transfer" },
                        { label: "Cheque", value: "Cheque" },
                        { label: "Credit / Adjustment", value: "Credit/Due" }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Date</label>
                    <IOSInput
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Ref / ID</label>
                    <IOSInput
                      placeholder="TXN..."
                      value={formData.referenceId}
                      onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Remarks</label>
                  <IOSInput
                    placeholder="Note about the payment..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-[var(--border)]">
                <IOSButton type="submit" variant="filled" className="w-full" disabled={isMutating}>
                  {createPayment.isPending ? "Posting..." : "Post Entry"}
                </IOSButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="kpi-panel">
        <div className="kpi-panel__glow"></div>
        <div className="kpi-grid !grid-cols-1 md:!grid-cols-3">
          <StatWidget
            label="Total Collected"
            value={totalReceived}
            change={8}
            icon={CheckCircle2}
            color="green"
            prefix="₹"
            delay={0}
          />
          <StatWidget
            label="Outstanding Arrears"
            value={totalOutstanding}
            change={0}
            icon={Clock}
            color="orange"
            prefix="₹"
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
          {/* Mobile Cards */}
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
                <div key={order.id} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: order.paymentStatus === 'partial' ? '#3b82f6' : '#f59e0b' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#e6e0e9', letterSpacing: '-0.5px' }}>{order.client?.name}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>₹{due.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: '#948e9c' }}>{order.productName}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Billed: ₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>Paid: ₹{paid.toLocaleString('en-IN')}</span>
                    <IOSBadge variant={order.paymentStatus === 'partial' ? 'tinted' : 'outline'} color={order.paymentStatus === 'partial' ? 'blue' : 'orange'} className="uppercase text-[10px] tracking-wider">{order.paymentStatus === 'partial' ? 'Partial' : 'Pending'}</IOSBadge>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop Table */}
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
                        className="group hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[15px] text-[var(--foreground)]">{order.client?.name}</span>
                            <span className="text-[13px] text-[var(--muted-foreground)]">{order.productName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-[var(--muted-foreground)]">₹{Number(order.totalAmount).toLocaleString()}</td>
                        <td className="px-6 py-4 font-semibold text-[var(--erp-success)]">₹{paid.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-[var(--erp-warning)]">₹{due.toLocaleString()}</span>
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
                            onClick={() => {
                              setFormData({ ...formData, clientId: order.clientId, orderId: order.id, amount: due.toString() });
                              setIsDialogOpen(true);
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
                <IOSCard variant="elevated" className="h-full">
                  <IOSCardHeader
                    title={summary.name}
                    className="[&_h3]:text-[17px] [&_h3]:font-semibold mb-2"
                    action={<User className="h-5 w-5 text-[var(--muted-foreground)]" />}
                  />
                  <IOSCardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div className="text-[var(--muted-foreground)]">Orders Billed</div>
                      <div className="text-right font-semibold text-[var(--foreground)]">₹{summary.billed.toLocaleString()}</div>
                      <div className="text-[var(--muted-foreground)]">Payments Recv.</div>
                      <div className="text-right font-semibold text-[var(--erp-success)]">₹{summary.received.toLocaleString()}</div>
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
                          ₹{Math.abs(summary.outstanding).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <IOSButton
                        variant="gray"
                        className="w-full"
                        onClick={() => {
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
            ) : filteredHistory.map((p: any) => {
              const methodColors: Record<string, string> = { 'Bank Transfer': '#3b82f6', 'Cash': '#10b981', 'UPI': '#a855f7', 'Cheque': '#f59e0b', 'Credit/Due': '#ef4444' };
              const color = methodColors[p.paymentMethod] || '#6366f1';
              const MethodIcon = ({ method }: { method: string }) => {
                const icons: Record<string, any> = { 'Bank Transfer': Landmark, 'Cash': Banknote, 'UPI': QrCode, 'Cheque': FileText, 'Credit/Due': CreditCard };
                const Icon = icons[method] || Banknote;
                return <Icon className="h-3.5 w-3.5" />;
              };
              return (
                <div key={p.id} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#e6e0e9', letterSpacing: '-0.5px' }}>{p.client?.name || 'Unknown'}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 14, color: '#948e9c' }}>{p.order?.productName || p.referenceId || 'General'}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', background: `${color}15`, color, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MethodIcon method={p.paymentMethod} />
                        {p.paymentMethod}
                      </span>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>Completed</span>
                    </div>
                    <button onClick={() => { setPaymentToDeleteId(p.id); setIsDeleteDialogOpenConfirm(true); }} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
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
                          <span className="font-bold text-[17px] text-[var(--erp-success)] tracking-tight">₹{Number(p.amount).toLocaleString()}</span>
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

      <Dialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <DialogContent className="max-w-[350px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px]">
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(239,68,68,0.4), rgba(255,255,255,0.06))", border: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 className="h-[18px] w-[18px] text-[#f87171]" />
            </div>
            <div>
              <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Delete Payment</DialogTitle>
              <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>This action cannot be undone.</DialogDescription>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <IOSButton variant="gray" onClick={() => setIsDeleteDialogOpenConfirm(false)} className="flex-1">
              Cancel
            </IOSButton>
            <IOSButton
              variant="destructive"
              onClick={() => paymentToDeleteId && handleDeletePayment(paymentToDeleteId)}
              className="flex-1"
              disabled={deletePayment.isPending}
            >
              {deletePayment.isPending ? "Deleting..." : "Delete"}
            </IOSButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
