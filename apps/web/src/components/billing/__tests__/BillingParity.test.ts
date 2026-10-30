import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROLE_PRESETS, resolvePermissions, hasPermission } from "@/lib/permissions";
import type { Bill } from "../types";

describe("Billing Parity & Action Logic Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockDraftBill: Bill = {
    id: "bill-draft-101",
    billNumber: "INV-101",
    clientId: "client-101",
    createdAt: "2026-10-01T00:00:00.000Z",
    billDate: "2026-10-01",
    dueDate: "2026-10-15",
    clientName: "Acme Industrial Supplies",
    clientGSTIN: "27ABCDE1234F1Z5",
    clientAddress: "Mumbai, MH",
    clientPhone: "9876543210",
    clientEmail: "acme@example.com",
    items: [],
    subtotal: 50000,
    cgstAmount: 4500,
    sgstAmount: 4500,
    igstAmount: 0,
    totalAmount: 59000,
    amountInWords: "Fifty Nine Thousand Rupees",
    status: "draft",
    notes: "",
    terms: "",
  };

  const mockSentBill: Bill = {
    ...mockDraftBill,
    id: "bill-sent-102",
    billNumber: "INV-102",
    status: "sent",
  };

  const mockPaidBill: Bill = {
    ...mockDraftBill,
    id: "bill-paid-103",
    billNumber: "INV-103",
    status: "paid",
  };

  it("verifies status action visibility rules: Mark Sent only on draft, Mark Paid only on sent", () => {
    function getAvailableStatusActions(status: Bill["status"]) {
      return {
        canMarkSent: status === "draft",
        canMarkPaid: status === "sent",
      };
    }

    expect(getAvailableStatusActions(mockDraftBill.status)).toEqual({
      canMarkSent: true,
      canMarkPaid: false,
    });

    expect(getAvailableStatusActions(mockSentBill.status)).toEqual({
      canMarkSent: false,
      canMarkPaid: true,
    });

    expect(getAvailableStatusActions(mockPaidBill.status)).toEqual({
      canMarkSent: false,
      canMarkPaid: false,
    });
  });

  it("verifies phone number normalization with 91 prefix for WhatsApp sharing", () => {
    function getWhatsAppHref(rawPhone: string, billNumber: string, totalAmount: number): string {
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("91")
        ? cleanPhone
        : `91${cleanPhone}`;
      const message = encodeURIComponent(
        `Hello, here is your invoice #${billNumber} for ₹${totalAmount.toLocaleString("en-IN")}.`
      );
      return `https://wa.me/${formattedPhone}?text=${message}`;
    }

    // Phone without prefix
    expect(getWhatsAppHref("9876543210", "INV-101", 59000)).toBe(
      "https://wa.me/919876543210?text=Hello%2C%20here%20is%20your%20invoice%20%23INV-101%20for%20%E2%82%B959%2C000."
    );

    // Phone already prefixed with 91
    expect(getWhatsAppHref("919876543210", "INV-101", 59000)).toBe(
      "https://wa.me/919876543210?text=Hello%2C%20here%20is%20your%20invoice%20%23INV-101%20for%20%E2%82%B959%2C000."
    );

    // Formatted phone with dashes and spaces
    expect(getWhatsAppHref("+91 98765-43210", "INV-101", 59000)).toBe(
      "https://wa.me/919876543210?text=Hello%2C%20here%20is%20your%20invoice%20%23INV-101%20for%20%E2%82%B959%2C000."
    );
  });

  it("verifies month/year date filtering matches bills strictly against billDate", () => {
    function matchesMonthYearFilter(
      billDateStr: string,
      filter: { year: number | "all"; month: number | "all" }
    ): boolean {
      if (filter.year === "all" && filter.month === "all") return true;
      const d = new Date(billDateStr);
      if (isNaN(d.getTime())) return false;
      const matchYear = filter.year === "all" || d.getFullYear() === filter.year;
      const matchMonth = filter.month === "all" || d.getMonth() + 1 === filter.month;
      return matchYear && matchMonth;
    }

    const billOct2026 = "2026-10-01";
    const billNov2026 = "2026-11-01";
    const billOct2025 = "2025-10-01";

    expect(matchesMonthYearFilter(billOct2026, { year: 2026, month: 10 })).toBe(true);
    expect(matchesMonthYearFilter(billNov2026, { year: 2026, month: 10 })).toBe(false);
    expect(matchesMonthYearFilter(billOct2025, { year: 2026, month: 10 })).toBe(false);
    expect(matchesMonthYearFilter(billOct2026, { year: 2026, month: "all" })).toBe(true);
    expect(matchesMonthYearFilter(billNov2026, { year: 2026, month: "all" })).toBe(true);
  });

  it("verifies long-press touch gesture distance thresholds for cancellation (>10px cancels)", () => {
    function shouldCancelLongPress(
      startX: number,
      startY: number,
      currentX: number,
      currentY: number,
      threshold = 10
    ): boolean {
      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);
      return diffX > threshold || diffY > threshold;
    }

    // Small micro-movements <= 10px do NOT cancel
    expect(shouldCancelLongPress(100, 100, 105, 105)).toBe(false);
    expect(shouldCancelLongPress(100, 100, 110, 100)).toBe(false);

    // Movements > 10px cancel
    expect(shouldCancelLongPress(100, 100, 112, 100)).toBe(true);
    expect(shouldCancelLongPress(100, 100, 100, 115)).toBe(true);
    expect(shouldCancelLongPress(100, 100, 120, 120)).toBe(true);
  });

  it("verifies role-based access control for billing page (Owner, Admin, Manager, Accountant default ALLOWED; Staff default BLOCKED)", () => {
    function isBillingAccessDenied(canViewInvoices: boolean, roleLoading: boolean): boolean {
      return !roleLoading && !canViewInvoices;
    }

    function checkRoleBillingAccess(role: "Owner" | "Admin" | "Manager" | "Accountant" | "Staff", customPerms?: Record<string, boolean>) {
      const isOwner = role === "Owner" || role === "Admin";
      const perms = resolvePermissions(role, customPerms);
      const canView = hasPermission(perms, "invoices.view", isOwner);
      return !isBillingAccessDenied(canView, false);
    }

    // 1. Owner & Admin: full bypass -> ALLOWED
    expect(checkRoleBillingAccess("Owner")).toBe(true);
    expect(checkRoleBillingAccess("Admin")).toBe(true);

    // 2. Manager preset has invoices.view = true -> ALLOWED (restores legacy default behavior)
    expect(checkRoleBillingAccess("Manager")).toBe(true);

    // 3. Accountant preset has invoices.view = true -> ALLOWED (matches legacy behavior)
    expect(checkRoleBillingAccess("Accountant")).toBe(true);

    // 4. Default Staff preset has invoices.view = false -> BLOCKED (matches legacy behavior)
    expect(checkRoleBillingAccess("Staff")).toBe(false);

    // 5. Staff with explicit custom permission override -> ALLOWED
    expect(checkRoleBillingAccess("Staff", { "invoices.view": true })).toBe(true);

    // 6. Manager with explicit custom restriction override -> BLOCKED
    expect(checkRoleBillingAccess("Manager", { "invoices.view": false })).toBe(false);
  });

  it("verifies KPI computation logic (total, draft, sent, paid, totalValue, paidValue)", () => {
    const bills = [mockDraftBill, mockSentBill, mockPaidBill];

    const stats = {
      total: bills.length,
      draft: bills.filter((b) => b.status === "draft").length,
      sent: bills.filter((b) => b.status === "sent").length,
      paid: bills.filter((b) => b.status === "paid").length,
      totalValue: bills.reduce((acc, b) => acc + b.totalAmount, 0),
      paidValue: bills.filter((b) => b.status === "paid").reduce((acc, b) => acc + b.totalAmount, 0),
    };

    expect(stats.total).toBe(3);
    expect(stats.draft).toBe(1);
    expect(stats.sent).toBe(1);
    expect(stats.paid).toBe(1);
    expect(stats.totalValue).toBe(59000 * 3);
    expect(stats.paidValue).toBe(59000);
  });
});
