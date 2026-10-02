import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDataOwnerId } from "@/lib/auth-session";
import { getDeliveryChallanService } from "@/modules/delivery-challans";
import { buildDeliveryChallanHTML, type CompanyPDFInfo } from "@/lib/delivery-challans/challan-pdf-template";
import { getDb } from "@/lib/mongodb";
import { NotFoundError } from "@/shared/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_ROLES = ["Owner", "Admin", "Manager", "Accountant"];

async function handleGeneratePDF(id: string, user: any, format?: string | null) {
    const tenantId = getDataOwnerId(user);
    const svc = getDeliveryChallanService();
    const challan = await svc.findById(id, tenantId);

    // Fetch company info
    const db = await getDb();
    const profile = await db.collection("companyprofiles").findOne({
        $or: [
            { organizationId: tenantId },
            { userId: tenantId },
        ],
    });

    const company: CompanyPDFInfo = {
        companyName: profile?.company_name || profile?.trade_name || user.name || "Business Enterprise",
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

    const html = buildDeliveryChallanHTML({ challan, company });

    if (format === "html") {
        return new NextResponse(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    }

    // Try Puppeteer PDF generation
    try {
        const { generatePDFWithRetry } = await import("@/lib/invoice/browser-pool");
        const pdfBytes = await generatePDFWithRetry(html, {
            format: "A4",
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
            waitForFonts: true,
            timeout: 25000,
        });

        const safeNumber = challan.challan_number.replace(/[^a-zA-Z0-9\-_]/g, "_");
        const filename = `Delivery_Challan_${safeNumber}.pdf`;

        return new NextResponse(pdfBytes as unknown as BodyInit, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(pdfBytes.length),
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    } catch (puppeteerError: unknown) {
        console.warn("[delivery-challans/generate-pdf] Puppeteer unavailable, returning HTML fallback:", puppeteerError);
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
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { id } = await params;
        const format = request.nextUrl.searchParams.get("format");
        return await handleGeneratePDF(id, result.user, format);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error generating delivery challan PDF:", error);
        return NextResponse.json({ error: "Failed to generate delivery challan PDF" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const result = await requireRole(ALLOWED_ROLES);
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        const { id } = await params;
        const format = request.nextUrl.searchParams.get("format");
        return await handleGeneratePDF(id, result.user, format);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error("Error generating delivery challan PDF:", error);
        return NextResponse.json({ error: "Failed to generate delivery challan PDF" }, { status: 500 });
    }
}
