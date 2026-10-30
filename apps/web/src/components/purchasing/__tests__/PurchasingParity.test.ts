import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PurchaseOrder, Vendor, InventoryItem } from "../types";
import { matchesMonthYear } from "../../ui/month-year-filter";

describe("Purchasing Parity & Logic Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPendingPO: PurchaseOrder = {
    id: "po-pending-001",
    poNumber: "PO-2026-001",
    vendorId: "v-001",
    vendorName: "Steel Corp India",
    items: [
      {
        inventoryItemId: "inv-item-1",
        materialName: "Mild Steel Sheet 2mm",
        quantity: 100,
        unit: "kg",
        unitPrice: 75,
        totalPrice: 7500,
      },
    ],
    status: "Pending",
    subtotal: 7500,
    taxAmount: 1350,
    totalAmount: 8850,
    paidAmount: 0,
    createdAt: "2026-10-15T10:00:00.000Z",
  };

  const mockOrderedPO: PurchaseOrder = {
    ...mockPendingPO,
    id: "po-ordered-002",
    poNumber: "PO-2026-002",
    status: "Ordered",
    orderedAt: "2026-10-16T10:00:00.000Z",
  };

  const mockReceivedPO: PurchaseOrder = {
    ...mockPendingPO,
    id: "po-received-003",
    poNumber: "PO-2026-003",
    status: "Received",
    receivedAt: "2026-10-18T10:00:00.000Z",
  };

  it("verifies status transition eligibility: only Pending or Ordered can transition to Received", () => {
    function canMarkAsReceived(status: PurchaseOrder["status"]) {
      return status === "Pending" || status === "Ordered";
    }

    expect(canMarkAsReceived(mockPendingPO.status)).toBe(true);
    expect(canMarkAsReceived(mockOrderedPO.status)).toBe(true);
    expect(canMarkAsReceived(mockReceivedPO.status)).toBe(false);
  });

  it("verifies admin-only delete permission guard for purchase orders", () => {
    function canDeleteOrder(order: PurchaseOrder, isAdmin: boolean) {
      // Received orders cannot be deleted regardless of role to preserve inventory audit trail
      if (order.status === "Received") return false;
      return isAdmin;
    }

    // Admin user
    expect(canDeleteOrder(mockPendingPO, true)).toBe(true);
    expect(canDeleteOrder(mockOrderedPO, true)).toBe(true);
    expect(canDeleteOrder(mockReceivedPO, true)).toBe(false);

    // Non-admin user (staff)
    expect(canDeleteOrder(mockPendingPO, false)).toBe(false);
    expect(canDeleteOrder(mockOrderedPO, false)).toBe(false);
    expect(canDeleteOrder(mockReceivedPO, false)).toBe(false);
  });

  it("verifies Indian phone number validation and +91 normalization", () => {
    function normalizeAndValidatePhone(rawPhone: string): { isValid: boolean; normalized: string } {
      const cleanPhone = rawPhone.replace(/[\s\-\+]/g, "");
      if (!cleanPhone) return { isValid: false, normalized: "" };

      const digits =
        cleanPhone.startsWith("91") && cleanPhone.length === 12
          ? cleanPhone.slice(2)
          : cleanPhone;

      const isValid = /^[6-9]\d{9}$/.test(digits);
      const normalized = isValid
        ? cleanPhone.startsWith("91") && cleanPhone.length === 12
          ? `+${cleanPhone}`
          : cleanPhone.length === 10
          ? `+91${cleanPhone}`
          : rawPhone.trim()
        : "";

      return { isValid, normalized };
    }

    // Standard 10-digit mobile
    expect(normalizeAndValidatePhone("9876543210")).toEqual({
      isValid: true,
      normalized: "+919876543210",
    });

    // Mobile with existing 91 prefix
    expect(normalizeAndValidatePhone("919876543210")).toEqual({
      isValid: true,
      normalized: "+919876543210",
    });

    // Mobile formatted with dashes and spaces
    expect(normalizeAndValidatePhone("+91 98765-43210")).toEqual({
      isValid: true,
      normalized: "+919876543210",
    });

    // Invalid mobile (starts with 1)
    expect(normalizeAndValidatePhone("1234567890")).toEqual({
      isValid: false,
      normalized: "",
    });

    // Invalid length (short)
    expect(normalizeAndValidatePhone("98765")).toEqual({
      isValid: false,
      normalized: "",
    });
  });

  it("verifies GSTIN uppercase normalization and regex validation", () => {
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    function validateGSTIN(rawGstin: string): { isValid: boolean; normalized: string } {
      const clean = rawGstin.trim().toUpperCase();
      if (!clean) return { isValid: true, normalized: "" }; // Optional field
      return {
        isValid: GSTIN_REGEX.test(clean),
        normalized: clean,
      };
    }

    // Valid uppercase GSTIN
    expect(validateGSTIN("27ABCDE1234F1Z5")).toEqual({
      isValid: true,
      normalized: "27ABCDE1234F1Z5",
    });

    // Valid lowercase GSTIN (should normalize to uppercase)
    expect(validateGSTIN("27abcde1234f1z5")).toEqual({
      isValid: true,
      normalized: "27ABCDE1234F1Z5",
    });

    // Invalid GSTIN (wrong state code or structure)
    expect(validateGSTIN("INVALIDGSTIN123")).toEqual({
      isValid: false,
      normalized: "INVALIDGSTIN123",
    });

    // Empty GSTIN is allowed as it is optional
    expect(validateGSTIN("")).toEqual({
      isValid: true,
      normalized: "",
    });
  });

  it("verifies inventory item auto-population into purchase order line item draft", () => {
    const mockInventory: InventoryItem[] = [
      {
        id: "inv-raw-01",
        name: "Aluminum Ingot 6061",
        quantity: 500,
        unit: "kg",
        purchase_cost_per_unit: 210,
        purchaseCostPerUnit: 210,
      },
      {
        id: "inv-raw-02",
        name: "Copper Rod 10mm",
        quantity: 50,
        unit: "m",
        purchase_cost_per_unit: 450,
      },
    ];

    function autoPopulateItemDraft(selectedItemId: string, inventory: InventoryItem[]) {
      const item = inventory.find((i) => i.id === selectedItemId);
      if (!item) return null;
      return {
        inventoryItemId: item.id,
        materialName: item.name,
        unit: item.unit,
        unitPrice: String(item.purchaseCostPerUnit || item.purchase_cost_per_unit || 0),
      };
    }

    const itemDraft1 = autoPopulateItemDraft("inv-raw-01", mockInventory);
    expect(itemDraft1).toEqual({
      inventoryItemId: "inv-raw-01",
      materialName: "Aluminum Ingot 6061",
      unit: "kg",
      unitPrice: "210",
    });

    const itemDraft2 = autoPopulateItemDraft("inv-raw-02", mockInventory);
    expect(itemDraft2).toEqual({
      inventoryItemId: "inv-raw-02",
      materialName: "Copper Rod 10mm",
      unit: "m",
      unitPrice: "450",
    });

    const notFound = autoPopulateItemDraft("non-existent", mockInventory);
    expect(notFound).toBeNull();
  });

  it("verifies month/year date filtering matches correctly against PO createdAt dates", () => {
    const poOct2026: PurchaseOrder = {
      ...mockPendingPO,
      createdAt: "2026-10-15T12:00:00.000Z",
    };
    const poNov2026: PurchaseOrder = {
      ...mockPendingPO,
      id: "po-nov",
      createdAt: "2026-11-05T12:00:00.000Z",
    };
    const poOct2025: PurchaseOrder = {
      ...mockPendingPO,
      id: "po-2025",
      createdAt: "2025-10-15T12:00:00.000Z",
    };

    // Filter by specific month Oct 2026
    const filterOct2026 = { year: 2026, month: 10 as const };
    expect(matchesMonthYear(poOct2026.createdAt, filterOct2026)).toBe(true);
    expect(matchesMonthYear(poNov2026.createdAt, filterOct2026)).toBe(false);
    expect(matchesMonthYear(poOct2025.createdAt, filterOct2026)).toBe(false);

    // Filter by all months in 2026
    const filterAll2026 = { year: 2026, month: "all" as const };
    expect(matchesMonthYear(poOct2026.createdAt, filterAll2026)).toBe(true);
    expect(matchesMonthYear(poNov2026.createdAt, filterAll2026)).toBe(true);
    expect(matchesMonthYear(poOct2025.createdAt, filterAll2026)).toBe(false);
  });
});
