// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecordPaymentModal } from "../purchasing/RecordPaymentModal";
import { apiClient } from "@/lib/api-client";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/useBodyScrollLock", () => ({
  useBodyScrollLock: vi.fn(),
}));

describe("Idempotency Double-Click & Per-Action Key Verification", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("rapid double-click on Record Payment submit sends only 1 in-flight request", async () => {
    const mockPostIdempotent = vi.spyOn(apiClient, "postIdempotent").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, data: { id: "payment-1" } });
          }, 100);
        })
    );

    const po = {
      id: "po-123",
      poNumber: "PO-2026-001",
      vendorName: "Steel Corp",
      totalAmount: 10000,
      paidAmount: 2000,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <RecordPaymentModal
          isOpen={true}
          onClose={vi.fn()}
          purchaseOrder={po}
          onPaymentRecorded={vi.fn()}
        />
      </QueryClientProvider>
    );

    // Find submit button
    const submitBtn = screen.getByRole("button", { name: /savePayment|submit|record/i });

    // Double-click rapidly
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    // Verify only 1 network call occurred because of in-flight submitting lock
    expect(mockPostIdempotent).toHaveBeenCalledTimes(1);

    const callArgs = mockPostIdempotent.mock.calls[0];
    const idempotencyKey = callArgs[2];
    expect(idempotencyKey).toBeDefined();
    expect(typeof idempotencyKey).toBe("string");
    expect(idempotencyKey.length).toBeGreaterThan(10);
  });

  it("retrying a failed submission preserves and sends the EXACT same idempotency key", async () => {
    let callCount = 0;
    const capturedKeys: string[] = [];

    vi.spyOn(apiClient, "postIdempotent").mockImplementation((_url, _body, key) => {
      callCount++;
      capturedKeys.push(key as string);
      if (callCount === 1) {
        return Promise.reject(new Error("Network glitch on first attempt"));
      }
      return Promise.resolve({ success: true, data: { id: "payment-retry" } });
    });

    const po = {
      id: "po-456",
      poNumber: "PO-2026-002",
      vendorName: "Copper Ind",
      totalAmount: 5000,
      paidAmount: 0,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <RecordPaymentModal
          isOpen={true}
          onClose={vi.fn()}
          purchaseOrder={po}
          onPaymentRecorded={vi.fn()}
        />
      </QueryClientProvider>
    );

    const submitBtn = screen.getByRole("button", { name: /savePayment|submit|record/i });

    // First attempt -> fails
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(callCount).toBe(1);
    });

    // Second attempt (retry by clicking submit again)
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(callCount).toBe(2);
    });

    // The retry MUST use the exact same key to guarantee idempotency on the server
    expect(capturedKeys[0]).toBeDefined();
    expect(capturedKeys[1]).toBeDefined();
    expect(capturedKeys[0]).toBe(capturedKeys[1]);
  });
});
