import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId, type SessionUser } from "@/lib/auth-session";
import { getQuoteService } from "@/modules/quotes";
import { buildQuotationHTMLHandlebars, type CompanyPDFInfo } from "@/lib/quote/quote-pdf-template";
import { getDb } from "@/lib/mongodb";
import { NotFoundError } from "@/shared/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

async function handleGeneratePDF(id: string, user: SessionUser) {
    const tenantId = getDataOwnerId(user);
    const svc = getQuoteService();
    const quote = await svc.findById(id, tenantId);

    // Fetch company info
    const db = await getDb();
    const profile = await db.collection("companyprofiles").findOne({
        $or: [
            { organizationId: tenantId },
            { userId: tenantId },
        ],
    });

    const company: CompanyPDFInfo = {
        companyName: profile?.company_name || profile?.trade_name || user.fullName || "Business Enterprise",
        address: [
            profile?.reg_address_line_1,
            profile?.reg_city,
            profile?.reg_state,
            profile?.reg_pincode,
        ].filter(Boolean).join(", ") || "Main Industrial Area",
        phone: profile?.primary_phone || user.phone || "",
        email: profile?.primary_email || user.email || "",
        gstin: profile?.gst_number || "",
        pan: profile?.pan_number || "",
        logoUrl: profile?.logo_url || "",
    };

    const html = buildQuotationHTMLHandlebars({ quotation: quote, company });

    // Try Puppeteer PDF generation
    try {
        const { generatePDFWithRetry } = await import("@/lib/invoice/browser-pool");
        const pdfBytes = await generatePDFWithRetry(html, {
            format: "A4",
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
            waitForFonts: true,
            timeout: 25000,
        });

        const safeNumber = quote.quotation_number.replace(/[^a-zA-Z0-9\-_]/g, "_");
        const filename = `Quotation_${safeNumber}.pdf`;

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(pdfBytes.length),
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (puppeteerError: unknown) {
        console.warn("[quotes/generate-pdf] Puppeteer unavailable, returning HTML fallback:", puppeteerError);
        return new NextResponse(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "X-Fallback": "html",
            },
        });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const { id } = await params;
        return await handleGeneratePDF(id, result.user);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error generating quote PDF:", error);
        return NextResponse.json({ error: "Failed to generate quotation PDF" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error || !result.user) {
            return NextResponse.json({ error: result.error || "Unauthorized" }, { status: result.status });
        }
        const { id } = await params;
        return await handleGeneratePDF(id, result.user);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error generating quote PDF:", error);
        return NextResponse.json({ error: "Failed to generate quotation PDF" }, { status: 500 });
    }
}
