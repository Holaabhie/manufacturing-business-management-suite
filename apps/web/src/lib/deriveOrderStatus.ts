/**
 * Auto-derives display order status from payment + production state.
 *
 * After the order-status fix, `order.status` is legacy/stale.
 * Production state lives in `order.production_status` (API) / `order.productionStatus` (entity).
 * Payment state lives in `order.payment_status` / `order.paymentStatus`.
 */

export type DerivedOrderStatus =
  | "pending"
  | "processing"
  | "active"
  | "awaiting_payment"
  | "completed"
  | "cancelled"
  | "on_hold";

export interface OrderStatusInput {
  paymentStatus?: string;
  /** Production aggregate status; falls back to rawStatus when omitted */
  productionStatus?: string;
  deliveryStatus?: string;
  /** Stored order.status from API (legacy — may be stale) */
  rawStatus?: string;
}

function norm(value?: string): string {
  return (value || "").toLowerCase().trim().replace(/ /g, "_");
}

function isPaid(payment: string): boolean {
  return payment === "paid";
}

function isProductionComplete(production: string): boolean {
  return production === "completed";
}

function isProductionInProgress(production: string): boolean {
  return (
    production === "in_progress" ||
    production === "in progress" ||
    production === "processing"
  );
}

/**
 * Derive UI status from payment + production state.
 * Supports object input or legacy (rawStatus, paymentStatus) arguments.
 */
export function deriveOrderStatus(
  input: OrderStatusInput | string | undefined,
  legacyPaymentStatus?: string,
): DerivedOrderStatus {
  let paymentStatus: string | undefined;
  let productionStatus: string | undefined;
  let rawStatus: string | undefined;

  if (input !== null && typeof input === "object") {
    rawStatus = input.rawStatus;
    paymentStatus = input.paymentStatus;
    productionStatus = input.productionStatus;
  } else {
    rawStatus = input;
    productionStatus = undefined;
    paymentStatus = legacyPaymentStatus;
  }

  // ─── Early exit: terminal/manual statuses bypass derivation ───
  const raw = norm(rawStatus);
  if (raw === "cancelled") return "cancelled";
  if (raw === "on_hold" || raw === "on hold") return "on_hold";

  const payment = norm(paymentStatus);
  // Use dedicated productionStatus; only fall back to rawStatus for legacy orders
  // that have not been backfilled yet
  const production = norm(productionStatus) || raw;

  if (isPaid(payment) && isProductionComplete(production)) {
    return "completed";
  }

  if (isProductionComplete(production)) {
    return "awaiting_payment";
  }

  if (isPaid(payment) && isProductionInProgress(production)) {
    return "active";
  }

  if (isProductionInProgress(production)) {
    return "processing";
  }

  if (isPaid(payment)) {
    return "active";
  }

  return "pending";
}

/** Convenience wrapper for order list rows */
export function deriveOrderStatusFromOrder(order: {
  status?: string;
  paymentStatus?: string;
  payment_status?: string;
  productionStatus?: string;
  production_status?: string;
}): DerivedOrderStatus {
  return deriveOrderStatus({
    rawStatus: order.status,
    productionStatus: order.productionStatus ?? order.production_status,
    paymentStatus: order.paymentStatus ?? order.payment_status,
  });
}
