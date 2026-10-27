/**
 * React Query hooks for Orders, Clients, and Payments
 * ──────────────────────────────────────────────────────
 * Cleanly typed with apiClient and centralized queryKeys.
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { playCompletionSound } from "@/hooks/useCompletionSound";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PaginationInfo } from "@/shared/lib/pagination";
import { useClients } from "./use-clients";
import { useInventory } from "./use-inventory";

// Re-export queryKeys, useClients, useInventory for full backward compatibility
export { queryKeys, useClients, useInventory };

export interface OrderItem {
    id: string;
    product_name?: string;
    productName?: string;
    quantity: number;
    unit?: string;
    rate?: number;
    total_amount?: number;
    totalAmount?: number;
    delivery_date?: string;
    deliveryDate?: string;
    status: string;
    productionStatus?: string;
    productionStatusManualOverride?: boolean;
    payment_status?: string;
    paymentStatus?: string;
    client_id?: string;
    clientId?: string;
    client?: {
        name?: string;
        email?: string;
        phone?: string;
        address?: string;
    } | null;
    clients?: {
        name?: string;
        email?: string;
        address?: string;
    } | null;
    materials?: Array<Record<string, unknown>>;
    material_cost?: number;
    labour_cost?: number;
    overhead_cost?: number;
    totalPaid?: number;
    balanceDue?: number;
    priority?: string;
    notes?: string;
    createdAt?: string;
    processedAt?: string | null;
    completedAt?: string | null;
    is_sample?: boolean;
}

export interface PaymentItem {
    id: string;
    clientId?: string;
    client_id?: string;
    orderId?: string | null;
    order_id?: string | null;
    amount: number;
    paymentMethod?: string;
    payment_method?: string;
    paymentDate?: string;
    payment_date?: string;
    referenceId?: string;
    reference_id?: string;
    transaction_ref?: string | null;
    transaction_id?: string | null;
    notes?: string;
    client?: { name?: string };
    order?: OrderItem | null;
}

export async function apiFetch<T>(url: string): Promise<T> {
    return apiClient.get<T>(url);
}

// ─── Queries ─────────────────────────────────────────────

import type { PaginatedResult } from "@/shared/lib/pagination";
import { useClientOptions } from "./use-clients";
import { useInventoryOptions } from "./use-inventory";

export { useClientOptions, useInventoryOptions };

export type OrdersQueryResult = PaginatedResult<OrderItem>;

export function useOrders(filters?: Record<string, unknown>) {
    return useQuery<OrdersQueryResult>({
        queryKey: filters ? [...queryKeys.orders, filters] : queryKeys.orders,
        queryFn: async () => {
            const res = await apiClient.get<
                | { success: boolean; data: OrderItem[]; pagination: PaginationInfo }
                | { success: boolean; data: OrderItem[]; truncated: boolean; total: number }
                | OrderItem[]
            >("/api/v1/orders", {
                params: filters as Record<string, string | number | boolean>,
            });

            if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: OrderItem[] }).data)) {
                const responseObj = res as {
                    data: OrderItem[];
                    pagination?: PaginationInfo;
                    truncated?: boolean;
                    total?: number;
                };
                return {
                    data: responseObj.data,
                    pagination: responseObj.pagination,
                    truncated: responseObj.truncated,
                    total: responseObj.pagination?.total ?? responseObj.total ?? responseObj.data.length,
                };
            }

            const rawArray = Array.isArray(res) ? res : [];
            return {
                data: rawArray,
                total: rawArray.length,
            };
        },
        placeholderData: keepPreviousData,
    });
}

export function useOrder(id: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.order(id),
        queryFn: () => apiClient.get<OrderItem>(`/api/v1/orders/${id}`),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreateOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: Record<string, unknown>) =>
            apiClient.post<OrderItem>("/api/v1/orders", payload),
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
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: Record<string, unknown>;
        }) => apiClient.put<OrderItem>(`/api/v1/orders/${id}`, payload),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.order(variables.id) });
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
            await apiClient.delete(`/api/v1/orders/${id}`);
            return id;
        },
        onMutate: async (id: string) => {
            await qc.cancelQueries({ queryKey: queryKeys.orders });
            const previous = qc.getQueryData<OrderItem[]>(queryKeys.orders);
            qc.setQueryData<OrderItem[]>(queryKeys.orders, (old) =>
                old ? old.filter((o) => o.id !== id) : [],
            );
            return { previous };
        },
        onError: (_err: Error, _id: string, context: { previous?: OrderItem[] } | undefined) => {
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
        mutationFn: (payload: Record<string, unknown>) =>
            apiClient.post<{
                success: boolean;
                order_summary?: {
                    payment_status?: string;
                    total_paid?: number;
                    balance_due?: number;
                    order_status?: string;
                };
            }>("/api/v1/payments/record", payload),
        onSuccess: (data, variables) => {
            if (data.order_summary) {
                const summary = data.order_summary;
                qc.setQueryData<OrderItem[]>(queryKeys.orders, (old) =>
                    old
                        ? old.map((o) =>
                            o.id === variables.reference_id
                                ? {
                                    ...o,
                                    paymentStatus: summary.payment_status || o.paymentStatus,
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
            if (typeof variables.reference_id === "string") {
                qc.invalidateQueries({ queryKey: queryKeys.order(variables.reference_id) });
            }
            toast.success("Payment recorded — status updated automatically");
            playCompletionSound("payment");
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
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            apiClient.patch<{ data?: OrderItem; warnings?: string[] }>(`/api/v1/orders/${id}/status`, { status }),
        onMutate: async ({ id, status }: { id: string; status: string }) => {
            await qc.cancelQueries({ queryKey: queryKeys.orders });
            const previous = qc.getQueryData<OrderItem[]>(queryKeys.orders);
            const now = new Date().toISOString();
            qc.setQueryData<OrderItem[]>(queryKeys.orders, (old) =>
                old
                    ? old.map((o) =>
                        o.id === id
                            ? {
                                ...o,
                                productionStatus: status,
                                updatedAt: now,
                                ...(status === "processing" ? { processedAt: now } : {}),
                                ...(status === "completed"
                                    ? {
                                        completedAt: now,
                                        processedAt: o.processedAt || now,
                                        productionStatusManualOverride: true,
                                    }
                                    : {}),
                                ...(status === "cancelled" || status === "on_hold" ? { status } : {}),
                            }
                            : o,
                    )
                    : [],
            );
            return { previous };
        },
        onError: (_err: Error, _vars: { id: string; status: string }, context: { previous?: OrderItem[] } | undefined) => {
            if (context?.previous) {
                qc.setQueryData(queryKeys.orders, context.previous);
            }
            toast.error(_err.message || "Failed to update order status");
        },
        onSuccess: (data, vars: { id: string; status: string }) => {
            toast.success(`Order status updated to ${STATUS_LABELS[vars.status] || vars.status}`);
            if (Array.isArray(data?.warnings) && data.warnings.length > 0) {
                setTimeout(() => {
                    toast.warning("⚠️ Some materials had insufficient stock. Check inventory.");
                }, 500);
            }
        },
        onSettled: (_, __, vars) => {
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.order(vars.id) });
            qc.invalidateQueries({ queryKey: queryKeys.inventory });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
        },
    });
}

// ─── Payments Query & Mutations ──────────────────────────

export function usePayments() {
    return useQuery({
        queryKey: queryKeys.payments,
        queryFn: () => apiClient.get<PaymentItem[]>("/api/v1/payments"),
        staleTime: 60_000,
    });
}

export function useCreatePayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: {
            client_id: string;
            order_id: string | null;
            amount: number;
            payment_method: string;
            payment_date: string;
            reference_id: string;
            notes: string;
        }) => apiClient.post<PaymentItem>("/api/v1/payments", payload),
        onSuccess: () => {
            toast.success("Payment recorded successfully");
            playCompletionSound("payment");
        },
        onSettled: async (_, __, payload) => {
            if (payload?.order_id) {
                try {
                    await apiClient.post(`/api/v1/orders/${payload.order_id}/reconcile-payment`);
                } catch (err) {
                    console.warn("[reconcile-payment] failed silently:", err);
                }
            }
            qc.invalidateQueries({ queryKey: queryKeys.payments });
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.clients });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
        },
    });
}

export function useDeletePayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (paymentId: string) => apiClient.delete<{ success: boolean }>(`/api/v1/payments/${paymentId}`),
        onSuccess: () => {
            toast.success("Payment deleted");
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: queryKeys.payments });
            qc.invalidateQueries({ queryKey: queryKeys.orders });
            qc.invalidateQueries({ queryKey: queryKeys.clients });
            qc.invalidateQueries({ queryKey: queryKeys.stats });
        },
    });
}
