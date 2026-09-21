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
        const company: CompanyDetails & { tally_company_name?: string } = {
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
            tally_company_name: profile.tally_company_name || "",
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

        if (user.role !== "Admin") {
            return NextResponse.json(
                { error: "Forbidden: Admin access required" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const db = await getDb();

        // Validate tally_company_name if provided (max 120 chars, empty allowed)
        let trimmedTallyCompanyName: string | undefined = undefined;
        if (body.tally_company_name !== undefined) {
            if (typeof body.tally_company_name !== "string") {
                return NextResponse.json(
                    { error: "Tally company name must be a string" },
                    { status: 400 }
                );
            }
            const trimmed = body.tally_company_name.trim();
            if (trimmed.length > 120) {
                return NextResponse.json(
                    { error: "Tally company name must not exceed 120 characters" },
                    { status: 400 }
                );
            }
            trimmedTallyCompanyName = trimmed;
        }

        // Validate companyName: required unless this is a Tally-only update
        if (body.companyName !== undefined) {
            if (typeof body.companyName !== "string" || body.companyName.trim() === "") {
                return NextResponse.json(
                    { error: "Company name is required" },
                    { status: 400 }
                );
            }
        } else if (trimmedTallyCompanyName === undefined) {
            return NextResponse.json(
                { error: "Company name is required" },
                { status: 400 }
            );
        }

        const orgId = (user as any).organizationId || String(user._id);
        const existingProfile = await db.collection("companyprofiles").findOne({ organizationId: orgId });

        const isTallyOnly = trimmedTallyCompanyName !== undefined && body.companyName === undefined;

        // Build company details object with sanitization (preserve existing fields if omitted in Tally-only update)
        const companyDetails: CompanyDetails & { tally_company_name?: string } = {
            companyName: body.companyName !== undefined
                ? body.companyName.trim()
                : (existingProfile?.company_name || existingProfile?.trade_name || "My Company"),
            address: body.address !== undefined
                ? (body.address?.trim() || "")
                : (isTallyOnly ? [existingProfile?.reg_city, existingProfile?.reg_state].filter(Boolean).join(", ") : ""),
            phone: body.phone !== undefined
                ? (body.phone?.trim() || "")
                : (isTallyOnly ? (existingProfile?.primary_phone || "") : ""),
            email: body.email !== undefined
                ? (body.email?.trim() || "")
                : (isTallyOnly ? (existingProfile?.email || "") : ""),
            logoUrl: body.logoUrl !== undefined
                ? body.logoUrl
                : (existingProfile?.logoUrl || existingProfile?.logo_url || ""),
            gstin: body.gstin !== undefined
                ? (body.gstin?.trim() || "").toUpperCase()
                : (existingProfile?.gst_number || ""),
            pan: body.pan !== undefined
                ? (body.pan?.trim() || "").toUpperCase()
                : (existingProfile?.pan_number || existingProfile?.pan || ""),
            bankName: body.bankName !== undefined
                ? (body.bankName?.trim() || "")
                : (isTallyOnly ? (existingProfile?.bankName || existingProfile?.bank_name || "") : ""),
            accountNo: body.accountNo !== undefined
                ? (body.accountNo?.trim() || "")
                : (isTallyOnly ? (existingProfile?.accountNo || existingProfile?.account_no || "") : ""),
            ifsc: body.ifsc !== undefined
                ? (body.ifsc?.trim() || "").toUpperCase()
                : (isTallyOnly ? (existingProfile?.ifsc || "") : ""),
            upiId: body.upiId !== undefined
                ? (body.upiId?.trim() || "")
                : (isTallyOnly ? (existingProfile?.upiId || existingProfile?.upi_id || "") : ""),
            tally_company_name: trimmedTallyCompanyName !== undefined
                ? trimmedTallyCompanyName
                : (existingProfile?.tally_company_name || ""),
        };

        const now = new Date();

        if (isTallyOnly) {
            // Tally-only PUT: update ONLY tally_company_name and updatedAt in companyprofiles; do not touch other fields or users
            await db.collection("companyprofiles").updateOne(
                { organizationId: orgId },
                {
                    $set: {
                        tally_company_name: trimmedTallyCompanyName!,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        createdAt: now,
                        company_name: companyDetails.companyName,
                        trade_name: companyDetails.companyName,
                    },
                },
                { upsert: true }
            );
        } else {
            // Standard full update
            const addressParts = companyDetails.address.split(",").map(s => s.trim());
            const profileSet: Record<string, any> = {
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
            };
            if (trimmedTallyCompanyName !== undefined) {
                profileSet.tally_company_name = trimmedTallyCompanyName;
            }

            await db.collection("companyprofiles").updateOne(
                { organizationId: orgId },
                { $set: profileSet },
                { upsert: true }
            );

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
        }

        return NextResponse.json({
            success: true,
            company: companyDetails,
        });
    } catch (error: any) {
        console.error("Error updating company details:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
