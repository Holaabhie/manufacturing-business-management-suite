// @vitest-environment jsdom
import React, { useRef, useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BillingMobileCards } from "../BillingMobileCards";
import type { Bill } from "../types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  },
  useLocale: () => "en",
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
    button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
      ({ children, ...props }, ref) => (
        <button ref={ref} {...props}>
          {children}
        </button>
      )
    ),
  },
  useDragControls: () => ({ start: vi.fn() }),
}));

// Provide a container for createPortal in MobileSheet
beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';

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

const mockDraftBill: Bill = {
  id: "bill-draft-1",
  billNumber: "INV-2026-001",
  clientId: "c-1",
  clientName: "Tata Motors Ltd",
  clientGSTIN: "27AAACT2727Q1ZW",
  clientAddress: "Pune, Maharashtra",
  clientPhone: "9876543210",
  clientEmail: "procurement@tatamotors.com",
  billDate: "2026-10-01",
  dueDate: "2026-10-15",
  items: [],
  subtotal: 100000,
  cgstAmount: 9000,
  sgstAmount: 9000,
  igstAmount: 0,
  totalAmount: 118000,
  amountInWords: "One Lakh Eighteen Thousand Rupees",
  status: "draft",
  notes: "",
  terms: "",
  createdAt: "2026-10-01T00:00:00.000Z",
};

const mockSentBill: Bill = {
  ...mockDraftBill,
  id: "bill-sent-2",
  billNumber: "INV-2026-002",
  status: "sent",
};

/**
 * Harness component that attaches actual long-press timer and threshold logic
 * matching useBillingActions to verify true DOM event interaction.
 */
function BillingCardsHarness({
  initialBills = [mockDraftBill, mockSentBill],
  onUpdateStatusMock = vi.fn(),
  onPreviewMock = vi.fn(),
}: {
  initialBills?: Bill[];
  onUpdateStatusMock?: (id: string, status: Bill["status"]) => void;
  onPreviewMock?: (bill: Bill) => void;
}) {
  const [bills] = useState<Bill[]>(initialBills);
  const [longPressedBill, setLongPressedBill] = useState<Bill | null>(null);
  const [isBillSheetOpen, setIsBillSheetOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTriggered = useRef(false);

  const handleLongPressStart = (bill: Bill, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    longPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      setLongPressedBill(bill);
      setIsBillSheetOpen(true);
    }, 500);
  };

  const handleLongPressMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <BillingMobileCards
      bills={bills}
      loading={false}
      dateLocale="en-IN"
      onPreview={onPreviewMock}
      onDownloadPdf={vi.fn()}
      onPrint={vi.fn()}
      onWhatsAppShare={vi.fn()}
      onUpdateStatus={onUpdateStatusMock}
      onOpenDelete={vi.fn()}
      longPressedBill={longPressedBill}
      isBillSheetOpen={isBillSheetOpen}
      onCloseBillSheet={() => setIsBillSheetOpen(false)}
      longPressTriggeredRef={longPressTriggered}
      onLongPressStart={handleLongPressStart}
      onLongPressMove={handleLongPressMove}
      onLongPressEnd={handleLongPressEnd}
    />
  );
}

describe("BillingMobileCards UI Component Tests (jsdom)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens long-press sheet after 500ms touchStart and displays correct bill details", () => {
    render(<BillingCardsHarness />);

    const card = screen.getByText("INV-2026-001").closest("div[class*='select-none']");
    expect(card).toBeTruthy();

    // Trigger touchStart at clientX: 50, clientY: 50
    fireEvent.touchStart(card!, {
      touches: [{ clientX: 50, clientY: 50 }],
    });

    // Advance 400ms: sheet should NOT yet be open
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByText("sheetPreview")).toBeNull();

    // Advance remaining 100ms (total 500ms): sheet opens
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText("sheetPreview")).toBeTruthy();
    expect(screen.getByText("sheetDownloadPdf")).toBeTruthy();
  });

  it("cancels long-press sheet if touch moves more than 10px (scroll gesture protection)", () => {
    render(<BillingCardsHarness />);

    const card = screen.getByText("INV-2026-001").closest("div[class*='select-none']");
    expect(card).toBeTruthy();

    // Start touch
    fireEvent.touchStart(card!, {
      touches: [{ clientX: 50, clientY: 50 }],
    });

    // Move by 15px (> 10px threshold)
    fireEvent.touchMove(card!, {
      touches: [{ clientX: 65, clientY: 50 }],
    });

    // Advance past 500ms
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Sheet must NOT open because user was scrolling
    expect(screen.queryByText("sheetPreview")).toBeNull();
  });

  it("suppresses standard click event on card immediately after a long-press triggers", () => {
    const onPreviewMock = vi.fn();
    render(<BillingCardsHarness onPreviewMock={onPreviewMock} />);

    const card = screen.getByText("INV-2026-001").closest("div[class*='select-none']");

    // Long press
    fireEvent.touchStart(card!, {
      touches: [{ clientX: 50, clientY: 50 }],
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Simulated click on card right after long press
    fireEvent.click(card!);

    // onPreview must NOT have been called because click was suppressed
    expect(onPreviewMock).not.toHaveBeenCalled();

    // Subsequent normal tap without long-press should invoke onPreview
    fireEvent.click(card!);
    expect(onPreviewMock).toHaveBeenCalledTimes(1);
  });

  it("renders 'Mark Sent' only for draft status, and 'Mark Paid' only for sent status", () => {
    // 1. Long press draft bill
    const { unmount } = render(<BillingCardsHarness initialBills={[mockDraftBill]} />);
    const draftCard = screen.getByText("INV-2026-001").closest("div[class*='select-none']");
    fireEvent.touchStart(draftCard!, { touches: [{ clientX: 50, clientY: 50 }] });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // In draft sheet, Mark Sent must be visible, Mark Paid must NOT
    expect(screen.getByText("sheetMarkSent")).toBeTruthy();
    expect(screen.queryByText("sheetMarkPaid")).toBeNull();

    unmount();

    // 2. Long press sent bill
    render(<BillingCardsHarness initialBills={[mockSentBill]} />);
    const sentCard = screen.getByText("INV-2026-002").closest("div[class*='select-none']");
    fireEvent.touchStart(sentCard!, { touches: [{ clientX: 50, clientY: 50 }] });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // In sent sheet, Mark Paid must be visible, Mark Sent must NOT
    expect(screen.getByText("sheetMarkPaid")).toBeTruthy();
    expect(screen.queryByText("sheetMarkSent")).toBeNull();
  });

  it("executes update status callback with 'paid' when Mark Paid button is clicked", () => {
    const onUpdateStatusMock = vi.fn();
    render(
      <BillingCardsHarness
        initialBills={[mockSentBill]}
        onUpdateStatusMock={onUpdateStatusMock}
      />
    );

    const sentCard = screen.getByText("INV-2026-002").closest("div[class*='select-none']");
    fireEvent.touchStart(sentCard!, { touches: [{ clientX: 50, clientY: 50 }] });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const markPaidBtn = screen.getByText("sheetMarkPaid").closest("button");
    expect(markPaidBtn).toBeTruthy();

    fireEvent.click(markPaidBtn!);
    expect(onUpdateStatusMock).toHaveBeenCalledWith("bill-sent-2", "paid");
  });
});
