/**
 * Invoice Preview — API Route (Upgraded)
 * ────────────────────────────────────────
 * GET  /api/invoice/preview       → renders mock invoice as HTML (Handlebars)
 * POST /api/invoice/preview       → renders custom invoice data as HTML (Handlebars)
 *
 * Uses the new Handlebars template with full GST rendering.
 * Falls back to legacy template on error.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildInvoiceHTMLHandlebars } from "@/lib/invoice/handlebars-template";
import { buildInvoiceHTML } from "@/lib/invoice/template";
import { MOCK_INVOICE } from "@/lib/invoice/mock-data";
import type { InvoicePayload } from "@/lib/invoice/types";

export const dynamic = "force-dynamic";

/** GET — Preview with mock data */
export async function GET() {
    try {
        const html = buildInvoiceHTMLHandlebars(MOCK_INVOICE);
        return new NextResponse(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    } catch (error) {
        console.warn("[invoice/preview] Handlebars failed, using legacy template:", error);
        const html = buildInvoiceHTML(MOCK_INVOICE);
        return new NextResponse(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    }
}

/** POST — Preview with custom data */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const invoiceData = body as InvoicePayload;

        if (!invoiceData.invoiceNumber || !invoiceData.company || !invoiceData.client) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 },
            );
        }

        let html: string;
        try {
            html = buildInvoiceHTMLHandlebars(invoiceData);
        } catch {
            html = buildInvoiceHTML(invoiceData);
        }

        return new NextResponse(html, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Invalid invoice data", details: error.message },
            { status: 400 },
        );
    }
}
