/**
 * React Query hooks for Orders, Clients, Inventory CRUD
 * ──────────────────────────────────────────────────────
 * Replaces manual useState/useEffect/fetchData pattern with
 * automatic cache invalidation via React Query.
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Query Keys ──────────────────────────────────────────
export const queryKeys = {
    orders: ["orders"] as const,
    clients: ["clients"] as const,
    inventory: ["inventory"] as const,
    payments: ["payments"] as const,
    production: ["production"] as const,
    stats: ["dashboard-stats"] as const,
    order: (id: string) => ["orders", id] as const,
    ordersByClient: (clientId: string) => ["orders", "by-client", clientId] as const,
};

// ─── Generic fetcher (resilient) ─────────────────────────
export async function apiFetch<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        let errorMsg = `API ${url} → ${res.status}`;
        try {
            const json = await res.json();
            errorMsg = json.error?.message || json.error || errorMsg;
        } catch { /* non-JSON error body */ }
        console.error("[apiFetch] ERROR:", errorMsg);
        throw new Error(errorMsg);
    }
    const json = await res.json();
    if (json.error) {
        const msg = json.error?.message || json.error || "Request failed";
        console.error("[apiFetch] API error in response body:", msg);
        throw new Error(msg);
    }
    console.log(`[apiFetch] ${url} →`, Array.isArray(json.data) ? `${json.data.length} items` : "ok");
    return json.data ?? json;
}

/** Shared query defaults – retry twice, cache 30s, no window-focus refetch */
const QUERY_DEFAULTS = {
    retry: 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
} as const;

// ─── Queries ─────────────────────────────────────────────

export function useOrders() {
    return useQuery({
        queryKey: queryKeys.orders,
        queryFn: () => apiFetch<any[]>("/api/v1/orders"),
        ...QUERY_DEFAULTS,
    });
}

export function useClients() {
    return useQuery({
        queryKey: queryKeys.clients,
        queryFn: () => apiFetch<any[]>("/api/v1/clients"),
        ...QUERY_DEFAULTS,
    });
}

export function useInventory() {
    return useQuery({
        queryKey: queryKeys.inventory,
        queryFn: () => apiFetch<any[]>("/api/v1/inventory"),
        ...QUERY_DEFAULTS,
    });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const res = await fetch("/api/v1/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error)
                throw new Error(json.error?.message || "Failed to create order");
            return json;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.inventory });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
            toast.success("Order created & stock deducted");
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to create order");
        },
    });
}

export function useUpdateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: Record<string, unknown>;
        }) => {
            const res = await fetch(`/api/v1/orders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error)
                throw new Error(json.error?.message || "Failed to update order");
            return json;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
            toast.success("Order updated successfully");
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to update order");
        },
    });
}

export function useDeleteOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/orders/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error?.message || "Failed to delete order");
            }
            return id;
        },
        // ─── Optimistic delete ───
        onMutate: async (id: string) => {
            await qc.cancelQueries({ queryKey: queryKeys.orders });
            const previous = qc.getQueryData<any[]>(queryKeys.orders);
            qc.setQueryData<any[]>(queryKeys.orders, (old: any[] | undefined) =>
                old ? old.filter((o: any) => o.id !== id) : [],
            );
            return { previous };
        },
        onError: (_err: Error, _id: string, context: { previous?: any[] } | undefined) => {
            if (context?.previous) {
                qc.setQueryData(queryKeys.orders, context.previous);
            }
            toast.error("Failed to delete order");
        },
        onSuccess: () => {
            toast.success("Order deleted");
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
        },
    });
}

export function useRecordPayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const res = await fetch("/api/v1/payments/record", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || !json.success)
                throw new Error(json.error || "Failed to record payment");
            return json;
        },
        onSuccess: (data: any, _variables: Record<string, unknown>) => {
            // Optimistic local patch from server response
            if (data.order_summary) {
                const summary = data.order_summary;
                qc.setQueryData<any[]>(queryKeys.orders, (old: any[] | undefined) =>
                    old
                        ? old.map((o: any) =>
                            o.id === _variables.reference_id
                                ? {
                                    ...o,
                                    paymentStatus:
                                        summary.payment_status || o.paymentStatus,
                                    totalPaid: summary.total_paid ?? o.totalPaid,
                                    balanceDue: summary.balance_due ?? o.balanceDue,
                                    status: summary.order_status || o.status,
                                }
                                : o,
                        )
                        : [],
                );
            }
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.payments });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
            if (typeof _variables.reference_id === "string") {
                qc.invalidateQueries({ queryKey: queryKeys.order(_variables.reference_id) });
            }
            toast.success("Payment recorded — status updated automatically");
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to record payment");
        },
    });
}

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    processing: "In Production",
    completed: "Completed",
};

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await fetch(`/api/v1/orders/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const json = await res.json();
            if (!res.ok || json.success === false || json.error) {
                throw new Error(
                    json.error?.message || json.error || "Failed to update status",
                );
            }
            return json.data ?? json;
        },
        // ─── Optimistic status update (patches productionStatus, not legacy status) ───
        onMutate: async ({ id, status }: { id: string; status: string }) => {
            await qc.cancelQueries({ queryKey: queryKeys.orders });
            const previous = qc.getQueryData<any[]>(queryKeys.orders);
            const now = new Date().toISOString();
            qc.setQueryData<any[]>(queryKeys.orders, (old: any[] | undefined) =>
                old
                    ? old.map((o: any) =>
                        o.id === id
                            ? {
                                ...o,
                                productionStatus: status,
                                updatedAt: now,
                                ...(status === "processing" ? { processedAt: now } : {}),
                                ...(status === "completed" ? {
                                    completedAt: now,
                                    processedAt: o.processedAt || now,
                                    productionStatusManualOverride: true,
                                } : {}),
                                ...(status === "cancelled" || status === "on_hold" ? { status } : {}),
                            }
                            : o,
                    )
                    : [],
            );
            return { previous };
        },
        onError: (_err: Error, _vars: { id: string; status: string }, context: { previous?: any[] } | undefined) => {
            if (context?.previous) {
                qc.setQueryData(queryKeys.orders, context.previous);
            }
            toast.error(_err.message || "Failed to update order status");
        },
        onSuccess: (_data: unknown, vars: { id: string; status: string }) => {
            toast.success(`Order status updated to ${STATUS_LABELS[vars.status] || vars.status}`);
            // Show warning toast if materials had insufficient stock during deduction
            const data = _data as Record<string, unknown>;
            if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
                setTimeout(() => {
                    toast.warning("⚠️ Some materials had insufficient stock. Check inventory.");
                }, 500);
            }
        },
        onSettled: () => {
            // Refresh orders + cross-module data (dashboard stats, inventory)
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.inventory });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
        },
    });
}

