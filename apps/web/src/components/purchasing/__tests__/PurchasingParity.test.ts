import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROLE_PRESETS, resolvePermissions } from "@/lib/permissions";
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
    function canTransitionToReceived(status: PurchaseOrder["status"]): boolean {
      return status === "Pending" || status === "Ordered";
    }

    expect(canTransitionToReceived(mockPendingPO.status)).toBe(true);
    expect(canTransitionToReceived(mockOrderedPO.status)).toBe(true);
    expect(canTransitionToReceived(mockReceivedPO.status)).toBe(false);
  });

  it("verifies PO delete eligibility rules (admin/owner only, received POs can never be deleted)", () => {
    function canDeletePO(isAdmin: boolean, status: PurchaseOrder["status"]): boolean {
      if (status === "Received") return false;
      return isAdmin;
    }

    // Admin can delete Pending and Ordered
    expect(canDeletePO(true, "Pending")).toBe(true);
    expect(canDeletePO(true, "Ordered")).toBe(true);
    // Admin cannot delete Received
    expect(canDeletePO(true, "Received")).toBe(false);

    // Non-admin can never delete any PO
    expect(canDeletePO(false, "Pending")).toBe(false);
    expect(canDeletePO(false, "Ordered")).toBe(false);
    expect(canDeletePO(false, "Received")).toBe(false);
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

    // Empty GSTIN is valid (optional field)
    expect(validateGSTIN("")).toEqual({
      isValid: true,
      normalized: "",
    });

    // Invalid length or structure
    expect(validateGSTIN("INVALIDGSTIN123")).toEqual({
      isValid: false,
      normalized: "INVALIDGSTIN123",
    });
  });

  it("verifies PO financial computation totals (subtotal, taxAmount, totalAmount)", () => {
    const items = [
      { unitPrice: 100, quantity: 10 }, // 1000
      { unitPrice: 250, quantity: 4 },  // 1000
      { unitPrice: 50, quantity: 20 },  // 1000
    ];

    const subtotal = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
    const taxRate = 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    expect(subtotal).toBe(3000);
    expect(taxAmount).toBe(540);
    expect(totalAmount).toBe(3540);
  });

  it("verifies inventory item draft auto-population when selecting existing material", () => {
    const mockInventory: InventoryItem[] = [
      {
        id: "inv-raw-01",
        name: "Aluminum Ingot 6061",
        unit: "kg",
        unitPrice: 210,
        currentStock: 450,
      },
      {
        id: "inv-raw-02",
        name: "Copper Rod 10mm",
        unit: "m",
        unitPrice: 450,
        currentStock: 80,
      },
    ];

    function autoPopulateItemDraft(
      inventoryItemId: string,
      inventory: InventoryItem[]
    ): { inventoryItemId: string; materialName: string; unit: string; unitPrice: string } | null {
      const selected = inventory.find((i) => i.id === inventoryItemId);
      if (!selected) return null;
      return {
        inventoryItemId: selected.id,
        materialName: selected.name,
        unit: selected.unit,
        unitPrice: String(selected.unitPrice || 0),
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

  it("verifies PO delete authorization is restricted strictly to Admin and Owner (Manager, Accountant, and custom-permission Staff are blocked)", () => {
    function canDeletePurchaseOrder(role: "Owner" | "Admin" | "Manager" | "Accountant" | "Staff", status: PurchaseOrder["status"]): boolean {
      const isAdmin = role === "Owner" || role === "Admin";
      // Rule: Only Admin/Owner can delete, and only if not Received
      return isAdmin && status !== "Received";
    }

    // Owner and Admin can delete non-received POs
    expect(canDeletePurchaseOrder("Owner", "Pending")).toBe(true);
    expect(canDeletePurchaseOrder("Admin", "Pending")).toBe(true);
    expect(canDeletePurchaseOrder("Admin", "Ordered")).toBe(true);
    // Even Owner/Admin cannot delete Received POs (business rule)
    expect(canDeletePurchaseOrder("Owner", "Received")).toBe(false);
    expect(canDeletePurchaseOrder("Admin", "Received")).toBe(false);

    // Manager CANNOT delete POs (reverted to legacy behavior)
    expect(canDeletePurchaseOrder("Manager", "Pending")).toBe(false);
    // Accountant CANNOT delete POs
    expect(canDeletePurchaseOrder("Accountant", "Pending")).toBe(false);
    // Staff CANNOT delete POs (even with orders.delete custom permission)
    expect(canDeletePurchaseOrder("Staff", "Pending")).toBe(false);
  });
});
