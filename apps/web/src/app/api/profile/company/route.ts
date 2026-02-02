import { NextResponse } from "next/server";
import { getSessionUser, type CompanyDetails } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";

// Re-export for convenience
export type { CompanyDetails };

// GET - Fetch company details
export async function GET() {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Return company_details from user document, or null if not set
        const companyDetails = (user as any).company_details || null;

        return NextResponse.json({
            company: companyDetails,
        });
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

        // Update user document with company details
        await db.collection("users").updateOne(
            { _id: user._id as any },
            {
                $set: {
                    company_details: companyDetails,
                    updatedAt: new Date(),
                },
            }
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
