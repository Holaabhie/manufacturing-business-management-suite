/**
 * React Query Hooks for Inventory
 * ───────────────────────────────────────────────────────────
 * Standardized data fetching and mutations for Inventory management.
 * Built with apiClient and centralized queryKeys.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PaginationInfo } from "@/shared/lib/pagination";

export interface InventoryItem {
  id: string;
  _id?: string;
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  minQuantity?: number;
  unit: string;
  unitPrice?: number;
  costPerUnit?: number;
  purchase_cost_per_unit?: number;
  tax_rate?: number;
  location?: string;
  supplier?: string;
  supplierId?: string;
  lastRestocked?: string;
  reorderPoint?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryForecast {
  item: InventoryItem;
  burnRate: number;
  daysRemaining: number;
  suggestedReorderDate: string;
}

import type { PaginatedResult } from "@/shared/lib/pagination";

export interface InventoryOption {
  id: string;
  name: string;
  sku?: string;
  quantity?: number;
  unit?: string;
  purchase_cost_per_unit?: number;
  tax_rate?: number;
}

export type InventoryQueryResult = PaginatedResult<InventoryItem>;

export function useInventoryOptions(q?: string) {
  return useQuery<InventoryOption[]>({
    queryKey: queryKeys.inventoryOptions(q),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: InventoryOption[] }>("/api/v1/inventory/options", {
        params: q ? { q } : undefined,
      });
      return res?.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

export function useInventory(filters?: Record<string, unknown>) {
  return useQuery<InventoryQueryResult>({
    queryKey: filters ? [...queryKeys.inventory, filters] : queryKeys.inventory,
    queryFn: async () => {
      const res = await apiClient.get<
        | { success: boolean; data: InventoryItem[]; pagination: PaginationInfo }
        | { success: boolean; data: InventoryItem[]; truncated: boolean; total: number }
        | InventoryItem[]
      >(
        "/api/v1/inventory",
        {
          params: filters as Record<string, string | number | boolean>,
        }
      );

      if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: InventoryItem[] }).data)) {
        const responseObj = res as {
          data: InventoryItem[];
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
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryItem(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventoryItem(id),
    queryFn: async () => {
      const res = await apiClient.get<InventoryItem | { data: InventoryItem }>(`/api/v1/inventory/${id}`);
      if (res && typeof res === "object" && "data" in res && res.data) {
        return res.data;
      }
      return res as InventoryItem;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

export function useInventoryForecast(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.inventoryForecast,
    queryFn: async () => {
      const res = await apiClient.get<InventoryForecast[] | { data: InventoryForecast[] }>("/api/v1/inventory/forecast");
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post<InventoryItem>("/api/v1/inventory", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryForecast });
      toast.success("Inventory item added");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add inventory item");
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put<InventoryItem>(`/api/v1/inventory/${id}`, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryItem(variables.id) });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryForecast });
      toast.success("Inventory item updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update inventory item");
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ success: boolean }>(`/api/v1/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory });
      qc.invalidateQueries({ queryKey: queryKeys.inventoryForecast });
      toast.success("Inventory item deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete inventory item");
    },
  });
}
