// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PurchasingOrdersTable } from "../PurchasingOrdersTable";
import { PurchasingToolbar } from "../PurchasingToolbar";
import type { PurchaseOrder } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        const Comp = React.forwardRef(
          function MockMotionComp(
            {
              children,
              whileTap,
              whileHover,
              initial,
              animate,
              exit,
              transition,
              variants,
              ...props
            }: any,
            ref
          ) {
            return React.createElement(tag, { ref, ...props }, children);
          }
        );
        Comp.displayName = `Motion${tag}`;
        return Comp;
      },
    }
  ),
}));

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const mockPendingPO: PurchaseOrder = {
  id: "po-101",
  poNumber: "PO-2026-001",
  vendorId: "v-1",
  vendorName: "Steel Authority",
  items: [
    {
      inventoryItemId: "inv-1",
      materialName: "Steel Rod",
      quantity: 50,
      unit: "kg",
      unitPrice: 100,
      totalPrice: 5000,
    },
  ],
  status: "Pending",
  subtotal: 5000,
  taxAmount: 900,
  totalAmount: 5900,
  paidAmount: 0,
  createdAt: "2026-10-15T10:00:00.000Z",
};

const mockReceivedPO: PurchaseOrder = {
  ...mockPendingPO,
  id: "po-102",
  poNumber: "PO-2026-002",
  status: "Received",
  receivedAt: "2026-10-16T10:00:00.000Z",
};

describe("Purchasing UI Component Tests (jsdom)", () => {
  it("renders 'Mark as Received' button on pending order and triggers onStatusChange with 'Received'", () => {
    const onStatusChangeMock = vi.fn();

    render(
      <PurchasingOrdersTable
        orders={[mockPendingPO]}
        ordersLoading={false}
        isAdmin={true}
        dateLocale="en-IN"
        onOpenNewPO={vi.fn()}
        onViewDetails={vi.fn()}
        onRecordPayment={vi.fn()}
        onStatusChange={onStatusChangeMock}
        onDeleteOrder={vi.fn()}
      />
    );

    // Both mobile cards and desktop table render Mark as Received buttons
    const markReceivedButtons = screen.getAllByText("btnMarkReceived");
    expect(markReceivedButtons.length).toBeGreaterThanOrEqual(1);

    // Click the first Mark as Received button
    fireEvent.click(markReceivedButtons[0]);
    expect(onStatusChangeMock).toHaveBeenCalledWith("po-101", "Received");
  });

  it("does NOT render 'Mark as Received' button when order is already 'Received'", () => {
    render(
      <PurchasingOrdersTable
        orders={[mockReceivedPO]}
        ordersLoading={false}
        isAdmin={true}
        dateLocale="en-IN"
        onOpenNewPO={vi.fn()}
        onViewDetails={vi.fn()}
        onRecordPayment={vi.fn()}
        onStatusChange={vi.fn()}
        onDeleteOrder={vi.fn()}
      />
    );

    expect(screen.queryByText("btnMarkReceived")).toBeNull();
  });

  it("renders delete action in dropdown menu for admin on non-received order", async () => {
    const onDeleteOrderMock = vi.fn();
    const user = userEvent.setup();

    render(
      <PurchasingOrdersTable
        orders={[mockPendingPO]}
        ordersLoading={false}
        isAdmin={true}
        dateLocale="en-IN"
        onOpenNewPO={vi.fn()}
        onViewDetails={vi.fn()}
        onRecordPayment={vi.fn()}
        onStatusChange={vi.fn()}
        onDeleteOrder={onDeleteOrderMock}
      />
    );

    const moreBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg") && !btn.textContent?.trim());
    expect(moreBtn).toBeTruthy();

    await user.click(moreBtn!);

    // Action delete must be present
    const deleteItem = await screen.findByText("actionDelete");
    expect(deleteItem).toBeTruthy();

    await user.click(deleteItem);
    expect(onDeleteOrderMock).toHaveBeenCalledWith(mockPendingPO);
  });

  it("hides delete action from dropdown menu for non-admin user (staff)", () => {
    render(
      <PurchasingOrdersTable
        orders={[mockPendingPO]}
        ordersLoading={false}
        isAdmin={false} // Staff / Non-admin
        dateLocale="en-IN"
        onOpenNewPO={vi.fn()}
        onViewDetails={vi.fn()}
        onRecordPayment={vi.fn()}
        onStatusChange={vi.fn()}
        onDeleteOrder={vi.fn()}
      />
    );

    const moreBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.querySelector("svg") && !btn.textContent?.trim());
    expect(moreBtn).toBeTruthy();
    fireEvent.click(moreBtn!);

    // Action delete must NOT be present for non-admin
    expect(screen.queryByText("actionDelete")).toBeNull();
  });

  it("PurchasingToolbar switches tabs between orders and vendors", () => {
    const onTabChangeMock = vi.fn();

    render(
      <PurchasingToolbar
        activeTab="orders"
        ordersCount={5}
        filteredOrdersCount={5}
        vendorsCount={3}
        filteredVendorsCount={3}
        orderSearch=""
        vendorSearch=""
        monthYear={{ year: 2026, month: "all" }}
        onTabChange={onTabChangeMock}
        onOrderSearchChange={vi.fn()}
        onVendorSearchChange={vi.fn()}
        onMonthYearChange={vi.fn()}
        onOpenNewPO={vi.fn()}
        onOpenVendorDialog={vi.fn()}
      />
    );

    const vendorsTab = screen.getByText("tabVendors");
    expect(vendorsTab).toBeTruthy();

    fireEvent.click(vendorsTab);
    expect(onTabChangeMock).toHaveBeenCalledWith("vendors");
  });
});
