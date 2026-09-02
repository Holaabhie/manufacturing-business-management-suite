import { NextResponse } from "next/server";
import { getSessionUser, type CompanyDetails } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

// Re-export for convenience
export type { CompanyDetails };

// GET - Fetch company details from companyprofiles collection
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();

        // Resolve organizationId — same logic as /api/setup
        const orgId = (user as any).organizationId || String(user._id);

        // Query companyprofiles (the canonical source, written by /api/setup)
        const profile = await db.collection("companyprofiles").findOne({ organizationId: orgId });

        if (!profile) {
            // User hasn't completed /setup yet — valid state
            return NextResponse.json({ company: null });
        }

        // Map companyprofiles snake_case fields → CompanyProfile camelCase fields
        // expected by useCompanyProfile hook consumers
        const company: CompanyDetails = {
            companyName: profile.company_name || profile.trade_name || "",
            address: [profile.reg_city, profile.reg_state].filter(Boolean).join(", "),
            phone: profile.primary_phone || "",
            email: profile.email || "",
            logoUrl: profile.logoUrl || profile.logo_url || "",
            gstin: profile.gst_number || "",
            pan: profile.pan || "",
            bankName: profile.bankName || profile.bank_name || "",
            accountNo: profile.accountNo || profile.account_no || "",
            ifsc: profile.ifsc || "",
            upiId: profile.upiId || profile.upi_id || "",
        };

        return NextResponse.json({ company });
    } catch (error: any) {
        console.error("Error fetching company details:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update company details
export async function PUT(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const db = await getDb();

        // Validate required fields
        if (!body.companyName || body.companyName.trim() === "") {
            return NextResponse.json(
                { error: "Company name is required" },
                { status: 400 }
            );
        }

        // Build company details object with sanitization
        const companyDetails: CompanyDetails = {
            companyName: body.companyName?.trim() || "",
            address: body.address?.trim() || "",
            phone: body.phone?.trim() || "",
            email: body.email?.trim() || "",
            logoUrl: body.logoUrl || "",
            gstin: body.gstin?.trim().toUpperCase() || "",
            pan: body.pan?.trim().toUpperCase() || "",
            bankName: body.bankName?.trim() || "",
            accountNo: body.accountNo?.trim() || "",
            ifsc: body.ifsc?.trim().toUpperCase() || "",
            upiId: body.upiId?.trim() || "",
        };

        const now = new Date();
        const orgId = (user as any).organizationId || String(user._id);

        // Update users collection (legacy field for backward compatibility)
        await db.collection("users").updateOne(
            { _id: user._id as any },
            {
                $set: {
                    company_details: companyDetails,
                    updatedAt: now,
                },
            }
        );

        // Also update companyprofiles (canonical source)
        // Parse address back into city/state for companyprofiles format
        const addressParts = companyDetails.address.split(",").map(s => s.trim());
        await db.collection("companyprofiles").updateOne(
            { organizationId: orgId },
            {
                $set: {
                    company_name: companyDetails.companyName,
                    trade_name: companyDetails.companyName,
                    primary_phone: companyDetails.phone,
                    email: companyDetails.email,
                    logoUrl: companyDetails.logoUrl,
                    gst_number: companyDetails.gstin,
                    pan: companyDetails.pan,
                    bankName: companyDetails.bankName,
                    accountNo: companyDetails.accountNo,
                    ifsc: companyDetails.ifsc,
                    upiId: companyDetails.upiId,
                    reg_city: addressParts[0] || "",
                    reg_state: addressParts[1] || "",
                    updatedAt: now,
                },
            },
            { upsert: true }
        );

        return NextResponse.json({
            success: true,
            company: companyDetails,
        });
    } catch (error: any) {
        console.error("Error updating company details:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
