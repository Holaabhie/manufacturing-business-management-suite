/**
 * Server & Client Pagination & Search Utilities
 * ───────────────────────────────────────────────────────────
 * Standardized pagination schemas, query parsers, and regex sanitation.
 */

import { z } from "zod";

/**
 * Escapes special regex characters to prevent ReDoS and regex syntax errors in MongoDB $regex queries.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const ORDER_SORT_FIELDS = [
  "createdAt",
  "totalAmount",
  "total_amount",
  "deliveryDate",
  "delivery_date",
  "productName",
  "product_name",
  "status",
] as const;

export const CLIENT_SORT_FIELDS = [
  "createdAt",
  "name",
  "totalRevenue",
  "outstandingBalance",
  "city",
] as const;

export const INVENTORY_SORT_FIELDS = [
  "createdAt",
  "name",
  "quantity",
  "price",
  "sku",
  "category",
] as const;

export const PURCHASING_ORDER_SORT_FIELDS = [
  "createdAt",
  "totalAmount",
  "poNumber",
  "status",
] as const;

export const VENDOR_SORT_FIELDS = [
  "createdAt",
  "name",
  "email",
  "phone",
] as const;

export const VENDOR_BILL_SORT_FIELDS = [
  "createdAt",
  "total_amount",
  "bill_number",
  "bill_date",
  "due_date",
  "status",
] as const;

export function isValidSortField(
  sort: string | undefined,
  whitelist: readonly string[]
): boolean {
  if (!sort) return true;
  return whitelist.includes(sort);
}

/**
 * Common Zod validation schema for server-side paginated queries.
 * Coerces string query parameters into numbers, bounds limits safely, and caps q to 100 chars.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  q: z.string().max(100, "Search query must not exceed 100 characters").optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
}

export interface TruncatedResponse<T> {
  success: boolean;
  data: T[];
  truncated: boolean;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination?: PaginationInfo;
  truncated?: boolean;
  total: number;
}

/**
 * Builds a standardized pagination envelope from data, page, limit, and total count.
 */
export function buildPaginatedEnvelope<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    success: true,
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

/**
 * Builds a capped response envelope for unpaginated queries (hard-capped at max 500).
 */
export function buildTruncatedEnvelope<T>(
  data: T[],
  total: number,
  maxLimit: number = 500
): TruncatedResponse<T> {
  return {
    success: true,
    data: data.slice(0, maxLimit),
    truncated: total > maxLimit,
    total,
  };
}
