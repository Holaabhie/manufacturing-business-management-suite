"use client";

/**
 * CreateInvoiceExample — Demo: Anti-Duplicate Invoice Form
 * ──────────────────────────────────────────────────────────
 * Example showing all 3 frontend protection layers working together:
 *   1. <LoadingButton /> — disables on click, shows spinner
 *   2. apiClient — blocks duplicate identical requests within 2s
 *   3. Idempotency-Key header — backend returns cached response
 *
 * This is a reference implementation. Adapt to your actual form.
 */

import { useState } from "react";
import { LoadingButton, useSubmitGuard } from "@/components/LoadingButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import api, { generateUUID } from "@/utils/apiClient";
import { toast } from "sonner";

export function CreateInvoiceExample() {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [clientName, setClientName] = useState("");
    const [amount, setAmount] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // ── Method 1: Using <LoadingButton /> (Recommended) ─────

    const handleCreateInvoice = async () => {
        if (!invoiceNumber || !clientName) {
            toast.error("Please fill in all required fields");
            return;
        }

        // Generate a deterministic idempotency key from the invoice data
        // This ensures even if the user refreshes and resubmits, it's caught
        const idempotencyKey = generateUUID();

        const response = await api.post(
            "/api/billing",
            {
                billNumber: invoiceNumber,
                clientName,
                totalAmount: parseFloat(amount) || 0,
                billDate: new Date().toISOString(),
                status: "draft",
                items: [],
            },
            {
                headers: { "Idempotency-Key": idempotencyKey },
            }
        );

        if (response.data._idempotent) {
            toast.info("This invoice was already created (duplicate prevented)");
        }

        // Reset form
        setInvoiceNumber("");
        setClientName("");
        setAmount("");
    };

    // ── Method 2: Using useSubmitGuard hook ─────────────────

    const { isSubmitting, guard } = useSubmitGuard();

    const handleAlternativeSubmit = guard(async () => {
        setIsGenerating(true);
        try {
            await api.post("/api/billing", {
                billNumber: `INV-${Date.now()}`,
                clientName: "Auto Client",
                totalAmount: 1000,
                billDate: new Date().toISOString(),
                status: "draft",
                items: [],
            });
            toast.success("Invoice created!");
        } finally {
            setIsGenerating(false);
        }
    });

    return (
        <div className="space-y-8 max-w-lg p-6">
            {/* Full-screen overlay for long operations */}
            <LoadingOverlay
                visible={isGenerating}
                message="Generating invoice..."
            />

            <h2 className="text-lg font-semibold">Create Invoice</h2>

            {/* ── Form Fields ──────────────────────────────────── */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="invoiceNumber" className="text-sm font-medium">
                        Invoice Number
                    </label>
                    <input
                        id="invoiceNumber"
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="INV-001"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="clientName" className="text-sm font-medium">
                        Client Name
                    </label>
                    <input
                        id="clientName"
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Acme Corp"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="amount" className="text-sm font-medium">
                        Amount (INR)
                    </label>
                    <input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="50000"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
            </div>

            {/* ── Method 1: LoadingButton ──────────────────────── */}
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                    Method 1: LoadingButton (auto-handles loading state)
                </p>
                <LoadingButton
                    onClick={handleCreateInvoice}
                    loadingText="Creating Invoice..."
                    successText="Invoice Created!"
                    errorText="Failed to create invoice"
                    cooldownMs={1500}
                >
                    Create Invoice
                </LoadingButton>
            </div>

            {/* ── Method 2: useSubmitGuard hook ────────────────── */}
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                    Method 2: useSubmitGuard hook (custom control)
                </p>
                <button
                    onClick={handleAlternativeSubmit}
                    disabled={isSubmitting}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                    {isSubmitting ? "Processing..." : "Quick Create"}
                </button>
            </div>

            {/* ── Method 3: Simple redirect (Express backend) ──── */}
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                    Method 3: Direct link to Express backend (for vanilla setups)
                </p>
                <code className="block rounded bg-muted p-3 text-xs">
                    {`window.location.href = "http://localhost:5000/api/auth/google";`}
                </code>
            </div>
        </div>
    );
}
