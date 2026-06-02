/**
 * Auto-derives display order status from payment + production (stored order.status).
 */

export type DerivedOrderStatus = "pending" | "processing" | "active" | "completed";

export interface OrderStatusInput {
  paymentStatus?: string;
  /** Production aggregate status; falls back to rawStatus when omitted */
  productionStatus?: string;
  deliveryStatus?: string;
  /** Stored order.status from API */
  rawStatus?: string;
}

function norm(value?: string): string {
  return (value || "").toLowerCase().trim();
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
    productionStatus = input.productionStatus ?? input.rawStatus;
  } else {
    rawStatus = input;
    productionStatus = input;
    paymentStatus = legacyPaymentStatus;
  }

  const payment = norm(paymentStatus);
  const production = norm(productionStatus ?? rawStatus);

  if (isPaid(payment) && isProductionComplete(production)) {
    return "completed";
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
}): DerivedOrderStatus {
  return deriveOrderStatus({
    rawStatus: order.status,
    productionStatus: order.productionStatus ?? order.status,
    paymentStatus: order.paymentStatus ?? order.payment_status,
  });
}