// ─── Payments Query & Mutations ──────────────────────────

export function usePayments() {
    return useQuery({
        queryKey: queryKeys.payments,
        queryFn: () => apiFetch<any[]>("/api/v1/payments"),
        staleTime: 60_000, // 60s cache – prevents redundant refetches
    });
}

export function useCreatePayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            client_id: string;
            order_id: string | null;
            amount: number;
            payment_method: string;
            payment_date: string;
            reference_id: string;
            notes: string;
        }) => {
            const res = await fetch("/api/v1/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || json.error || "Failed to record payment");
            }
            return json.data ?? json;
        },
        // ─── Optimistic: instantly add payment to cache ───
        onMutate: async (payload) => {
            await qc.cancelQueries({ queryKey: queryKeys.payments });
            await qc.cancelQueries({ queryKey: queryKeys.orders });

            const prevPayments = qc.getQueryData<any[]>(queryKeys.payments);
            const prevOrders = qc.getQueryData<any[]>(queryKeys.orders);

            // Optimistically append payment
            const optimisticPayment = {
                id: `tmp-${Date.now()}`,
                clientId: payload.client_id,
                orderId: payload.order_id,
                amount: payload.amount,
                paymentMethod: payload.payment_method,
                paymentDate: payload.payment_date,
                referenceId: payload.reference_id,
                notes: payload.notes,
                client: prevOrders
                    ? (() => {
                        const order = prevOrders.find((o: any) => o.clientId === payload.client_id);
                        return order?.client || { name: "—" };
                    })()
                    : { name: "—" },
                order: payload.order_id
                    ? prevOrders?.find((o: any) => o.id === payload.order_id) || null
                    : null,
            };

            qc.setQueryData<any[]>(queryKeys.payments, (old) =>
                old ? [...old, optimisticPayment] : [optimisticPayment],
            );

            // Optimistically update order payment status
            if (payload.order_id && prevOrders) {
                const currentPayments = prevPayments || [];
                const orderPaid = currentPayments
                    .filter((p: any) => p.orderId === payload.order_id)
                    .reduce((acc: number, p: any) => acc + Number(p.amount), 0) + payload.amount;
                const order = prevOrders.find((o: any) => o.id === payload.order_id);
                if (order) {
                    let newStatus = "pending";
                    if (orderPaid >= Number(order.totalAmount) - 0.01) newStatus = "paid";
                    else if (orderPaid > 0) newStatus = "partial";

                    qc.setQueryData<any[]>(queryKeys.orders, (old) =>
                        old
                            ? old.map((o: any) =>
                                o.id === payload.order_id
                                    ? { ...o, paymentStatus: newStatus, totalPaid: orderPaid }
                                    : o,
                            )
                            : [],
                    );
                }
            }

            return { prevPayments, prevOrders };
        },
        onError: (
            _err: Error,
            _payload: any,
            context: { prevPayments?: any[]; prevOrders?: any[] } | undefined,
        ) => {
            // Rollback on error
            if (context?.prevPayments) qc.setQueryData(queryKeys.payments, context.prevPayments);
            if (context?.prevOrders) qc.setQueryData(queryKeys.orders, context.prevOrders);
            toast.error(_err.message || "Failed to record payment");
        },
        onSuccess: () => {
            toast.success("Payment recorded successfully");
        },
        onSettled: async (_data: any, _error: any, payload: any) => {
            // Reconcile order payment status in DB if linked to an order
            try {
                const orderId = payload?.order_id;
                if (orderId) {
                    await fetch(`/api/v1/orders/${orderId}/reconcile-payment`, {
                        method: "POST",
                    });
                }
            } catch (err) {
                // Reconciliation failure is non-blocking — payment is already saved
                console.warn("[reconcile-payment] failed silently:", err);
            }

            // Background re-validate for server truth
            qc.invalidateQueries({ queryKey: queryKeys.payments, exact: false });
            qc.invalidateQueries({ queryKey: queryKeys.orders, exact: false });
            qc.invalidateQueries({ queryKey: queryKeys.clients, exact: false });
        },
    });
}

