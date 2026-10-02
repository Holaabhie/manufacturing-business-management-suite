/**
 * Shared Sanitization Helper for Staff Role
 *
 * Strips ALL financial, pricing, cost, margin, tax, and payment fields
 * from order objects so Staff (operator) users NEVER receive sensitive data.
 *
 * Non-Staff roles must NEVER have this applied to their responses.
 */

const SENSITIVE_TOP_LEVEL_KEYS: readonly string[] = [
    // Unit price / rates
    "rate",
    "unitPrice",
    "unit_price",
    "price",

    // Tax fields
    "tax",
    "taxRate",
    "tax_rate",
    "taxableAmount",
    "taxable_amount",
    "cgstAmount",
    "cgst_amount",
    "sgstAmount",
    "sgst_amount",
    "igstAmount",
    "igst_amount",
    "cessAmount",
    "cess_amount",
    "totalTax",
    "total_tax",
    "gstApplicable",
    "gst_applicable",
    "gstPercent",
    "gst_percent",

    // Totals & amounts
    "totalAmount",
    "total_amount",
    "grandTotal",
    "grand_total",
    "subtotal",
    "subTotal",
    "discountAmount",
    "discount_amount",
    "discountValue",
    "discount_value",
    "shippingCharges",
    "shipping_charges",
    "roundOff",
    "round_off",

    // Costs
    "materialCost",
    "material_cost",
    "labourCost",
    "labour_cost",
    "overheadCost",
    "overhead_cost",
    "machineryCost",
    "machinery_cost",
    "otherCost",
    "other_cost",
    "totalCost",
    "total_cost",
    "cost",
    "estimatedMaterialCost",
    "estimated_material_cost",

    // Profit & margin
    "profit",
    "estimatedGrossProfit",
    "estimated_gross_profit",
    "margin",
    "estimatedMargin",
    "estimated_margin",

    // Payment status & amounts
    "paymentStatus",
    "payment_status",
    "totalPaid",
    "total_paid",
    "balanceDue",
    "balance_due",
    "paymentTerms",
    "payment_terms",
    "creditDays",
    "credit_days",
];

const SENSITIVE_MATERIAL_KEYS: readonly string[] = [
    "purchase_cost_per_unit",
    "purchaseCostPerUnit",
    "cost",
    "rate",
    "price",
    "unit_cost",
    "unitCost",
    "total_cost",
    "totalCost",
    "amount",
];

const SENSITIVE_ITEM_KEYS: readonly string[] = [
    "rate",
    "amount",
    "discount_type",
    "discount_value",
    "discount_amount",
    "taxable_amount",
    "cgst_rate",
    "cgst_amount",
    "sgst_rate",
    "sgst_amount",
    "igst_rate",
    "igst_amount",
    "cess_rate",
    "cess_amount",
    "total_amount",
];

/**
 * Sanitizes a single material object to ensure no cost or rate is leaked.
 */
function sanitizeMaterial(mat: any): any {
    if (!mat || typeof mat !== "object") return mat;
    const clean = { ...mat };
    for (const key of SENSITIVE_MATERIAL_KEYS) {
        delete clean[key];
    }
    return clean;
}

/**
 * Sanitizes a single order item (sales order item) to strip pricing.
 */
function sanitizeOrderItem(item: any): any {
    if (!item || typeof item !== "object") return item;
    const clean = { ...item };
    for (const key of SENSITIVE_ITEM_KEYS) {
        delete clean[key];
    }
    return clean;
}

/**
 * Sanitizes an order object or an array of orders for Staff users.
 * Returns a new object/array with every financial field removed.
 */
export function sanitizeOrderForStaff<T>(data: T): T {
    if (!data) return data;

    if (Array.isArray(data)) {
        return data.map((item) => sanitizeSingleOrder(item)) as unknown as T;
    }

    return sanitizeSingleOrder(data) as unknown as T;
}

function sanitizeSingleOrder(order: any): any {
    if (!order || typeof order !== "object") return order;

    const sanitized = { ...order };

    // Strip top-level sensitive fields
    for (const key of SENSITIVE_TOP_LEVEL_KEYS) {
        delete sanitized[key];
    }

    // Sanitize materials array if present
    if (Array.isArray(sanitized.materials)) {
        sanitized.materials = sanitized.materials.map(sanitizeMaterial);
    }

    // Sanitize orderItems / order_items if present
    if (Array.isArray(sanitized.orderItems)) {
        sanitized.orderItems = sanitized.orderItems.map(sanitizeOrderItem);
    }
    if (Array.isArray(sanitized.order_items)) {
        sanitized.order_items = sanitized.order_items.map(sanitizeOrderItem);
    }

    // Sanitize client info (ensure no financial info inside client object)
    if (sanitized.client && typeof sanitized.client === "object") {
        const cleanClient = { ...sanitized.client };
        delete cleanClient.credit_limit;
        delete cleanClient.creditLimit;
        delete cleanClient.balance;
        delete cleanClient.outstanding;
        delete cleanClient.rates;
        sanitized.client = cleanClient;
    }

    if (sanitized.clients && typeof sanitized.clients === "object") {
        const cleanClients = { ...sanitized.clients };
        delete cleanClients.credit_limit;
        delete cleanClients.creditLimit;
        delete cleanClients.balance;
        delete cleanClients.outstanding;
        delete cleanClients.rates;
        sanitized.clients = cleanClients;
    }

    return sanitized;
}
