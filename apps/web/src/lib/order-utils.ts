/**
 * Helper utilities for Orders
 */

/**
 * Resolves a human-friendly display number for an order across diverse schemas.
 * Covers: orderNumber, order_number, orderId, or fallback to short ORD-XXXXXX code.
 * Never outputs a raw 24-character MongoDB hex string.
 */
export function getOrderDisplayNumber(order: unknown): string {
  if (!order) return "";
  if (typeof order === "string") {
    const trimmed = order.trim();
    if (!trimmed) return "";
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return `ORD-${trimmed.slice(-6).toUpperCase()}`;
    }
    return trimmed;
  }

  if (typeof order !== "object") return "";
  const rec = order as Record<string, unknown>;

  const num =
    rec.orderNumber ||
    rec.order_number ||
    rec.orderId ||
    rec.order_no;

  if (num && typeof num === "string" && num.trim()) {
    const trimmed = num.trim();
    if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
      return `ORD-${trimmed.slice(-6).toUpperCase()}`;
    }
    return trimmed;
  }

  const rawId = rec.id || rec._id || rec.order_id;
  if (rawId) {
    const idStr = String(rawId).trim();
    if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
      return `ORD-${idStr.slice(-6).toUpperCase()}`;
    }
    return idStr;
  }

  return "";
}
