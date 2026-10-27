/**
 * Centralized React Query Key Factory
 * ───────────────────────────────────────────────────────────
 * Standardized query key factory for cache management across the suite.
 * Note: Scoped globally per application session; tenant scoping is enforced server-side.
 */

export const queryKeys = {
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  ordersByClient: (clientId: string) => ["orders", "by-client", clientId] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  clientOptions: (q?: string) => ["clients", "options", q ?? ""] as const,
  clientProducts: (clientId: string) => ["clients", "products", clientId] as const,
  clientProductMaterials: (clientId: string, productId: string) =>
    ["clients", "materials", clientId, productId] as const,
  inventory: ["inventory"] as const,
  inventoryItem: (id: string) => ["inventory", id] as const,
  inventoryOptions: (q?: string) => ["inventory", "options", q ?? ""] as const,
  inventoryForecast: ["inventory", "forecast"] as const,
  payments: ["payments"] as const,
  payment: (id: string) => ["payments", id] as const,
  production: ["production"] as const,
  productionDetail: (id: string) => ["production", id] as const,
  stats: ["dashboard-stats"] as const,
} as const;
