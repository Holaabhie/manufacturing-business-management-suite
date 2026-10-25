/**
 * React Query Hooks for Clients
 * ───────────────────────────────────────────────────────────
 * Standardized data fetching and mutations for Client management.
 * Built with apiClient and centralized queryKeys.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ClientProductMaterial {
  id: string;
  name: string;
  inventoryItemId?: string;
  quantityRequired: number;
  unit: string;
  notes?: string;
}

export interface ClientProduct {
  id: string;
  name: string;
  description?: string;
  unit: string;
  basePrice?: number;
  materials?: ClientProductMaterial[];
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  payment_terms?: string;
  credit_limit?: number;
  notes?: string;
  created_at?: string;
  createdAt?: string;
  products?: ClientProduct[];
}

export function useClients(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: filters ? [...queryKeys.clients, filters] : queryKeys.clients,
    queryFn: async () => {
      const res = await apiClient.get<Client[] | { data: Client[] }>("/api/clients", {
        params: filters as Record<string, string | number | boolean>,
      });
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    },
  });
}

export function useClient(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.client(id),
    queryFn: async () => {
      const res = await apiClient.get<Client | { data: Client }>(`/api/clients/${id}`);
      if (res && typeof res === "object" && "data" in res && res.data) {
        return res.data;
      }
      return res as Client;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useClientProducts(clientId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.clientProducts(clientId),
    queryFn: async () => {
      const res = await apiClient.get<ClientProduct[] | { data: ClientProduct[] }>(
        `/api/v1/clients/${clientId}/products`
      );
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    },
    enabled: Boolean(clientId) && (options?.enabled ?? true),
  });
}

export function useClientProductMaterials(
  clientId: string,
  productId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.clientProductMaterials(clientId, productId),
    queryFn: async () => {
      const res = await apiClient.get<ClientProductMaterial[] | { data: ClientProductMaterial[] }>(
        `/api/v1/clients/${clientId}/products/${productId}/materials`
      );
      if (Array.isArray(res)) return res;
      if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    },
    enabled: Boolean(clientId && productId) && (options?.enabled ?? true),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<Client>("/api/clients", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      toast.success("Client added successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add client");
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put<Client>(`/api/clients/${id}`, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      qc.invalidateQueries({ queryKey: queryKeys.client(variables.id) });
      toast.success("Client updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update client");
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ success: boolean }>(`/api/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clients });
      toast.success("Client removed successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete client");
    },
  });
}

export function useAddClientProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, payload }: { clientId: string; payload: Record<string, unknown> }) =>
      apiClient.post<ClientProduct>(`/api/v1/clients/${clientId}/products`, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientProducts(variables.clientId) });
      qc.invalidateQueries({ queryKey: queryKeys.client(variables.clientId) });
      toast.success("Product mapped to client");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to map product");
    },
  });
}

export function useDeleteClientProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, productId }: { clientId: string; productId: string }) =>
      apiClient.delete<{ success: boolean }>(`/api/v1/clients/products/${productId}`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientProducts(variables.clientId) });
      qc.invalidateQueries({ queryKey: queryKeys.client(variables.clientId) });
      toast.success("Product unlinked");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to unlink product");
    },
  });
}

export function useAddClientMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      productId,
      payload,
    }: {
      clientId: string;
      productId: string;
      payload: Record<string, unknown>;
    }) =>
      apiClient.post<ClientProductMaterial>(
        `/api/v1/clients/${clientId}/products/${productId}/materials`,
        payload
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.clientProductMaterials(variables.clientId, variables.productId),
      });
      toast.success("Material added");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add material");
    },
  });
}

export function useDeleteClientMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      productId,
      materialId,
    }: {
      clientId: string;
      productId: string;
      materialId: string;
    }) => apiClient.delete<{ success: boolean }>(`/api/v1/clients/materials/${materialId}`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.clientProductMaterials(variables.clientId, variables.productId),
      });
      toast.success("Material deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete material");
    },
  });
}
