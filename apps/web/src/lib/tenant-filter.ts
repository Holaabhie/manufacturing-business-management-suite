import { ObjectId } from "mongodb";

export type TenantFieldType = "string" | "objectId";

export interface CollectionTenantMeta {
  field: string;
  type: TenantFieldType;
}

export const COLLECTION_TENANT_MAP: Record<string, CollectionTenantMeta> = {
  clients: { field: "userId", type: "string" },
  inventory: { field: "userId", type: "string" },
  orders: { field: "userId", type: "string" },
  expenses: { field: "userId", type: "string" },
  productions: { field: "userId", type: "string" },
  production_jobs: { field: "userId", type: "string" },
  vendor_bills: { field: "userId", type: "string" },
  vendor_bill_payments: { field: "userId", type: "string" },
  delivery_challans: { field: "userId", type: "string" },
  quotations: { field: "userId", type: "string" },
  payments: { field: "userId", type: "string" },
  notes: { field: "userId", type: "string" },
  bills: { field: "userId", type: "string" },
  invoices: { field: "userId", type: "string" },
  purchase_orders: { field: "userId", type: "string" },
  vendors: { field: "userId", type: "string" },
  client_materials: { field: "userId", type: "string" },
  material_templates: { field: "userId", type: "string" },
  machines: { field: "adminId", type: "string" },
  machineDowntime: { field: "adminId", type: "string" },
  machineEvents: { field: "adminId", type: "string" },
  users: { field: "adminId", type: "string" },
  auditlogs: { field: "organizationId", type: "string" },
  bank_accounts: { field: "userId", type: "string" },
  bank_transactions: { field: "userId", type: "string" },
  reminder_rules: { field: "userId", type: "string" },
  reminder_logs: { field: "userId", type: "string" },
  notification_templates: { field: "ownerId", type: "string" },
  notification_logs: { field: "ownerId", type: "string" },
};

/**
 * Returns the tenant field definition for a given collection.
 */
export function tenantIdFor(collection: string): CollectionTenantMeta {
  const meta = COLLECTION_TENANT_MAP[collection];
  if (!meta) {
    return { field: "userId", type: "string" };
  }
  return meta;
}

/**
 * Attaches the appropriate tenant field to a query filter object.
 * Does NOT use $or queries to guarantee optimal index use and deterministic filtering.
 */
export function tenantFilter<T extends Record<string, any>>(
  ownerId: string | ObjectId,
  collection: string,
  filter?: T
): Record<string, any> {
  const meta = tenantIdFor(collection);
  const strOwnerId = typeof ownerId === "string" ? ownerId : ownerId.toString();
  const value = meta.type === "objectId" ? new ObjectId(strOwnerId) : strOwnerId;

  return {
    ...(filter || {}),
    [meta.field]: value,
  };
}
