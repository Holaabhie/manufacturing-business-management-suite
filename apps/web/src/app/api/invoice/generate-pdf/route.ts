/**
 * Invoice PDF Generation — API Route (Upgraded)
 * ───────────────────────────────────────────────
 * POST /api/invoice/generate-pdf
 *
 * Uses Puppeteer browser pool + Handlebars template to render
 * GST-compliant A4 PDFs. Falls back to HTML response if
 * Puppeteer is unavailable.
 *
 * Request body: InvoicePayload (JSON)
 * Response: application/pdf (binary) or HTML fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { buildInvoiceHTMLHandlebars } from "@/lib/invoice/handlebars-template";
import { buildInvoiceHTML } from "@/lib/invoice/template";
import type { InvoicePayload } from "@/lib/invoice/types";
import { validateGSTIN } from "@/lib/invoice/sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── Error Response Helper ────────────────────────────────────

interface PDFErrorResponse {
    success: false;
    code: string;
    message: string;
    invoiceNumber?: string;
}

function errorResponse(code: string, message: string, invoiceNumber?: string, status = 500) {
    const body: PDFErrorResponse = { success: false, code, message, invoiceNumber };
    return NextResponse.json(body, { status });
}

// ─── POST Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
    let invoiceNumber = "";

    try {
        const body = await request.json();
        const invoiceData = body as InvoicePayload;
        invoiceNumber = invoiceData.invoiceNumber || "";

        // ── Validate required fields ──────────────────────────
        if (!invoiceData.invoiceNumber || !invoiceData.company || !invoiceData.client || !invoiceData.items?.length) {
            return errorResponse(
                "VALIDATION_FAILED",
                "Missing required invoice fields: invoiceNumber, company, client, items",
                invoiceNumber,
                400,
            );
        }

        // ── GSTIN format validation (warn, don't block) ──────
        if (invoiceData.company.gstin && !validateGSTIN(invoiceData.company.gstin)) {
            console.warn(`[invoice/generate-pdf] Invalid seller GSTIN format: ${invoiceData.company.gstin}`);
        }
        if (invoiceData.client.gstin && !validateGSTIN(invoiceData.client.gstin)) {
            console.warn(`[invoice/generate-pdf] Invalid buyer GSTIN format: ${invoiceData.client.gstin}`);
        }

        // ── Size warning for large invoices ───────────────────
        if (invoiceData.items.length > 50) {
            console.warn(`[invoice/generate-pdf] Large invoice: ${invoiceData.items.length} line items — may take longer`);
        }

        // ── Generate HTML using Handlebars template ───────────
        let html: string;
        try {
            html = buildInvoiceHTMLHandlebars(invoiceData);
        } catch (templateError) {
            console.warn("[invoice/generate-pdf] Handlebars template failed, falling back to legacy:", templateError);
            html = buildInvoiceHTML(invoiceData);
        }

        // ── Generate PDF with browser pool ────────────────────
        let pdfBytes: Uint8Array;

        try {
            const { generatePDFWithRetry } = await import("@/lib/invoice/browser-pool");
            pdfBytes = await generatePDFWithRetry(html, {
                format: "A4",
                margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
                waitForFonts: true,
                timeout: 25000,
            });
        } catch (puppeteerError: unknown) {
            const errMsg = puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError);
            console.warn("[invoice/generate-pdf] Puppeteer unavailable, returning HTML:", errMsg);

            // Return HTML as fallback (client can use window.print())
            return new NextResponse(html, {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "X-Fallback": "html",
                },
            });
        }

        // ── Build filename ────────────────────────────────────
        const safeNumber = invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9\-_]/g, "_");
        const filename = `Invoice_${safeNumber}.pdf`;

        return new NextResponse(pdfBytes, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(pdfBytes.length),
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[invoice/generate-pdf] Error:", error);
        return errorResponse("PDF_GENERATION_FAILED", errMsg, invoiceNumber);
    }
}
