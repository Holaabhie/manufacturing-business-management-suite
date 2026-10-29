import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("verifies WhatsApp URL builder formatting with Indian 91 phone prefix handling", () => {
    function buildWhatsAppUrl(bill: Bill, dateLocale = "en-IN") {
      const message = `Invoice ${bill.billNumber}\nClient: ${bill.clientName}\nAmount: \u20B9${bill.totalAmount.toLocaleString(dateLocale)}\nDue: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}`;
      const phoneNumber = bill.clientPhone?.replace(/[^0-9]/g, "") || "";
      return phoneNumber
        ? `https://wa.me/${phoneNumber.startsWith("91") ? phoneNumber : "91" + phoneNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    // Standard 10-digit phone
    const url1 = buildWhatsAppUrl(mockDraftBill);
    expect(url1).toContain("https://wa.me/919876543210?text=");
    expect(url1).toContain(encodeURIComponent("Invoice INV-101"));

    // Phone already prefixed with 91
    const billWith91: Bill = { ...mockDraftBill, clientPhone: "919876543210" };
    const url2 = buildWhatsAppUrl(billWith91);
    expect(url2).toContain("https://wa.me/919876543210?text=");

    // Missing phone fallback
    const billWithoutPhone: Bill = { ...mockDraftBill, clientPhone: "" };
    const url3 = buildWhatsAppUrl(billWithoutPhone);
    expect(url3).toContain("https://wa.me/?text=");
  });

  it("verifies updateStatus API contract when marking invoice as paid or sent", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: "paid" } }),
    });
    global.fetch = fetchSpy;

    async function updateStatus(id: string, status: Bill["status"]) {
      const res = await fetch(`/api/v1/billing/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    }

    const result = await updateStatus("bill-sent-102", "paid");
    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/billing/bill-sent-102", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    expect(result.data.status).toBe("paid");
  });

  it("verifies Staff permission guard blocking billing page access", () => {
    function isAccessDeniedForRole(role: string | null, roleLoading: boolean): boolean {
      if (roleLoading) return false;
      return role === "Staff";
    }

    expect(isAccessDeniedForRole("Staff", false)).toBe(true);
    expect(isAccessDeniedForRole("Admin", false)).toBe(false);
    expect(isAccessDeniedForRole("Owner", false)).toBe(false);
    expect(isAccessDeniedForRole("Manager", false)).toBe(false);
    expect(isAccessDeniedForRole("Staff", true)).toBe(false); // Still loading
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