export function useDeletePayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (paymentId: string) => {
            const res = await fetch(`/api/v1/payments/${paymentId}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || json.error) {
                throw new Error(json.error?.message || "Failed to delete payment");
            }
            return paymentId;
        },
        // ─── Optimistic: instantly remove payment from cache ───
        onMutate: async (paymentId: string) => {
            await qc.cancelQueries({ queryKey: queryKeys.payments });
            await qc.cancelQueries({ queryKey: queryKeys.orders });

            const prevPayments = qc.getQueryData<any[]>(queryKeys.payments);
            const prevOrders = qc.getQueryData<any[]>(queryKeys.orders);
            const deletedPayment = prevPayments?.find((p: any) => p.id === paymentId);

            // Remove from cache
            qc.setQueryData<any[]>(queryKeys.payments, (old) =>
                old ? old.filter((p: any) => p.id !== paymentId) : [],
            );

            // If linked to an order, recalculate payment status
            if (deletedPayment?.orderId && prevOrders && prevPayments) {
                const remainingPaid = prevPayments
                    .filter((p: any) => p.orderId === deletedPayment.orderId && p.id !== paymentId)
                    .reduce((acc: number, p: any) => acc + Number(p.amount), 0);
                const order = prevOrders.find((o: any) => o.id === deletedPayment.orderId);
                if (order) {
                    let newStatus = "pending";
                    if (remainingPaid >= Number(order.totalAmount) - 0.01) newStatus = "paid";
                    else if (remainingPaid > 0) newStatus = "partial";

                    qc.setQueryData<any[]>(queryKeys.orders, (old) =>
                        old
                            ? old.map((o: any) =>
                                o.id === deletedPayment.orderId
                                    ? { ...o, paymentStatus: newStatus, totalPaid: remainingPaid }
                                    : o,
                            )
                            : [],
                    );
                }
            }

            return { prevPayments, prevOrders };
        },
        onError: (
            _err: Error,
            _id: string,
            context: { prevPayments?: any[]; prevOrders?: any[] } | undefined,
        ) => {
            if (context?.prevPayments) qc.setQueryData(queryKeys.payments, context.prevPayments);
            if (context?.prevOrders) qc.setQueryData(queryKeys.orders, context.prevOrders);
            toast.error("Failed to delete payment");
        },
        onSuccess: () => {
            toast.success("Payment deleted");
        },
        onSettled: async (_data: any, _error: any, _paymentId: string, context: any) => {
            // Reconcile order payment status in DB if the deleted payment was linked to an order
            try {
                const deletedPayment = context?.prevPayments?.find((p: any) => p.id === _paymentId);
                const orderId = deletedPayment?.orderId;
                if (orderId) {
                    await fetch(`/api/v1/orders/${orderId}/reconcile-payment`, {
                        method: "POST",
                    });
                }
            } catch (err) {
                console.warn("[reconcile-payment] failed silently:", err);
            }

            qc.invalidateQueries({ queryKey: queryKeys.payments, exact: false });
            qc.invalidateQueries({ queryKey: queryKeys.orders, exact: false });
            qc.invalidateQueries({ queryKey: queryKeys.clients, exact: false });
        },
    });
}

